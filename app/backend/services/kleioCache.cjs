"use strict";

const fs = require("fs");
const path = require("path");

// === Paths ===
const CACHE_PATH = path.join(__dirname, "..", "data", "kleio_cache.csv");
const CRABBY_PATH = path.join(__dirname, "..", "data", "kleio_crabby.csv");

// === CSV headers ===
const CACHE_HEADER = [
  "key",
  "provider",
  "type",
  "title",
  "url",
  "tv",
  "ka",
  "description",
  "fullText",
  "imageUrl",
].join(",");

const CRABBY_HEADER = ["ts", "reason", "tv", "ka", "url"].join(",");

// === In-memory state ===
let loaded = false;
let cacheRecords = []; // array of { key, provider, type, title, url, tv, ka, description, fullText, imageUrl }
let cacheKeySet = new Set(); // set of normalized keys: kleio|<normalizedUrl>

// -------------------- helpers --------------------
function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function s(x) {
  return typeof x === "string" ? x : (x == null ? "" : String(x));
}

// Minimal, safe URL normalization (stable keys)
function normalizeUrl(u) {
  const raw = s(u).trim();
  if (!raw) return "";
  try {
    const U = new URL(raw);
    U.hash = "";
    // normalize host lowercase
    U.hostname = U.hostname.toLowerCase();

    // drop trailing slash (except root)
    if (U.pathname.length > 1 && U.pathname.endsWith("/")) {
      U.pathname = U.pathname.slice(0, -1);
    }
    return U.toString();
  } catch (e) {
    // fallback: trim + drop trailing slash
    let t = raw;
    if (t.length > 1 && t.endsWith("/")) t = t.slice(0, -1);
    return t;
  }
}

function keyOfKleio(item) {
  if (!isObj(item)) return "";
  const url = item.url || item.link || "";
  const nu = normalizeUrl(url);
  if (!nu) return "";
  return "kleio|" + nu;
}

function escapeCsvCell(v) {
  const t = s(v);
  const needs = /[",\r\n]/.test(t);
  const out = t.replace(/"/g, '""');
  return needs ? `"${out}"` : `"${out}"`; // altijd quotes: simpeler + consistent
}

// Robust CSV line parser: handles quotes + commas + newlines already split into lines (so line-level)
function parseCsvLine(line) {
  const res = [];
  let i = 0;
  let cur = "";
  let inQ = false;

  while (i < line.length) {
    const ch = line[i];

    if (inQ) {
      if (ch === '"') {
        // escaped quote?
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQ = true;
      i += 1;
      continue;
    }

    if (ch === ",") {
      res.push(cur);
      cur = "";
      i += 1;
      continue;
    }

    cur += ch;
    i += 1;
  }
  res.push(cur);
  return res;
}

function ensureFileWithHeader(filePath, headerLine) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, headerLine + "\n", "utf8");
    return;
  }
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    fs.writeFileSync(filePath, headerLine + "\n", "utf8");
  }
}

function readLinesSafe(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const txt = fs.readFileSync(filePath, "utf8");
  // keep empty last line harmless
  return txt.split(/\r?\n/);
}

// Key is FIRST CSV cell (quoted) → super-stable even if later cells contain commas.
function extractKeyFromLine(line) {
  // line starts with "key",... or "kleio|https://..",...
  const m = line.match(/^"([^"]+)"/);
  return m ? m[1] : "";
}

function ensureLoaded() {
  if (loaded) return;

  ensureFileWithHeader(CACHE_PATH, CACHE_HEADER);
  ensureFileWithHeader(CRABBY_PATH, CRABBY_HEADER);

  cacheRecords = [];
  cacheKeySet = new Set();

  const lines = readLinesSafe(CACHE_PATH);
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line) continue;
    if (idx === 0 && line.startsWith("key,")) continue; // header safety (if ever unquoted)
    if (line === CACHE_HEADER) continue; // header

    const keyRaw = extractKeyFromLine(line);
    if (!keyRaw) continue;

    // normalize kleio keys so lookup/upsert share exact logic
    let keyNorm = keyRaw;
    if (keyRaw.startsWith("kleio|")) {
      keyNorm = "kleio|" + normalizeUrl(keyRaw.slice("kleio|".length));
    }

    cacheKeySet.add(keyNorm);

    // parse full record (best effort)
    const cols = parseCsvLine(line);
    // We always write 10 cols in this file, but be defensive
    const rec = {
      key: cols[0] || keyRaw,
      provider: cols[1] || "Kleio",
      type: cols[2] || "TEXT",
      title: cols[3] || "",
      url: cols[4] || "",
      tv: cols[5] || "",
      ka: cols[6] || "",
      description: cols[7] || "",
      fullText: cols[8] || "",
      imageUrl: cols[9] || "",
    };
    cacheRecords.push(rec);
  }

  loaded = true;
}

// -------------------- crabby logging --------------------
function crabbyLog(reason, tv, ka, url) {
  try {
    ensureLoaded();
    const ts = new Date().toISOString();
    const row = [
      escapeCsvCell(ts),
      escapeCsvCell(reason || ""),
      escapeCsvCell(tv || ""),
      escapeCsvCell(ka || ""),
      escapeCsvCell(url || ""),
    ].join(",");
    fs.appendFileSync(CRABBY_PATH, row + "\n", "utf8");
  } catch (e) {
    // crabby mag nooit de zoekroute slopen
  }
}

// -------------------- public API --------------------

// Upsert many Kleio sources into cache (append-only)
function cacheUpsertMany(items) {
  ensureLoaded();

  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) return { added: 0, total: cacheRecords.length };

  ensureFileWithHeader(CACHE_PATH, CACHE_HEADER);

  let added = 0;

  for (const it of arr) {
    if (!isObj(it)) continue;
    const provider = s(it.provider || "").toLowerCase();
    if (provider !== "kleio") continue;

    const key = keyOfKleio(it);
    if (!key) continue;

    // normalize key for set compare
    const keyNorm = "kleio|" + normalizeUrl(key.slice("kleio|".length));
    if (cacheKeySet.has(keyNorm)) continue;

    const rec = {
      key: keyNorm,
      provider: "Kleio",
      type: it.type || "TEXT",
      title: s(it.title),
      url: normalizeUrl(it.url || it.link || ""),
      tv: s(it.tv || ""),
      ka: s(it.ka || ""),
      description: s(it.description),
      fullText: s(it.fullText),
      imageUrl: s(it.imageUrl),
    };

    const row = [
      escapeCsvCell(rec.key),
      escapeCsvCell(rec.provider),
      escapeCsvCell(rec.type),
      escapeCsvCell(rec.title),
      escapeCsvCell(rec.url),
      escapeCsvCell(rec.tv),
      escapeCsvCell(rec.ka),
      escapeCsvCell(rec.description),
      escapeCsvCell(rec.fullText),
      escapeCsvCell(rec.imageUrl),
    ].join(",");

    try {
      fs.appendFileSync(CACHE_PATH, row + "\n", "utf8");
      cacheKeySet.add(keyNorm);
      cacheRecords.push(rec);
      added += 1;
    } catch (e) {
      crabbyLog("cache_append_failed:" + (e && e.message ? e.message : "unknown"), rec.tv, rec.ka, rec.url);
    }
  }

  return { added, total: cacheRecords.length };
}

// Simple cache search used by A12 (returns Kleio items matching tv/ka and any term)
function cacheSearchKleio({ termsArray, filters, limit }) {
  ensureLoaded();

  const terms = Array.isArray(termsArray) ? termsArray.map(s).filter(Boolean) : [];
  const tv = s(filters && (filters.tv || "")).trim();
  const ka = s(filters && (filters.ka || "")).trim();
  const lim = Number.isFinite(limit) ? Math.max(0, limit) : 20;

  if (!lim) return [];

  // basic score: count term hits in title+desc+fullText
  const q = terms
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const out = [];
  for (const r of cacheRecords) {
    // only Kleio
    if (s(r.provider).toLowerCase() !== "kleio") continue;
    if (tv && s(r.tv) !== tv) continue;
    if (ka && s(r.ka) !== ka) continue;

    if (!q.length) {
      out.push(r);
      continue;
    }

    const hay = (s(r.title) + " " + s(r.description) + " " + s(r.fullText)).toLowerCase();
    let score = 0;
    for (const w of q) {
      if (w.length < 3) continue;
      if (hay.includes(w)) score += 1;
    }
    if (score > 0) out.push({ ...r, _score: score });
  }

  out.sort((a, b) => (b._score || 0) - (a._score || 0));
  const sliced = out.slice(0, lim).map(({ _score, ...rest }) => rest);

  // map to A12 “source” shape
  return sliced.map((r) => ({
    id: "kleio-" + encodeURIComponent(r.url),
    provider: "Kleio",
    type: r.type || "TEXT",
    title: r.title,
    description: r.description,
    fullText: r.fullText,
    url: r.url,
    link: r.url,
    imageUrl: r.imageUrl,
    tv: r.tv,
    tvLabel: r.tv ? "Tijdvak " + r.tv : "",
    ka: r.ka,
  }));
}

module.exports = {
  CACHE_PATH,
  CRABBY_PATH,
  CACHE_HEADER,
  CRABBY_HEADER,
  normalizeUrl,
  keyOfKleio,
  cacheUpsertMany,
  cacheSearchKleio,
  crabbyLog,
};


"use strict";

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "..", "data", "kleio_cache.csv");

// We houden het tolerant: oude CSV’s zonder description/fullText blijven werken.
const FIELDNAMES = [
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
];

function squashWs(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function norm(s) {
  return squashWs(s).toLowerCase();
}

function isHttpUrl(u) {
  return /^https?:\/\//i.test(String(u || ""));
}

function keyForRow(r) {
  const url = squashWs(r.url);
  const title = squashWs(r.title);
  if (url) return "u:" + norm(url);
  if (title) return "t:" + norm(title);
  return "";
}

function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const idx = {};
  for (let i = 0; i < header.length; i++) idx[header[i]] = i;

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const r = {};
    for (const fn of FIELDNAMES) {
      const j = idx[fn];
      r[fn] = j === undefined ? "" : (cols[j] ?? "");
    }
    rows.push(r);
  }
  return rows;
}

// simpele CSV-splitter met quotes support
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x);
}

function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = FIELDNAMES.join(",");
  const body = rows
    .map((r) => FIELDNAMES.map((fn) => esc(r[fn] ?? "")).join(","))
    .join("\n");

  return header + "\n" + body + "\n";
}

let loaded = false;
let rows = [];
let byKey = new Map();

function loadOnce() {
  if (loaded) return;
  loaded = true;

  try {
    if (!fs.existsSync(CSV_PATH)) {
      rows = [];
      byKey = new Map();
      return;
    }
    const txt = fs.readFileSync(CSV_PATH, "utf-8");
    const parsed = parseCsv(txt);

    const map = new Map();
    const out = [];
    for (const r of parsed) {
      const k = squashWs(r.key) || keyForRow(r);
      if (!k) continue;
      r.key = k;
      if (map.has(k)) continue;
      map.set(k, r);
      out.push(r);
    }

    rows = out;
    byKey = map;
  } catch {
    rows = [];
    byKey = new Map();
  }
}

// Match-strategie: term komt voor in title (later uitbreiden met namen/plaatsen).
function matchRow(r, terms) {
  const t = norm(r.title);
  if (!t) return false;
  for (const term of terms) {
    const n = norm(term);
    if (!n) continue;
    if (t.includes(n)) return true;
  }
  return false;
}

function asKleioSource(r, tvFallback, kaFallback) {
  const url = squashWs(r.url);
  if (!url) return null;

  return {
    id: `kleio-${encodeURIComponent(url)}`,
    provider: "Kleio",
    title: squashWs(r.title),
    description: squashWs(r.description) || squashWs(r.fullText).substring(0, 900) || "...",
    fullText: squashWs(r.fullText) || squashWs(r.description) || "...",
    url,
    link: url,
    imageUrl: squashWs(r.imageUrl) || null,
    type: squashWs(r.type) || "TEXT",
    tv: squashWs(r.tv) || (tvFallback ? String(tvFallback) : ""),
    ka: squashWs(r.ka) || (kaFallback ? String(kaFallback) : ""),
  };
}

function searchLocal({ terms = [], tv = null, ka = null, limit = 40 }) {
  loadOnce();
  const cleanTerms = Array.isArray(terms) ? terms.map(squashWs).filter(Boolean) : [];
  if (!cleanTerms.length) return [];

  const hits = [];
  for (const r of rows) {
    if (!matchRow(r, cleanTerms)) continue;
    const s = asKleioSource(r, tv, ka);
    if (!s) continue;
    hits.push(s);
    if (hits.length >= limit) break;
  }
  return hits;
}

function upsertMany(sources, { tv = null, ka = null } = {}) {
  loadOnce();
  const arr = Array.isArray(sources) ? sources : [];
  let added = 0;

  for (const s of arr) {
    const url = squashWs(s.url || s.link);
    const title = squashWs(s.title);
    if (!url || !isHttpUrl(url) || !title) continue;

    const k = "u:" + norm(url);
    if (byKey.has(k)) continue;

    const r = {
      key: k,
      provider: "Kleio",
      type: squashWs(s.type) || "TEXT",
      title,
      url,
      tv: squashWs(s.tv) || (tv ? String(tv) : ""),
      ka: squashWs(s.ka) || (ka ? String(ka) : ""),
      description: squashWs(s.description) || "",
      fullText: squashWs(s.fullText) || "",
      imageUrl: squashWs(s.imageUrl) || "",
    };

    byKey.set(k, r);
    rows.push(r);
    added++;
  }

  if (added > 0) {
    try {
      fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
      fs.writeFileSync(CSV_PATH, toCsv(rows), "utf-8");
    } catch {
      // stil falen: dan werkt runtime nog steeds, alleen geen persist
    }
  }

  return { added, total: rows.length, path: CSV_PATH };
}

module.exports = { searchLocal, upsertMany, _path: CSV_PATH };


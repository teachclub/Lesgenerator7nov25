"use strict";

const { Storage } = require("@google-cloud/storage");
const crypto = require("crypto");

const BUCKET = process.env.KLEIO_CACHE_BUCKET || "";
const OBJECT = process.env.KLEIO_CACHE_OBJECT || "kleio/kleio_cache.csv";

const MEM_TTL_MS = 5 * 60 * 1000;
let mem = { ts: 0, rows: [] };

function now() {
  return Date.now();
}

function squashWs(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function norm(s) {
  return squashWs(s).toLowerCase();
}

function canonicalUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  try {
    const url = new URL(s);
    url.hash = "";
    url.search = "";
    // normalize host + remove trailing slash
    const out = url.toString().replace(/\/$/, "");
    return out;
  } catch {
    return s.replace(/[#?].*$/, "").replace(/\/$/, "");
  }
}

function keyFor(provider, url) {
  const p = norm(provider);
  const u = canonicalUrl(url);
  if (!p || !u) return "";
  const h = crypto.createHash("sha1").update(`${p}|${u}`).digest("hex");
  return h;
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  const fieldnames = ["key", "provider", "type", "title", "url", "tv", "ka"];
  const lines = [];
  lines.push(fieldnames.join(","));
  for (const r of rows) {
    lines.push(fieldnames.map((fn) => csvEscape(r[fn] || "")).join(","));
  }
  return lines.join("\n") + "\n";
}

function parseCsv(text) {
  const s = String(text || "");
  if (!s.trim()) return [];
  const lines = s.split(/\r?\n/).filter((x) => x.length > 0);
  if (lines.length <= 1) return [];

  // simpele CSV parser (genoeg voor onze eigen output)
  const header = lines[0].split(",").map((x) => x.trim());
  const out = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const vals = [];
    let cur = "";
    let inQ = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (inQ) {
        if (ch === '"') {
          if (line[j + 1] === '"') {
            cur += '"';
            j++;
          } else {
            inQ = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ",") {
          vals.push(cur);
          cur = "";
        } else cur += ch;
      }
    }
    vals.push(cur);

    const row = {};
    for (let k = 0; k < header.length; k++) row[header[k]] = vals[k] ?? "";
    if (row.url) row.url = canonicalUrl(row.url);
    if (row.provider) row.provider = squashWs(row.provider);
    if (row.title) row.title = squashWs(row.title);
    out.push(row);
  }
  return out;
}

function requireBucket() {
  if (!BUCKET) {
    throw new Error("[KleioCache] Zet KLEIO_CACHE_BUCKET in backend/.env (Cloud Storage bucketnaam).");
  }
}

async function loadAllRows() {
  const t = now();
  if (mem.rows.length && t - mem.ts < MEM_TTL_MS) return mem.rows;

  requireBucket();

  const storage = new Storage();
  const file = storage.bucket(BUCKET).file(OBJECT);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      mem = { ts: t, rows: [] };
      return [];
    }
    const [buf] = await file.download();
    const rows = parseCsv(buf.toString("utf-8"));
    mem = { ts: t, rows };
    return rows;
  } catch (e) {
    // fail-open: geen cache is “ok”
    console.error("[KleioCache] load error:", e && (e.stack || e.message || e));
    mem = { ts: t, rows: [] };
    return [];
  }
}

async function saveAllRows(rows) {
  requireBucket();

  const storage = new Storage();
  const file = storage.bucket(BUCKET).file(OBJECT);

  const csv = toCsv(rows);
  await file.save(csv, { contentType: "text/csv; charset=utf-8" });
  mem = { ts: now(), rows };
}

function matchAnyTerm(title, terms) {
  const h = norm(title);
  if (!h) return false;
  for (const t of terms) {
    const n = norm(t);
    if (n && h.includes(n)) return true;
  }
  return false;
}

async function queryFromCache({ terms = [], tv = null, ka = "" } = {}) {
  const rows = await loadAllRows();
  const kaN = norm(ka);
  const tvS = tv ? String(tv) : "";

  let out = rows;

  if (tvS) out = out.filter((r) => String(r.tv || "") === tvS);
  if (kaN) out = out.filter((r) => norm(r.ka || "") === kaN || norm(r.ka || "").startsWith(kaN));

  if (Array.isArray(terms) && terms.length) {
    out = out.filter((r) => matchAnyTerm(r.title, terms));
  }

  // terug naar “Lessie source”-shape (minimaal)
  return out.map((r) => ({
    id: r.key ? `kleio-${r.key}` : `kleio-${encodeURIComponent(r.url || "")}`,
    provider: r.provider || "Kleio",
    type: r.type || "TEXT",
    title: r.title || "",
    url: r.url || "",
    link: r.url || "",
    tv: r.tv || undefined,
    tvLabel: r.tv ? `Tijdvak ${r.tv}` : undefined,
    ka: r.ka || undefined,
  }));
}

async function upsertIntoCache({ sources = [], tv = null, ka = "" } = {}) {
  const rows = await loadAllRows();
  const byKey = new Map();

  for (const r of rows) {
    const k = String(r.key || "").trim();
    if (k) byKey.set(k, r);
  }

  const tvS = tv ? String(tv) : "";
  const kaS = String(ka || "").trim();

  let added = 0;

  for (const s of Array.isArray(sources) ? sources : []) {
    const provider = squashWs(s.provider || "Kleio");
    const url = canonicalUrl(s.url || s.link || "");
    const title = squashWs(s.title || "");
    const type = squashWs(s.type || "TEXT") || "TEXT";
    if (!url || !title) continue;

    const k = keyFor(provider, url);
    if (!k) continue;

    if (byKey.has(k)) continue;

    const row = {
      key: k,
      provider,
      type,
      title,
      url,
      tv: tvS,
      ka: kaS,
    };

    byKey.set(k, row);
    added++;
  }

  if (added > 0) {
    const all = [...byKey.values()];
    await saveAllRows(all);
  }

  return { added, total: byKey.size };
}

module.exports = {
  queryFromCache,
  upsertIntoCache,
  canonicalUrl,
  keyFor,
};


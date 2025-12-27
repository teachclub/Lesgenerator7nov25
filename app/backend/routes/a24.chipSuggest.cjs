"use strict";

const express = require("express");
const { Pool } = require("pg");

const STOP = new Set([
  "de","het","een","en","of","maar","dus","dat","dit","die","deze","daar","hier",
  "wat","wie","waar","wanneer","waarom","hoe","welke","welk",
  "is","zijn","was","waren","wordt","werden","worden","heb","heeft","hebben","had",
  "met","zonder","voor","van","in","op","aan","bij","naar","door","tot","als",
  "ook","nog","al","dan","om","te","er","ze","we","je","jij","u","ik","wij","jullie",
  "mensen","man","vrouw","land","landen","tijd","jaar","jaren"
]);

function uniq(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr || []) {
    const k = String(x || "").trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out;
}

function extractSeeds(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return [];

  const raw = s
    .split(/[^0-9A-Za-zÀ-ÿ\-]+/g)
    .map(w => w.trim())
    .filter(Boolean);

  const filtered = raw.filter(w => {
    const lw = w.toLowerCase();
    if (lw.length < 3) return false;
    if (STOP.has(lw)) return false;
    if (/^\d+$/.test(lw)) return false;
    return true;
  });

  const scored = filtered.map(w => {
    let score = 0;
    if (/^[A-ZÀ-Ý]/.test(w)) score += 3;
    if (w.length >= 7) score += 2;
    if (/[0-9]/.test(w)) score += 1;
    if (w.includes("-")) score += 1;
    return { w, score };
  });

  scored.sort((a, b) => b.score - a.score || a.w.localeCompare(b.w));
  return uniq(scored.map(x => x.w)).slice(0, 12);
}

let pool = null;
function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url });
  return pool;
}

async function pgExpand(seeds, limit) {
  const enabled = String(process.env.CHIPS_PG_ENABLED || "").trim() === "1";
  if (!enabled) return [];
  const p = getPool();
  if (!p) return [];

  const table = String(process.env.CHIPS_TABLE || "chips").trim();
  const col = String(process.env.CHIPS_COL || "term").trim();

  const out = [];
  for (const seed of seeds) {
    try {
      const q = `SELECT ${col} AS term
                 FROM ${table}
                 WHERE ${col} ILIKE $1
                 ORDER BY LENGTH(${col}) ASC
                 LIMIT $2`;
      const r = await p.query(q, [`%${seed}%`, Math.max(1, Math.min(20, limit))]);
      for (const row of r.rows || []) out.push(row.term);
      if (out.length >= limit) break;
    } catch (e) {
      return [];
    }
  }
  return uniq(out).slice(0, limit);
}

module.exports = function chipSuggestRouterFactory() {
  const router = express.Router();

  router.post("/chips-suggest", async (req, res) => {
    try {
      const body = req.body || {};
      const text = body.text || body.hoofdvraag || "";
      const existing = Array.isArray(body.existing) ? body.existing : [];
      const limit = Number.isFinite(Number(body.limit)) ? Number(body.limit) : 12;

      const seeds = extractSeeds(text);
      const expanded = await pgExpand(seeds, limit);

      const chips = uniq([...expanded, ...seeds]).filter(c => {
        const key = String(c).toLowerCase();
        return !existing.some(e => String(e).toLowerCase() === key);
      }).slice(0, limit);

      res.json({ ok: true, chips, meta: { seeds, expanded: expanded.length } });
    } catch (e) {
      res.status(200).json({ ok: true, chips: [], meta: { error: e?.message ? String(e.message) : "onbekend" } });
    }
  });

  return router;
};


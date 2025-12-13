"use strict";

const express = require("express");
const router = express.Router();

let kaTrefwoorden = {};
try {
  kaTrefwoorden = require("../data/ka-trefwoorden.cjs");
} catch (e) {
  console.error("[a13.searchPreset] ka-trefwoorden niet geladen:", e.message);
  kaTrefwoorden = {};
}

const DEFAULT_PRESETS = [
  { id: "all", label: "Vrij zoeken (geen KA-filter)", terms: [] },
];

function shuffle(arr) {
  const a = Array.isArray(arr) ? [...arr] : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUnique(arr, count) {
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) continue;
    if (seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= count) break;
  }
  return out;
}

function looksLikeName(term) {
  if (typeof term !== "string") return false;
  const t = term.trim();
  if (!t) return false;
  return /[A-ZÀ-ÖØ-Þ]/.test(t);
}

function smartRandomTerms(allTerms, count = 6) {
  const list = Array.isArray(allTerms) ? allTerms.map((t) => String(t).trim()).filter(Boolean) : [];
  if (!list.length) return [];

  const names = [];
  const keywords = [];

  for (const t of list) {
    if (looksLikeName(t)) names.push(t);
    else keywords.push(t);
  }

  const kwShuf = shuffle(keywords);
  const nmShuf = shuffle(names);

  const wantName = nmShuf.length ? 1 : 0;
  const wantKw = Math.max(0, count - wantName);

  let picked = [
    ...pickUnique(kwShuf, wantKw),
    ...pickUnique(nmShuf, wantName),
  ];

  if (picked.length < count) {
    const rest = shuffle(list.filter((t) => !picked.some((p) => p.toLowerCase() === t.toLowerCase())));
    picked = [...picked, ...pickUnique(rest, count - picked.length)];
  }

  return picked.slice(0, count);
}

function parseKaFromBody(body) {
  const kaRaw = body?.ka ?? null;
  if (kaRaw != null && String(kaRaw).trim()) return String(kaRaw).trim();

  const q = body?.query;
  if (typeof q === "string") {
    const m = q.match(/KA\s?(\d+)/i);
    if (m) return String(m[1]).trim();
  }
  return null;
}

function buildKaPreset(kaStr) {
  const key = `KA${String(kaStr).trim()}`;
  const all = kaTrefwoorden[key];
  if (!Array.isArray(all) || all.length === 0) return null;

  const terms = smartRandomTerms(all, 6);

  return {
    id: `ka${String(kaStr).trim()}`,
    label: key,
    terms,
  };
}

router.post("/search-preset", (req, res) => {
  try {
    console.log("[a13.searchPreset] HIT", req.body);

    const kaStr = parseKaFromBody(req.body || {});
    if (kaStr) {
      const preset = buildKaPreset(kaStr);
      if (!preset) return res.json({ ok: true, presets: [] });
      return res.json({ ok: true, presets: [preset] });
    }

    return res.json({ ok: true, presets: DEFAULT_PRESETS });
  } catch (err) {
    console.error("[a13.searchPreset] ERROR", err);
    return res.status(500).json({
      ok: false,
      error: "Interne fout in search-preset",
    });
  }
});

module.exports = router;


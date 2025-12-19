"use strict";

const express = require("express");
const { filterSources } = require("../services/sourceFilter.cjs");

let citoService = null;
let kleioService = null;

try {
  citoService = require("../services/a28.cito.cjs");
  console.log("[search-match] cito loaded");
} catch (e) {
  console.error("[search-match] cito require failed:", e && (e.stack || e.message || e));
}

try {
  kleioService = require("../services/a27.kleio.cjs");
  console.log("[search-match] kleio loaded");
} catch (e) {
  console.error("[search-match] kleio require failed:", e && (e.stack || e.message || e));
  kleioService = null;
}

function safeStr(x) {
  return typeof x === "string" ? x : "";
}

function uniqKeepOrder(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const s = String(v || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function pickTopTerms(text, max = 8) {
  const t = safeStr(text)
    .toLowerCase()
    .replace(/[^a-z0-9àáâäèéêëìíîïòóôöùúûüçñ\-’' ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!t) return [];

  const stop = new Set([
    "de","het","een","en","of","maar","dat","die","dit","dan","dus","met","voor","door","naar","van","in","op","aan","bij","om","uit",
    "wie","wat","waar","wanneer","waarom","hoe","welke","welk",
    "hun","zijn","haar","ze","zij","wij","jij","ik","jullie",
    "als","ook","nog","al","toch","geen","niet","wel","meer","minder",
    "konden","kon","kan","moesten","moest","mag","mogen","willen","wilde","werden","was","waren","is","zijn",
    "veel","weinig","grote","kleine"
  ]);

  const words = t.split(" ").filter(w => w.length >= 4 && !stop.has(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, max);
}

function scoreForSubdimensie(text, subdimensie) {
  const s = (safeStr(text) + " " + safeStr(subdimensie)).toLowerCase();
  const rules = [
    { key: "politiek", hits: ["regering","staat","wet","macht","partij","parlement","dictatuur","democratie","beleid","minister","verkiez"] },
    { key: "sociaal-economisch", hits: ["economie","werk","arbeid","lonen","crisis","armoede","klasse","industrie","handel","prijzen","inflatie","staking","vakbond"] },
    { key: "cultureel-mentaal", hits: ["propaganda","idee","ideologie","beeld","media","cultuur","religie","waarden","normen","rassenleer","antisemit","mythe","symbool"] },
    { key: "individueel", hits: ["ervaring","keuze","motief","dagboek","persoonlijk","getuige","leven","angst","hoop","dilemma","herinner"] },
  ];

  const dimKey = safeStr(subdimensie).toLowerCase();
  const row = rules.find(r => dimKey.includes(r.key));
  if (!row) return 0;

  let score = 0;
  for (const h of row.hits) if (s.includes(h)) score += 1;
  return score;
}

function makeIdFallback() {
  return "dv_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve) => {
    let done = false;

    const t = setTimeout(() => {
      if (done) return;
      done = true;
      resolve({ ok: false, timeout: true, label });
    }, ms);

    Promise.resolve()
      .then(() => promise)
      .then((value) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve({ ok: true, value });
      })
      .catch((err) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve({ ok: false, error: err, label });
      });
  });
}

module.exports = function searchMatchRouter() {
  const router = express.Router();

  router.post("/search-match", async (req, res) => {
    const started = Date.now();

    try {
      const body = req.body || {};

      const deelvraagId = String(body.deelvraagId || "").trim() || makeIdFallback();
      const deelvraag = safeStr(body.deelvraag).trim();
      const subdimensie = safeStr(body.subdimensie).trim();
      const tv = Array.isArray(body.tv) ? body.tv.map(x => String(x).trim()).filter(Boolean) : [];

      if (!deelvraag) return res.status(400).json({ ok: false, error: "deelvraag is verplicht" });

      const terms = uniqKeepOrder([
        ...pickTopTerms(deelvraag, 8),
        ...pickTopTerms(subdimensie, 4),
      ]).slice(0, 10);

      const filters = {
        text: true,
        images: false,
        cito: true,
        kleio: true,
        historiek: false,
        tv: tv.length ? tv[0] : undefined,
      };

      const meta = { timeouts: [], errors: [], ms: 0 };

      let allResults = [];

      if (citoService && filters.cito) {
        try {
          const citoQ = terms.join(" ");
          const citoRes = citoService.searchCito({ query: citoQ, filters }) || [];
          if (Array.isArray(citoRes)) allResults.push(...citoRes);
        } catch (e) {
          meta.errors.push({ provider: "cito", message: e?.message ? String(e.message) : "onbekend" });
        }
      }

      if (kleioService && filters.kleio) {
        const r = await withTimeout(kleioService.searchKleio({ query: terms, filters }), 5500, "kleio");
        if (r.ok && Array.isArray(r.value)) allResults.push(...r.value);
        else if (r.timeout) meta.timeouts.push("kleio");
        else meta.errors.push({ provider: "kleio", message: r.error?.message ? String(r.error.message) : "onbekend" });
      }

      const filtered = filterSources(allResults, { minTextLen: 80, minTextLenKleio: 1200 });
      const sources = filtered.sources || [];

      const mapped = sources
        .map((s) => {
          const title = safeStr(s.title) || safeStr(s.name) || "(zonder titel)";
          const desc = safeStr(s.description) || safeStr(s.fullText) || safeStr(s.content) || "";
          const id = String(s.id ?? s.url ?? title);

          const score = scoreForSubdimensie(title + " " + desc, subdimensie);

          return {
            id,
            title,
            status: score >= 2 ? "sterk match" : score === 1 ? "match" : "zwak match",
            motivatie:
              score >= 2
                ? "Sluit duidelijk aan op deze subdimensie."
                : score === 1
                ? "Bevat aanknopingspunten voor deze subdimensie."
                : "Algemene relevantie; check inhoud.",
            kernargumenten: [],
            didactische_waarde: "",
            eindscore: score,
            url: s.url ?? null,
            provider: s.provider ?? null,
          };
        })
        .sort((a, b) => (b.eindscore || 0) - (a.eindscore || 0))
        .slice(0, 8);

      meta.ms = Date.now() - started;

      return res.json({
        ok: true,
        deelvraagId,
        deelvraag,
        subdimensie,
        tv,
        queryUsed: terms,
        bronnen: mapped,
        meta: {
          ms: meta.ms,
          timeouts: meta.timeouts,
          errors: meta.errors,
          droppedKleioEmpty: filtered.droppedKleioEmpty || 0,
          droppedKleioNoise: filtered.droppedKleioNoise || 0,
          sourcesCount: sources.length,
        },
      });
    } catch (e) {
      const msg = e?.message ? String(e.message) : "onbekend";
      return res.status(500).json({ ok: false, error: "search-match faalde", message: msg });
    }
  });

  return router;
};


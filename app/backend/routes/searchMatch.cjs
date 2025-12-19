"use strict";

const express = require("express");

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

  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  return ranked.slice(0, max);
}

function scoreForSubdimensie(text, subdimensie) {
  const s = (safeStr(text) + " " + safeStr(subdimensie)).toLowerCase();
  const rules = [
    { key: "politiek", hits: ["regering","staat","wet","macht","partij","parlement","dictatuur","democratie","beleid","minister","verkiez"] },
    { key: "sociaal-economisch", hits: ["economie","werk","arbeid","lonen","crisis","armoede","klasse","industrie","handel","prijzen","inflatie"] },
    { key: "cultureel-mentaal", hits: ["propaganda","idee","ideologie","beeld","media","cultuur","religie","waarden","normen","rassenleer","antisemit"] },
    { key: "individueel", hits: ["ervaring","keuze","motief","dagboek","persoonlijk","getuige","leven","angst","hoop","dilemma"] },
  ];

  const dimKey = safeStr(subdimensie).toLowerCase();
  const row = rules.find(r => dimKey.includes(r.key));
  if (!row) return 0;

  let score = 0;
  for (const h of row.hits) {
    if (s.includes(h)) score += 1;
  }
  return score;
}

module.exports = function searchMatchRouter() {
  const router = express.Router();

  router.post("/search-match", async (req, res) => {
    try {
      const body = req.body || {};
      const deelvraagId = String(body.deelvraagId || "").trim();
      const deelvraag = safeStr(body.deelvraag).trim();
      const subdimensie = safeStr(body.subdimensie).trim();

      if (!deelvraagId || !deelvraag) {
        return res.status(400).json({ ok: false, error: "deelvraagId en deelvraag zijn verplicht" });
      }

      const PORT = process.env.PORT || 8081;
      const baseUrl = `http://127.0.0.1:${PORT}`;

      const terms = uniqKeepOrder([
        ...pickTopTerms(deelvraag, 8),
        ...pickTopTerms(subdimensie, 4),
      ]);

      const searchPayload = {
        query: terms.length ? terms : [deelvraag],
        filters: {
          text: true,
          images: false,
          cito: true,
          kleio: true,
          historiek: true,
        },
      };

      const r = await fetch(`${baseUrl}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchPayload),
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        return res.status(500).json({
          ok: false,
          error: "search-match: /api/search gaf fout",
          status: r.status,
          body: txt.slice(0, 500),
        });
      }

      const data = await r.json();
      const sources = Array.isArray(data.sources) ? data.sources : [];

      const mapped = sources
        .map((s) => {
          const title = safeStr(s.title) || safeStr(s.name) || "(zonder titel)";
          const desc = safeStr(s.description) || safeStr(s.fullText) || "";
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
            _score: score,
          };
        })
        .sort((a, b) => (b._score || 0) - (a._score || 0))
        .slice(0, 8)
        .map(({ _score, ...rest }) => rest);

      return res.json({
        ok: true,
        deelvraagId,
        deelvraag,
        subdimensie,
        queryUsed: searchPayload.query,
        bronnen: mapped,
      });
    } catch (e) {
      console.error("[search-match] FOUT", e);
      return res.status(500).json({ ok: false, error: "search-match faalde", message: e?.message ? String(e.message) : "onbekend" });
    }
  });

  return router;
};


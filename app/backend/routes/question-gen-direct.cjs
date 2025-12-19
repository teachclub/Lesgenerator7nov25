"use strict";

const express = require("express");
const { runGeminiAndParse } = require("../services/gemini.cjs");

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timeout na ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function safeStr(x) {
  return typeof x === "string" ? x : "";
}

function clampInt(x, min, max, fallback) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function mapType(t) {
  const x = (t || "").toLowerCase();
  if (x.includes("vergelijk")) return "Vergelijkend";
  if (x.includes("oorzaak")) return "Oorzaak–gevolg";
  if (x.includes("continu")) return "Continuïteit & verandering";
  if (x.includes("perspect")) return "Perspectief";
  if (x.includes("standpunt")) return "Standpunt/weging (afwegen)";
  return "Verklarend (waarom/waardoor)";
}

function buildPrompt({ invoer, typeLabel, level, nuance, presentisme }) {
  return `
Didactisch kader: Het Vreemde Verleden (Tim Huijgen).

Taak:
1) Genereer 3 mogelijke hoofdvragen.
2) Genereer 4 deelvragen die samen één gekozen hoofdvraag kunnen beantwoorden.

Input (docent):
${invoer}

Eisen:
- Type hoofdvraag: ${typeLabel}
- Taalniveau: ${level} (mavo/havo/vwo)
- Nuance / afwegen (1–5): ${nuance}
- Presentisme in de hoofdvraag: ${presentisme ? "JA (impliciet; leerlingenbril van nu)" : "NEE"}
- Antwoorden mogen niet presentistisch zijn: verklaringen blijven binnen kennis/mentaliteit/context van toen.
- Deelvragen elk vanuit een andere subdimensie (leerlingentaal):
  1) politiek (macht/bestuur)
  2) sociaal-economisch (geld/werk/groepen)
  3) cultureel-mentaal (ideeën/propaganda/beelden)
  4) individueel (keuzes/motieven/ervaringen)

Output exact JSON:
{
  "hoofdvragen": [
    { "id": 1, "vraag": "..." },
    { "id": 2, "vraag": "..." },
    { "id": 3, "vraag": "..." }
  ],
  "deelvragen": [
    { "id": 1, "subdimensie": "politiek (macht/bestuur)", "vraag": "..." },
    { "id": 2, "subdimensie": "sociaal-economisch (geld/werk/groepen)", "vraag": "..." },
    { "id": 3, "subdimensie": "cultureel-mentaal (ideeën/propaganda/beelden)", "vraag": "..." },
    { "id": 4, "subdimensie": "individueel (keuzes/motieven/ervaringen)", "vraag": "..." }
  ]
}
`.trim();
}

module.exports = function questionGenDirectRouter() {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const started = Date.now();

    try {
      const body = req.body || {};
      const invoer = safeStr(body.invoer || body.prompt || "");
      if (!invoer.trim()) {
        return res.status(400).json({ ok: false, error: "invoer ontbreekt" });
      }

      const level = safeStr(body.level || body.taalniveau || "havo").toLowerCase();
      const nuance = clampInt(body.nuance || body.complexiteit || 3, 1, 5, 3);
      const presentisme = Boolean(body.presentisme ?? true);
      const typeLabel = mapType(body.type || body.vraagType || "");

      const prompt = buildPrompt({ invoer, typeLabel, level, nuance, presentisme });

      const json = await withTimeout(
        runGeminiAndParse({
          label: "A16/direct-question-gen",
          meta: { level, nuance, presentisme, typeLabel, invoerLen: invoer.length },
          prompt,
        }),
        12000,
        "question-gen"
      );

      const hv = Array.isArray(json?.hoofdvragen) ? json.hoofdvragen : [];
      const dv = Array.isArray(json?.deelvragen) ? json.deelvragen : [];

      const hoofdvraagSuggesties = hv
        .filter((x) => x && typeof x === "object")
        .map((x, i) => ({ id: Number(x.id) || i + 1, vraag: safeStr(x.vraag).trim() }))
        .filter((x) => x.vraag)
        .slice(0, 3);

      const deelvragen = dv
        .filter((x) => x && typeof x === "object")
        .map((x, i) => ({
          id: Number(x.id) || i + 1,
          subdimensie: safeStr(x.subdimensie).trim() || `subdimensie ${i + 1}`,
          vraag: safeStr(x.vraag).trim(),
        }))
        .filter((x) => x.vraag)
        .slice(0, 6);

      const ms = Date.now() - started;

      return res.json({
        ok: true,
        meta: { ms, model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite" },
        hoofdvraagSuggesties,
        deelvragen,
      });
    } catch (e) {
      const ms = Date.now() - started;
      return res.status(500).json({
        ok: false,
        error: e?.message || "question-gen faalde",
        ms,
      });
    }
  });

  return router;
};


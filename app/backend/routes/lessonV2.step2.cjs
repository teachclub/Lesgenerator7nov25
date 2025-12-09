"use strict";

// backend/routes/lessonV2.step2.cjs
// STEP 2 – LEERLINGMATERIAAL via GEMINI
// Route: POST /api/generate-lesson-v2/step2
//
// v7-fix:
// - Alleen LIGHT sources (id, title, type, provider) richting de prompt.
// - Geen snippets/description/content naar Gemini.
// - Basisvalidatie van concept/tvKa/bronvragen.

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildStep2Prompt } = require("../prompts/lessonV2.step2.cjs");
const { runGeminiAndParse } = require("../services/gemini.cjs");

/**
 * Verwacht body:
 * {
 *   concept: {
 *     hoofdvraag: string,
 *     deelvragen: [
 *       { vraag, dimensie, subdimensie }
 *     ]
 *   },
 *   sources: [
 *     {
 *       id,
 *       title?,
 *       provider?,
 *       type?,
 *       // snippet/description/fullText/content mogen in de body zitten,
 *       // maar worden NIET doorgestuurd naar de prompt.
 *     }
 *   ],
 *   tvKa: {
 *     tv,
 *     tvLabel,
 *     ka,
 *     kaLabel
 *   }
 * }
 *
 * Geeft (als alles goed gaat) direct de Gemini-output terug:
 * {
 *   "step": "step2",
 *   "data": {
 *     "chainSignature": "<MASTER_SIGNATURE>",
 *     "hoofdvraag": "...",
 *     "inleiding": "...",
 *     "bronvragen": [ ... ],
 *     "invultabel": { ... },
 *     "reflectie": { ... }
 *   }
 * }
 */

function registerLessonV2Step2Routes(router) {
  router.post("/generate-lesson-v2/step2", async (req, res) => {
    try {
      const body = req.body || {};

      // 0) Basisvalidatie concept + tvKa
      const concept = body.concept || {};
      if (!concept || typeof concept !== "object") {
        throw new Error("STEP2: ontbrekend of ongeldig 'concept' in body");
      }
      if (typeof concept.hoofdvraag !== "string" || !concept.hoofdvraag.trim()) {
        throw new Error("STEP2: 'concept.hoofdvraag' ontbreekt of is leeg");
      }
      if (
        !Array.isArray(concept.deelvragen) ||
        concept.deelvragen.length === 0
      ) {
        throw new Error("STEP2: 'concept.deelvragen' ontbreekt of is leeg");
      }

      const tvKa = body.tvKa || {};
      if (!tvKa || typeof tvKa !== "object") {
        throw new Error("STEP2: ontbrekend of ongeldig 'tvKa' in body");
      }

      // 1) Brondata normaliseren naar LIGHT sources
      const rawSources = Array.isArray(body.sources) ? body.sources : [];
      const lightSources = rawSources.map((s) => ({
        id: s.id,
        title: s.title || "",
        provider: s.provider || "",
        type: s.type || "",
        // Alle inhoudsvelden laten we hier bewust liggen (niet in prompt):
        // snippet, description, fullText, content, periodHint, meta, ...
      }));

      // 2) Safe body opbouwen voor de prompt-builder
      const safeBody = {
        ...body,
        concept,
        tvKa,
        sources: lightSources,
      };

      // 3) Prompt bouwen op basis van masterprompt + v7-regels
      const prompt = buildStep2Prompt(safeBody);

      if (typeof prompt !== "string" || !prompt.trim()) {
        console.error(
          "[lessonV2_step2] Lege of ongeldige prompt uit buildStep2Prompt"
        );
        return res.status(500).json({
          step: "step2",
          error: "Interne fout: ongeldige prompt voor Gemini (step2)",
        });
      }

      // 4) Gemini aanroepen – zelfde stijl als step1: label + meta
      const json = await runGeminiAndParse({
        prompt,
        label: "lessonV2_step2",
        meta: {
          masterSignature: MASTER_SIGNATURE,
          hasConcept: !!body.concept,
          sourceCount: lightSources.length,
          tv: tvKa.tv,
          ka: tvKa.ka,
        },
      });

      const parsed =
        json && typeof json === "object" ? json : null;

      if (!parsed) {
        console.error(
          "[lessonV2_step2] Geen JSON-resultaat uit runGeminiAndParse"
        );
        return res.status(502).json({
          step: "step2",
          error: "Geen geldig antwoord van Gemini voor step2",
        });
      }

      if (parsed.step !== "step2") {
        console.warn(
          "[lessonV2_step2] Waarschuwing: parsed.step is niet 'step2', maar:",
          parsed.step
        );
      }

      if (!parsed.data || typeof parsed.data !== "object") {
        console.error("[lessonV2_step2] parsed.data ontbreekt of is ongeldig");
        return res.status(502).json({
          step: "step2",
          error: "Ongeldige data-structuur van Gemini voor step2",
        });
      }

      // 5) chainSignature afdwingen
      if (!parsed.data.chainSignature) {
        parsed.data.chainSignature = MASTER_SIGNATURE;
      }

      // 6) Basischek op bronvragen – mag niet leeg zijn
      if (
        !Array.isArray(parsed.data.bronvragen) ||
        parsed.data.bronvragen.length === 0
      ) {
        console.error("[lessonV2_step2] data.bronvragen ontbreekt of is leeg");
        return res.status(502).json({
          step: "step2",
          error: "Ongeldige output van Gemini: 'bronvragen' mag niet leeg zijn",
        });
      }

      // 7) JSON direct doorgeven
      return res.json(parsed);
    } catch (err) {
      console.error("[lessonV2_step2] ERROR", {
        message: err.message,
        stack: err.stack,
      });
      return res.status(500).json({
        step: "step2",
        error: err.message || "Interne fout in step2 route",
      });
    }
  });
}

module.exports = { registerLessonV2Step2Routes };


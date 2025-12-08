// backend/routes/lessonV2.step2.cjs
// STEP 2 – LEERLINGMATERIAAL via GEMINI
// Route: POST /api/generate-lesson-v2/step2
//
// Doel:
// - Prompt bouwen via buildStep2Prompt (v7 + masterprompt).
// - Gemini aanroepen via runGeminiAndParse({ tag, prompt, ... }).
// - Exact het JSON-object teruggeven dat Gemini oplevert:
//   { step: "step2", data: { ... } }

"use strict";

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
 *   sources: [ { id, title, ... } ],
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
      const sources = Array.isArray(body.sources) ? body.sources : [];

      // 1) Prompt bouwen op basis van masterprompt + v7-regels
      const prompt = buildStep2Prompt(body);

      if (typeof prompt !== "string" || !prompt.trim()) {
        console.error(
          "[lessonV2][step2] Lege of ongeldige prompt uit buildStep2Prompt"
        );
        return res.status(500).json({
          step: "step2",
          error: "Interne fout: ongeldige prompt voor Gemini (step2)",
        });
      }

      // 2) Gemini aanroepen – LET OP: runGeminiAndParse verwacht een OBJECT
      //    met { tag, prompt, ... } (net als in proposals/step1).
      const geminiResult = await runGeminiAndParse({
        tag: "lessonV2_step2",
        prompt,
        sourceCount: sources.length,
        masterSignature: MASTER_SIGNATURE,
      });

      const parsed =
        geminiResult && typeof geminiResult === "object" ? geminiResult : null;

      if (!parsed) {
        console.error(
          "[lessonV2][step2] Geen JSON-resultaat uit runGeminiAndParse"
        );
        return res.status(502).json({
          step: "step2",
          error: "Geen geldig antwoord van Gemini voor step2",
        });
      }

      if (parsed.step !== "step2") {
        console.warn(
          "[lessonV2][step2] Waarschuwing: parsed.step is niet 'step2', maar:",
          parsed.step
        );
      }

      if (!parsed.data || typeof parsed.data !== "object") {
        console.error("[lessonV2][step2] parsed.data ontbreekt of is ongeldig");
        return res.status(502).json({
          step: "step2",
          error: "Ongeldige data-structuur van Gemini voor step2",
        });
      }

      if (parsed.data.chainSignature !== MASTER_SIGNATURE) {
        console.warn(
          "[lessonV2][step2] Waarschuwing: chainSignature wijkt af van MASTER_SIGNATURE"
        );
      }

      // 4) EXACT het JSON-object van Gemini terugsturen
      return res.json(parsed);
    } catch (err) {
      console.error("[lessonV2][step2] ERROR", err);
      return res.status(500).json({
        step: "step2",
        error: "Interne fout in step2 route",
      });
    }
  });
}

module.exports = { registerLessonV2Step2Routes };


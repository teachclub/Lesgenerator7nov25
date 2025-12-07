// routes/lessonV2.step1.cjs
// LESSON V2 – STEP 1 (DOCENTMATERIAAL)
// Gebruikt de MASTERPROMPT via prompts/lessonV2.step1.cjs + centrale Gemini-service.

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildStep1Prompt } = require("../prompts/lessonV2.step1.cjs");
const { runGeminiAndParse } = require("../services/gemini.cjs");

/**
 * Registreert de route voor stap 1 op een bestaande Express-router.
 *
 * Pad (na mount op /api):
 *   POST /api/generate-lesson-v2/step1
 *
 * Verwacht body:
 * {
 *   concept: {
 *     hoofdvraag: string,
 *     deelvragen: [ { vraag, dimensie, subdimensie } ]
 *   },
 *   sources: [ { id, title, provider, type, snippet, ... } ]
 * }
 *
 * Geeft JSON terug:
 * {
 *   "step": "step1",
 *   "data": {
 *     "chainSignature": "<MASTER_SIGNATURE>",
 *     "docent": { ... }
 *   }
 * }
 */
function registerLessonV2Step1Routes(router) {
  router.post("/generate-lesson-v2/step1", async (req, res) => {
    const body = req.body || {};

    try {
      // 1. Prompt opbouwen vanuit MASTERPROMPT + body
      const prompt = buildStep1Prompt(body);

      // 2. Gemini aanroepen en JSON parsen
      const json = await runGeminiAndParse({
        prompt,
        label: "lessonV2_step1",
        meta: {
          masterSignature: MASTER_SIGNATURE,
          hasConcept: !!body.concept,
          sourceCount: Array.isArray(body.sources) ? body.sources.length : 0,
        },
      });

      // 3. Basiscontrole op structuur
      if (!json || typeof json !== "object") {
        throw new Error("STEP1: response is geen geldig JSON-object");
      }
      if (json.step !== "step1") {
        throw new Error(`STEP1: onjuiste step-tag in response (got: ${json.step})`);
      }
      if (
        !json.data ||
        typeof json.data !== "object" ||
        !json.data.docent ||
        typeof json.data.docent !== "object"
      ) {
        throw new Error("STEP1: ontbrekende data.docent in response");
      }

      // 4. chainSignature normaliseren / afdwingen
      if (!json.data.chainSignature) {
        json.data.chainSignature = MASTER_SIGNATURE;
      }

      return res.json(json);
    } catch (err) {
      console.error("[lessonV2_step1] ERROR", {
        message: err.message,
        stack: err.stack,
      });

      return res.status(500).json({
        step: "step1",
        error: err.message || String(err),
      });
    }
  });
}

module.exports = {
  registerLessonV2Step1Routes,
};


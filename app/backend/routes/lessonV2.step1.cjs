"use strict";

// routes/lessonV2.step1.cjs
// LESSON V2 – STEP 1 (DOCENTMATERIAAL)
// Gebruikt de MASTERPROMPT via prompts/lessonV2.step1.cjs + centrale Gemini-service.
// v7-fix: alleen LIGHT sources (id, title, type, provider) richting de prompt.

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
 *   sources: [
 *     {
 *       id,
 *       title?,
 *       provider?,
 *       type?,
 *       // LET OP:
 *       //  - snippet/description/fullText/content worden HIER genegeerd
 *       //  - we sturen alleen LIGHT sources door naar de prompt
 *     }
 *   ]
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
      // 0. Basisvalidatie concept
      const concept = body.concept || {};
      if (!concept || typeof concept !== "object") {
        throw new Error("STEP1: ontbrekend of ongeldig 'concept' in body");
      }
      if (typeof concept.hoofdvraag !== "string" || !concept.hoofdvraag.trim()) {
        throw new Error("STEP1: 'concept.hoofdvraag' ontbreekt of is leeg");
      }
      if (
        !Array.isArray(concept.deelvragen) ||
        concept.deelvragen.length === 0
      ) {
        throw new Error("STEP1: 'concept.deelvragen' ontbreekt of is leeg");
      }

      // 1. Brondata normaliseren naar LIGHT sources
      const rawSources = Array.isArray(body.sources) ? body.sources : [];

      const lightSources = rawSources.map((s) => ({
        id: s.id,
        title: s.title || "",
        provider: s.provider || "",
        type: s.type || "",
        // alles wat op inhoud lijkt (snippet, description, fullText, content, etc.)
        // gaat NIET mee de prompt in; dat is ketenregel v7.
      }));

      // 2. Safe body opbouwen die naar de prompt-builder gaat
      const safeBody = {
        ...body,
        concept,
        sources: lightSources,
      };

      // 3. Prompt opbouwen vanuit MASTERPROMPT + safe body
      const prompt = buildStep1Prompt(safeBody);

      // 4. Gemini aanroepen en JSON parsen
      const json = await runGeminiAndParse({
        prompt,
        label: "lessonV2_step1",
        meta: {
          masterSignature: MASTER_SIGNATURE,
          hasConcept: !!body.concept,
          sourceCount: lightSources.length,
        },
      });

      // 5. Basiscontrole op structuur
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

      // 6. chainSignature normaliseren / afdwingen
      if (!json.data.chainSignature) {
        json.data.chainSignature = MASTER_SIGNATURE;
      }

      // 7. Extra defensieve check:
      //    docentobject mag geen 'bronnen', 'snippets' of vergelijkbare velden bevatten.
      const docent = json.data.docent;
      const forbiddenKeys = ["bronnen", "sources", "snippets", "bronTekst", "sourceText"];

      for (const key of forbiddenKeys) {
        if (Object.prototype.hasOwnProperty.call(docent, key)) {
          console.warn("[lessonV2_step1] WARNING: docent-object bevat verboden veld:", key);
          delete docent[key];
        }
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


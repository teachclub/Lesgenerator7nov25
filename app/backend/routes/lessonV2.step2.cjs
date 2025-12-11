"use strict";

// backend/routes/lessonV2.step2.cjs
// STEP 2 – LEERLINGMATERIAAL via GEMINI
// Route: POST /api/generate-lesson-v2/step2
//
// v7-fix:
// - Alleen LIGHT sources (id, title, type, provider) richting de prompt.
// - Geen snippets/description/content naar Gemini.
// - Basisvalidatie van concept/tvKa/deelvragen.

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildStep2Prompt } = require("../prompts/lessonV2.step2.cjs");
const { runGeminiAndParse } = require("../services/gemini.cjs");

function registerLessonV2Step2Routes(router) {
  router.post("/generate-lesson-v2/step2", async (req, res) => {
    try {
      const body = req.body || {};

      const conceptRaw = body.concept || {};
      if (!conceptRaw || typeof conceptRaw !== "object") {
        throw new Error("STEP2: ontbrekend of ongeldig 'concept' in body");
      }
      if (
        typeof conceptRaw.hoofdvraag !== "string" ||
        !conceptRaw.hoofdvraag.trim()
      ) {
        throw new Error("STEP2: 'concept.hoofdvraag' ontbreekt of is leeg");
      }

      // >>> BELANGRIJK: deelvragen komen uit STEP 1 en worden
      // expliciet als body.deelvragen meegestuurd door LessonPage.
      let deelvragen = Array.isArray(body.deelvragen)
        ? body.deelvragen
        : Array.isArray(conceptRaw.deelvragen)
        ? conceptRaw.deelvragen
        : [];

      if (!Array.isArray(deelvragen) || deelvragen.length === 0) {
        throw new Error("STEP2: 'deelvragen' ontbreekt of is leeg");
      }

      // Concept verrijkt met deelvragen (zodat base-prompt gewoon concept.deelvragen heeft)
      const concept = {
        ...conceptRaw,
        deelvragen,
      };

      const tvKa = body.tvKa || {};
      if (!tvKa || typeof tvKa !== "object") {
        throw new Error("STEP2: ontbrekend of ongeldig 'tvKa' in body");
      }

      const rawSources = Array.isArray(body.sources) ? body.sources : [];
      const lightSources = rawSources.map((s) => ({
        id: s.id,
        title: s.title || "",
        provider: s.provider || "",
        type: s.type || "",
      }));

      const safeBody = {
        ...body,
        concept,
        tvKa,
        sources: lightSources,
      };

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

      const parsed = json && typeof json === "object" ? json : null;

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

      if (!parsed.data.chainSignature) {
        parsed.data.chainSignature = MASTER_SIGNATURE;
      }

      // Kwadrant is afgeschaft in step2: defensief verwijderen als het toch verschijnt.
      if (
        parsed.data.leerling &&
        typeof parsed.data.leerling === "object" &&
        Object.prototype.hasOwnProperty.call(parsed.data.leerling, "kwadrant")
      ) {
        delete parsed.data.leerling.kwadrant;
      }

      // Basischek op bronvragen – mag niet leeg zijn
      if (
        !parsed.data.leerling ||
        !Array.isArray(parsed.data.leerling.bronvragen) ||
        parsed.data.leerling.bronvragen.length === 0
      ) {
        console.error(
          "[lessonV2_step2] data.leerling.bronvragen ontbreekt of is leeg"
        );
        return res.status(502).json({
          step: "step2",
          error:
            "Ongeldige output van Gemini: 'leerling.bronvragen' mag niet leeg zijn",
        });
      }

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


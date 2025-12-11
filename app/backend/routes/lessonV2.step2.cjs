"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildStep2Prompt } = require("../prompts/lessonV2.step2.cjs");
const { runGeminiAndParse } = require("../services/gemini.cjs");

function registerLessonV2Step2Routes(router) {
  router.post("/generate-lesson-v2/step2", async (req, res) => {
    try {
      const body = req.body || {};

      console.log(
        "[STEP2] incoming body.sources length:",
        Array.isArray(body.sources) ? body.sources.length : "geen array"
      );
      if (Array.isArray(body.sources)) {
        console.log(
          "[STEP2] incoming body.sources ids:",
          body.sources.map((s) => s.id)
        );
      }

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

      let deelvragen = Array.isArray(body.deelvragen)
        ? body.deelvragen
        : Array.isArray(conceptRaw.deelvragen)
        ? conceptRaw.deelvragen
        : [];

      if (!Array.isArray(deelvragen) || deelvragen.length === 0) {
        throw new Error("STEP2: 'deelvragen' ontbreekt of is leeg");
      }

      const concept = {
        ...conceptRaw,
        deelvragen,
      };

      const tvKa = body.tvKa || {};
      if (!tvKa || typeof tvKa !== "object") {
        throw new Error("STEP2: ontbrekend of ongeldig 'tvKa' in body");
      }

      const rawSources = Array.isArray(body.sources) ? body.sources : [];
      const MAX_SOURCES_STEP2 = 15;
      const cappedSources = rawSources.slice(0, MAX_SOURCES_STEP2);

      const lightSources = cappedSources.map((s) => ({
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
        deelvragen,
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

      if (
        parsed.data.leerling &&
        typeof parsed.data.leerling === "object" &&
        Object.prototype.hasOwnProperty.call(parsed.data.leerling, "kwadrant")
      ) {
        delete parsed.data.leerling.kwadrant;
      }

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


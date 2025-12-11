"use strict";

// routes/lessonV2.step1.cjs
// LESSON V2 – STEP 1 (DOCENTMATERIAAL)
// Gebruikt de MASTERPROMPT via prompts/lessonV2.step1.cjs + centrale Gemini-service.
// v7-fix:
// - concept.deelvragen wordt NIET meer verwacht in de input;
// - deelvragen worden door Gemini gegenereerd;
// - deelvragen uit de output kunnen strings of objecten zijn; we normaliseren naar string[];

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildStep1Prompt } = require("../prompts/lessonV2.step1.cjs");
const { runGeminiAndParse } = require("../services/gemini.cjs");

/**
 * Registreert de route voor stap 1 op een bestaande Express-router.
 *
 * Pad (na mount op /api):
 *   POST /api/generate-lesson-v2/step1
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
      if (
        typeof concept.hoofdvraag !== "string" ||
        !concept.hoofdvraag.trim()
      ) {
        throw new Error("STEP1: 'concept.hoofdvraag' ontbreekt of is leeg");
      }
      // LET OP: geen check meer op concept.deelvragen – die worden juist in STEP1 bedacht.

      // 1. Brondata normaliseren naar LIGHT sources
      const rawSources = Array.isArray(body.sources) ? body.sources : [];

      const lightSources = rawSources.map((s) => ({
        id: s.id,
        title: s.title || "",
        provider: s.provider || "",
        type: s.type || "",
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
        throw new Error(
          `STEP1: onjuiste step-tag in response (got: ${json.step})`
        );
      }
      if (!json.data || typeof json.data !== "object") {
        throw new Error("STEP1: ontbrekende data in response");
      }
      if (!json.data.docent || typeof json.data.docent !== "object") {
        throw new Error("STEP1: ontbrekende data.docent in response");
      }

      // 6. chainSignature normaliseren / afdwingen
      if (!json.data.chainSignature) {
        json.data.chainSignature = MASTER_SIGNATURE;
      }

      // 7. Docent-object normaliseren zodat de frontend veilig kan .map()-pen
      const docent = json.data.docent;

      // 7a. deelvragen -> altijd array van strings
      //
      // Toegestaan vanuit Gemini:
      // - ["In hoeverre ...?", "..."]
      // - [{ vraag: "In hoeverre ...?", dimensie: "...", ... }, ...]
      if (Array.isArray(docent.deelvragen)) {
        docent.deelvragen = docent.deelvragen
          .map((v) => {
            if (typeof v === "string") {
              return v.trim();
            }
            if (v && typeof v === "object" && typeof v.vraag === "string") {
              return v.vraag.trim();
            }
            return "";
          })
          .filter((v) => v.length > 0);
      } else if (
        typeof docent.deelvragen === "string" &&
        docent.deelvragen.trim()
      ) {
        docent.deelvragen = [docent.deelvragen.trim()];
      } else {
        docent.deelvragen = [];
      }

      // 7b. bronverwijzingenPerDeelvraag -> altijd array van { deelvraag, bronnen[] }
      if (!Array.isArray(docent.bronverwijzingenPerDeelvraag)) {
        docent.bronverwijzingenPerDeelvraag = [];
      } else {
        docent.bronverwijzingenPerDeelvraag =
          docent.bronverwijzingenPerDeelvraag
            .filter((entry) => entry && typeof entry === "object")
            .map((entry) => {
              const deelvraag =
                typeof entry.deelvraag === "string"
                  ? entry.deelvraag.trim()
                  : "";
              let bronnen = [];

              if (Array.isArray(entry.bronnen)) {
                bronnen = entry.bronnen
                  .map((n) => parseInt(n, 10))
                  .filter((n) => Number.isInteger(n) && n > 0);
              }

              return { deelvraag, bronnen };
            });
      }

      // 7c. lesfasen -> altijd array van nette fase-objecten
      if (!Array.isArray(docent.lesfasen)) {
        docent.lesfasen = [];
      } else {
        docent.lesfasen = docent.lesfasen
          .filter((fase) => fase && typeof fase === "object")
          .map((fase) => ({
            fase:
              typeof fase.fase === "string" && fase.fase.trim()
                ? fase.fase.trim()
                : "",
            tijd:
              typeof fase.tijd === "string" && fase.tijd.trim()
                ? fase.tijd.trim()
                : "",
            doel:
              typeof fase.doel === "string" && fase.doel.trim()
                ? fase.doel.trim()
                : "",
            activiteit:
              typeof fase.activiteit === "string" && fase.activiteit.trim()
                ? fase.activiteit.trim()
                : "",
            werkvorm:
              typeof fase.werkvorm === "string" && fase.werkvorm.trim()
                ? fase.werkvorm.trim()
                : "",
          }));
      }

      // 8. Extra defensieve check: docentobject mag geen inhoud-velden bevatten
      const forbiddenKeys = [
        "bronnen",
        "sources",
        "snippets",
        "bronTekst",
        "sourceText",
      ];
      for (const key of forbiddenKeys) {
        if (Object.prototype.hasOwnProperty.call(docent, key)) {
          console.warn(
            "[lessonV2_step1] WARNING: docent-object bevat verboden veld:",
            key
          );
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


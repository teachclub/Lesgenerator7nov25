// backend/routes/a36.refine.cjs
// AI-gedreven refine-endpoint voor een les-concept.
//
// POST /api/refine-concept
//
// Doet een lichte herschrijving van title/hook/hoofdvraag via Gemini,
// met behoud van masterSignature en chainSignature.

const express = require("express");
const router = express.Router();

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { runGeminiAndParse } = require("../services/gemini.cjs");
const {
  buildRefineConceptPrompt,
  validateRefineResponse,
} = require("../prompts/lessonV2.refineConcept.cjs");

/**
 * Haal het concept uit de body op de manier waarop de frontend het stuurt.
 *
 * Huidige payload (voorbeeld):
 * {
 *   currentProposal: { id: "p1", title: "...", hook: "...", hoofdvraag: "...", ... },
 *   feedback: "meer leerlingentaal en presentisme oordeel",
 *   sources: [...]
 * }
 */
function extractConcept(body) {
  if (!body || typeof body !== "object") return {};

  // 1) Huidige V2-shape: currentProposal = het voorstel op de kaart
  if (body.currentProposal && typeof body.currentProposal === "object") {
    return body.currentProposal;
  }

  // 2) Alternatief: expliciet concept
  if (body.concept && typeof body.concept === "object") {
    return body.concept;
  }

  // 3) Oudere variant
  if (body.refinedConcept && typeof body.refinedConcept === "object") {
    return body.refinedConcept;
  }

  // 4) Laatste redmiddel
  return body;
}

router.post("/refine-concept", async (req, res) => {
  const body = req.body || {};
  const concept = extractConcept(body);

  // Mode: kan later subtieler, voor nu:
  // - “iets meer oordeel erin” → more_judgement (via frontend)
  const mode = body.mode || body.variant || "default";

  // UserHint: neem ook 'feedback' mee (die stond in je payload)
  const userHint =
    body.userHint ||
    body.comment ||
    body.feedback || // belangrijkste nieuwe bron
    "";

  console.log("[A36/DEBUG] refine-concept – start", {
    mode,
    hasFeedback: !!body.feedback,
    conceptTitle: concept && concept.title,
    conceptKeys: Object.keys(concept || {}),
  });

  try {
    const prompt = buildRefineConceptPrompt({
      concept,
      mode,
      userHint,
    });

    const json = await runGeminiAndParse({
      prompt,
      label: "lessonV2_refineConcept",
      meta: {
        mode,
        hasUserHint: !!userHint,
      },
    });

    const validated = validateRefineResponse(json, MASTER_SIGNATURE);
    const aiConcept = validated.concept || {};

    // Merge: AI mag velden overschrijven, MAAR
    // - als AI lege strings teruggeeft, houden we de oude waarden aan.
    const refinedConcept = {
      ...concept,
      ...aiConcept,
      id: aiConcept.id || concept.id || null,
      title: aiConcept.title || concept.title || "",
      hook: aiConcept.hook || concept.hook || "",
      hoofdvraag:
        aiConcept.hoofdvraag ||
        concept.hoofdvraag ||
        concept.hoofdvraagText ||
        "",
      masterSignature:
        aiConcept.masterSignature ||
        concept.masterSignature ||
        MASTER_SIGNATURE,
      tv: aiConcept.tv || concept.tv || "",
      ka: aiConcept.ka || concept.ka || "",
    };

    console.log("[A36/DEBUG] refine-concept – success", {
      mode: validated.mode || mode,
      titleBefore: concept.title,
      titleAfter: refinedConcept.title,
    });

    return res.json({
      concept: refinedConcept,
      meta: {
        from: "gemini-refine",
        mode: validated.mode || mode,
        chainSignature: validated.chainSignature,
      },
    });
  } catch (err) {
    console.error(
      "[A36/ERROR] refine-concept – fallback naar ongewijzigd concept:",
      err && err.message ? err.message : err
    );

    return res.json({
      concept,
      meta: {
        from: "refine-fallback",
        error: err && err.message ? err.message : String(err),
        chainSignature: concept.masterSignature || MASTER_SIGNATURE,
      },
    });
  }
});

module.exports = router;


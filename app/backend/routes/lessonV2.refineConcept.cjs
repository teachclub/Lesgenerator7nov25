"use strict";

// backend/routes/lessonV2.refineConcept.cjs
// Lessie / LesGO v2 – refine-concept endpoint
//
// POST /api/generate-lesson-v2/refine-concept
// Body:
// {
//   tvKa: { tv, tvLabel, ka, kaLabel },
//   originalConcept: { ... },
//   complexityLevel: number,
//   nuanceLevel: number,
//   docentInstructie: string
// }

const express = require("express");
const router = express.Router();

const { runGeminiAndParse } = require("../services/gemini.cjs");
const {
  buildRefineConceptPrompt,
  validateRefineConceptResponse,
} = require("../prompts/lessonV2.refineConcept.cjs");

router.post("/generate-lesson-v2/refine-concept", async (req, res) => {
  const {
    tvKa = {},
    originalConcept = {},
    complexityLevel = 3,
    nuanceLevel = 3,
    docentInstructie = "",
  } = req.body || {};

  try {
    const prompt = buildRefineConceptPrompt({
      originalConcept,
      tvKa,
      complexityLevel,
      nuanceLevel,
      docentInstructie,
    });

    const json = await runGeminiAndParse({
      prompt,
      label: "lessonV2_refineConcept",
      meta: {
        tv: tvKa.tv,
        ka: tvKa.ka,
        complexityLevel,
        nuanceLevel,
      },
    });

    const validated = validateRefineConceptResponse(json);

    return res.json({
      data: {
        concept: validated.concept,
        meta: validated.meta,
      },
    });
  } catch (err) {
    console.error("[lessonV2.refineConcept] fout:", err);
    return res.status(500).json({
      error:
        err && err.message
          ? err.message
          : "Er ging iets mis bij het verfijnen van het lesconcept.",
    });
  }
});

module.exports = router;


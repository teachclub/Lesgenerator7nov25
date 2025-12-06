// routes/lessonV2.step4.cjs
// LesGO v2 – Step4 (antwoordmodel) met v6MP6dec-chainSignature-check

const { runGeminiAndParse } = require("../services/gemini.cjs");
const { buildStep4Prompt } = require("../prompts/lessonV2.step4.cjs");
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function registerLessonV2Step4Routes(router) {
  router.post("/step4", async (req, res) => {
    const body = req.body || {};
    const { concept = {}, sources = [] } = body;

    if (!concept || !concept.hoofdvraag) {
      return res.status(400).json({
        error: "MISSING_CONCEPT_HOOFDVRAAG",
        step: "step4",
        message:
          "Step4 verwacht een 'concept' met minimaal een 'hoofdvraag' in de body.",
      });
    }

    if (!Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        error: "MISSING_SOURCES",
        step: "step4",
        message: "Step4 verwacht een niet-lege array 'sources' in de body.",
      });
    }

    try {
      const prompt = buildStep4Prompt(body);
      const json = await runGeminiAndParse({
        prompt,
        label: "step4",
        meta: {
          hoofdvraag: concept.hoofdvraag,
          sourceCount: sources.length,
        },
      });

      const expected = concept.masterSignature || MASTER_SIGNATURE;
      const data = json && json.data ? json.data : null;
      const got = data && data.chainSignature ? data.chainSignature : null;

      if (got && expected && got !== expected) {
        throw new Error(
          `STEP4_SIGNATURE_MISMATCH: expected "${expected}", got "${got}"`
        );
      }

      if (data && !data.chainSignature) {
        data.chainSignature = expected;
      }

      return res.json(json);
    } catch (err) {
      console.error("[LesGo][step4] ERROR", err && err.message ? err.message : err);
      return res.status(500).json({
        error: "STEP4_FAILED",
        step: "step4",
        message: err && err.message ? err.message : String(err),
      });
    }
  });
}

module.exports = {
  registerLessonV2Step4Routes,
};


// routes/lessonV2.step1.cjs
// LesGO v2 – Step1 (docenteninstructie / controle) met v6MP6dec-chainSignature-check

const { runGeminiAndParse } = require("../services/gemini.cjs");
const { buildStep1Prompt } = require("../prompts/lessonV2.step1.cjs");
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function registerLessonV2Step1Routes(router) {
  router.post("/step1", async (req, res) => {
    const body = req.body || {};
    const { concept = {} } = body;

    if (!concept || Object.keys(concept).length === 0) {
      return res.status(400).json({
        error: "MISSING_CONCEPT",
        step: "step1",
        message: "Step1 verwacht een gevuld 'concept'-object in de body.",
      });
    }

    try {
      const prompt = buildStep1Prompt(body);
      const json = await runGeminiAndParse({
        prompt,
        label: "step1",
        meta: { conceptKeys: Object.keys(concept) },
      });

      const expected = concept.masterSignature || MASTER_SIGNATURE;
      const data = json && json.data ? json.data : null;
      const got = data && data.chainSignature ? data.chainSignature : null;

      if (got && expected && got !== expected) {
        throw new Error(
          `STEP1_SIGNATURE_MISMATCH: expected "${expected}", got "${got}"`
        );
      }

      if (data && !data.chainSignature) {
        data.chainSignature = expected;
      }

      return res.json(json);
    } catch (err) {
      console.error("[LesGo][step1] ERROR", err && err.message ? err.message : err);
      return res.status(500).json({
        error: "STEP1_FAILED",
        step: "step1",
        message: err && err.message ? err.message : String(err),
      });
    }
  });
}

module.exports = {
  registerLessonV2Step1Routes,
};


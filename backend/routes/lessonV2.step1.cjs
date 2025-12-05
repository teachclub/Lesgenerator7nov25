// routes/lessonV2.step1.cjs
const { runGeminiAndParse } = require("../services/gemini.cjs");
const { buildStep1Prompt } = require("../prompts/lessonV2.step1.cjs");

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
      res.json(json);
    } catch (err) {
      console.error("[LesGo][step1] ERROR", err.message);
      res.status(500).json({
        error: "STEP1_FAILED",
        step: "step1",
        message: err.message,
      });
    }
  });
}

module.exports = {
  registerLessonV2Step1Routes,
};


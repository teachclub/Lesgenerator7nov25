// routes/lessonV2.step2.cjs
const { runGeminiAndParse } = require("../services/gemini.cjs");
const { buildStep2Prompt } = require("../prompts/lessonV2.step2.cjs");

function registerLessonV2Step2Routes(router) {
  router.post("/step2", async (req, res) => {
    const body = req.body || {};
    const { concept = {}, sources = [] } = body;

    if (!concept || !concept.hoofdvraag) {
      return res.status(400).json({
        error: "MISSING_CONCEPT_HOOFDVRAAG",
        step: "step2",
        message:
          "Step2 verwacht een 'concept' met minimaal een 'hoofdvraag' in de body.",
      });
    }

    if (!Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        error: "MISSING_SOURCES",
        step: "step2",
        message:
          "Step2 verwacht een niet-lege array 'sources' in de body.",
      });
    }

    try {
      const prompt = buildStep2Prompt(body);
      const json = await runGeminiAndParse({
        prompt,
        label: "step2",
        meta: {
          hoofdvraag: concept.hoofdvraag,
          sourceCount: sources.length,
        },
      });
      res.json(json);
    } catch (err) {
      console.error("[LesGo][step2] ERROR", err.message);
      res.status(500).json({
        error: "STEP2_FAILED",
        step: "step2",
        message: err.message,
      });
    }
  });
}

module.exports = {
  registerLessonV2Step2Routes,
};



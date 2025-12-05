// routes/lessonV2.step3.cjs
const { buildStep3Data } = require("../prompts/lessonV2.step3.cjs");

function registerLessonV2Step3Routes(router) {
  router.post("/step3", async (req, res) => {
    try {
      const json = buildStep3Data(req.body || {});
      res.json(json);
    } catch (err) {
      console.error("[LesGo][step3] ERROR", err.message);
      res.status(500).json({
        error: "STEP3_FAILED",
        step: "step3",
        message: err.message,
      });
    }
  });
}

module.exports = {
  registerLessonV2Step3Routes,
};


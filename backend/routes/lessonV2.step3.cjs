// routes/lessonV2.step3.cjs
// LesGO v2 – Step3 (bronnenblad) met v6MP6dec-chainSignature-injectie

const { buildStep3Data } = require("../prompts/lessonV2.step3.cjs");
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function registerLessonV2Step3Routes(router) {
  router.post("/step3", async (req, res) => {
    const body = req.body || {};
    const { concept = {} } = body;

    try {
      const expected = concept.masterSignature || MASTER_SIGNATURE;

      const result = buildStep3Data(body) || {};
      let json;

      if (result && typeof result === "object" && "step" in result && "data" in result) {
        json = result;
      } else {
        json = {
          step: 3,
          data: result,
        };
      }

      if (!json.data || typeof json.data !== "object") {
        json.data = {};
      }

      if (!json.data.chainSignature) {
        json.data.chainSignature = expected;
      }

      return res.json(json);
    } catch (err) {
      console.error("[LesGo][step3] ERROR", err && err.message ? err.message : err);
      return res.status(500).json({
        error: "STEP3_FAILED",
        step: "step3",
        message: err && err.message ? err.message : String(err),
      });
    }
  });
}

module.exports = {
  registerLessonV2Step3Routes,
};


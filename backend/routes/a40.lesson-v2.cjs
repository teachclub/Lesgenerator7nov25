// routes/a40.lesson-v2.cjs
// Lesgenerator v2 – 4 stappen (docent, leerlingen, bronnenblad, antwoordmodel)
// Nu opgesplitst per stap + centrale Gemini-service

const express = require("express");
const router = express.Router();

const {
  registerLessonV2Step1Routes,
} = require("./lessonV2.step1.cjs");
const {
  registerLessonV2Step2Routes,
} = require("./lessonV2.step2.cjs");
const {
  registerLessonV2Step3Routes,
} = require("./lessonV2.step3.cjs");
const {
  registerLessonV2Step4Routes,
} = require("./lessonV2.step4.cjs");

// Alle step-routes registreren op deze router.
// In server.cjs gebruik je iets als:
//   app.use("/api/generate-lesson-v2", require("./routes/a40.lesson-v2.cjs"));

registerLessonV2Step1Routes(router);
registerLessonV2Step2Routes(router);
registerLessonV2Step3Routes(router);
registerLessonV2Step4Routes(router);

module.exports = router;


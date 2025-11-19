const express = require("express");
const router = express.Router();

router.post("/api/generate", express.json(), (req, res) => {
  const body = req.body || {};
  const ctx = body.context || {};
  if (!ctx.head_question_student) {
    return res.status(400).json({ ok: false, error: "INVALID_INPUT", message: "head_question_student ontbreekt." });
  }
  res.json({
    ok: true,
    echo: {
      context: body.context || null,
      selection: body.selection || null,
      targets: body.targets || null
    },
    lesson_stub: {
      meta: { version: "3.3", lang: (ctx.lang || "nl") },
      teacher_version: { intro: "stub" },
      student_version: { head_question: ctx.head_question_student }
    }
  });
});

module.exports = router;


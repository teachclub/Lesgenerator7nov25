const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

function cleanJson(text) {
  let clean = text.replace(/```json/gi, '').replace(/```/g, '');
  const firstBracket = clean.indexOf('{');
  const lastBracket = clean.lastIndexOf('}');
  if (firstBracket !== -1 && lastBracket !== -1) clean = clean.substring(firstBracket, lastBracket + 1);
  return clean.trim();
}

router.post('/generate-lesson-v2', async (req, res) => {
  try {
    const { concept, sources } = req.body;
    const sourcesText = sources.map((s) => `[ID:${s.id}] ${s.title}:\n${(s.content||"").substring(0,800)}`).join('\n\n');

    const prompt = `
      ROL: Cito-toetsontwikkelaar. OPDRACHT: Compleet lesplan (JSON).
      CONCEPT: ${concept.title} - ${concept.hook}
      BRONNEN: ${sourcesText}
      OUTPUT JSON:
      {
        "title": "...", "context": "...", "learningGoal": "...", "didacticApproach": "...",
        "teacherGuide": { "lessonGoal": "...", "didacticQuadrant": "...", "reflectionQuestions": [], "answerKey": [{ "questionId": "...", "answer": "..." }] },
        "phases": [{ "phaseName": "...", "time": "...", "teacherRole": "...", "studentRole": "...", "materials": "..." }],
        "studentWorksheet": { "assignmentDescription": "...", "steps": [], "sourceQuestions": [{ "sourceId": "...", "questions": [{ "id": "...", "question": "..." }] }] }
      }
      Antwoord ALLEEN JSON.
    `;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    res.json(JSON.parse(cleanJson(result.response.text())));
  } catch (error) { res.status(500).json({ error: error.message }); }
});
module.exports = router;

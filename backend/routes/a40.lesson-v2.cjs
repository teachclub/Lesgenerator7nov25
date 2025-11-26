const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

function cleanJson(text) {
  let clean = text.replace(/```json/gi, '').replace(/```/g, '');
  const firstBracket = clean.indexOf('{');
  const lastBracket = clean.lastIndexOf('}');
  if (firstBracket !== -1 && lastBracket !== -1) {
    clean = clean.substring(firstBracket, lastBracket + 1);
  }
  return clean.trim();
}

// NIEUWE ROUTE: /generate-lesson-v2
router.post('/generate-lesson-v2', async (req, res) => {
  try {
    const { concept, sources } = req.body;
    
    const sourcesText = sources.map((s) => `[ID:${s.id}] ${s.title} (${s.type}):\n${(s.content||"").substring(0,800)}`).join('\n\n');

    const prompt = `
      ROL: Cito-toetsontwikkelaar & Didacticus.
      OPDRACHT: Schrijf een COMPLEET lesplan (JSON) voor Havo/Vwo bovenbouw.
      
      CONCEPT:
      Titel: ${concept.title}
      Hook: ${concept.hook}
      Rationale: ${concept.rationale}

      BRONNEN:
      ${sourcesText}

      EISEN AAN LEERDOELEN (SMART):
      De leerdoelen moeten concreet en meetbaar zijn.
      1. **Gebruik actiewerkwoorden:** (bijv. 'analyseren', 'vergelijken', 'uitleggen', 'opnoemen').
      2. **VERBODEN:** Gebruik GEEN vage termen als 'begrijpen', 'weten', 'leren' of 'inzicht krijgen'.
      3. **Perspectief:** Formuleer vanuit de leerling ("Aan het eind van de les kan ik...").
      4. **Format:** Geef ze weer als een Markdown bullet-lijst.

      OUTPUT EISEN (JSON):
      Genereer een JSON object met EXACT deze structuur:
      {
        "title": "...",
        "context": "Tijdvak & KA",
        "learningGoal": "Markdown lijst met 3-4 SMART leerdoelen (bijv: '- Ik kan uitleggen waarom...')",
        "didacticApproach": "Korte uitleg van de werkvorm",
        "teacherGuide": {
           "lessonGoal": "De kern van de les in 1 zin voor de docent.",
           "didacticQuadrant": "Uitleg (Actief/Receptief vs Betekenisvol/Haalbaar)",
           "reflectionQuestions": ["Vraag 1", "Vraag 2", "Vraag 3"],
           "answerKey": [{ "questionId": "...", "answer": "..." }]
        },
        "phases": [
          { "phaseName": "1. Introductie", "time": "10 min", "teacherRole": "...", "studentRole": "...", "materials": "..." },
          { "phaseName": "2. Kern", "time": "30 min", "teacherRole": "...", "studentRole": "...", "materials": "..." },
          { "phaseName": "3. Afsluiting", "time": "10 min", "teacherRole": "...", "studentRole": "...", "materials": "..." }
        ],
        "studentWorksheet": {
          "assignmentDescription": "Heldere instructie voor de leerling.",
          "steps": ["Stap 1", "Stap 2", "Stap 3"],
          "sourceQuestions": [
             { 
               "sourceId": "...", 
               "questions": [
                 { "id": "q1", "question": "Vraag op Havo/Vwo niveau (bijv. standplaatsgebondenheid)", "bloomLevel": "Analyse" }
               ] 
             }
          ]
        }
      }
      Antwoord ALLEEN met JSON.
    `;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_CHIPS || 'gemini-1.5-flash' });

    console.log("[A40] 🚀 Start V2 Lesgeneratie (Met SMART doelen)...");
    const result = await model.generateContent(prompt);
    const lessonPlan = JSON.parse(cleanJson(result.response.text()));

    res.json(lessonPlan);

  } catch (error) {
    console.error('[A40] ❌ Fout:', error);
    res.status(500).json({ error: 'Fout in V2 lesgeneratie.' });
  }
});

module.exports = router;

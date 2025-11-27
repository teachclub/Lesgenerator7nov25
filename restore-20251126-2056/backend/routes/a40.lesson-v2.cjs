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

const getModel = () => {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_CHIPS || 'gemini-2.5-flash-lite' });
};

// STAP 1: DOCENT
router.post('/generate-lesson-v2/step1', async (req, res) => {
    try {
        const { concept, sources } = req.body;
        const activeSources = sources.slice(0, 6);
        const sourcesText = activeSources.map((s, i) => `BRON ${i+1}: ${s.title}`).join('\n');

        console.log("[A40] 🎬 Stap 1/4: Docent...");
        const prompt = `
        ROL: Expert geschiedenisdidactiek.
        DOEL: Deel 1 - Docentenhandleiding.
        CONCEPT: ${concept.title}
        
        OPDRACHT:
        1. Bepaal 4 concrete **Sub-dimensies**.
        2. Ontwerp het **Kwadrant** (X: Sub 1 vs Sub 2, Y: Sub 3 vs Sub 4).
        3. Bepaal SMART leerdoelen.

        OUTPUT JSON:
        {
            "title": "${concept.title}",
            "context": "Tijdvak & KA",
            "learningGoal": "Markdown bullet-lijst (SMART).",
            "didacticApproach": "Uitleg werkvorm.",
            "teacherGuide": {
                "lessonGoal": "Kern van de les.",
                "grabBagRationale": "Uitleg mix.",
                "sourceQuadrant": { "axisX": "...", "axisY": "...", "explanation": "..." }
            }
        }`;
        const result = await getModel().generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (e) { res.status(500).json({ error: 'Fout stap 1' }); }
});

// STAP 2: FASEN
router.post('/generate-lesson-v2/step2', async (req, res) => {
    try {
        console.log("[A40] 🎬 Stap 2/4: Fasen...");
        const { concept } = req.body;
        const prompt = `MAAK LESFASEN JSON VOOR "${concept.title}": { "phases": [ { "phaseName": "...", "time": "...", "teacherRole": "...", "studentRole": "...", "materials": "..." } ] }`;
        const result = await getModel().generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (e) { res.status(500).json({ error: 'Fout stap 2' }); }
});

// STAP 3: LEERLING (SCHONE TABELLEN)
router.post('/generate-lesson-v2/step3', async (req, res) => {
    try {
        const { concept, sources, quadrantContext } = req.body; 
        const activeSources = sources.slice(0, 6);
        const sourcesText = activeSources.map((s, i) => `BRON ${i+1}: ${s.title}`).join('\n');
        
        const axes = quadrantContext || { axisX: "Links <-> Rechts", axisY: "Boven <-> Onder" };
        const xLabels = axes.axisX.split('<->').map(s => s.trim());
        const yLabels = axes.axisY.split('<->').map(s => s.trim());

        console.log("[A40] 🎬 Stap 3/4: Werkblad...");
        
        // HIER DE FIX: GEEN HTML <br>, MAAR PUNTJES
        const writingLines = "......................................";

        const prompt = `
        ROL: Expert geschiedenisdidactiek.
        DOEL: Maak het LEERLINGENWERKBLAD voor "${concept.title}".
        BRONNEN: ${sourcesText}
        
        OPDRACHT TABELLEN:
        1. **Samenwerkingstabel:**
           - Vul kolom 1 in ("Bron 1", etc).
           - Laat de rest LEEG met: "${writingLines}"
        
        2. **Kwadrant:**
           - Assen: X=${axes.axisX}, Y=${axes.axisY}
           - Laat de cellen LEEG met: "${writingLines}"
           - Gebruik GEEN html tags zoals <br>.

        OUTPUT JSON:
        {
            "studentWorksheet": {
                "assignmentDescription": "Instructie...",
                "steps": ["Stap 1...", "Stap 2..."],
                "grabBag": [
                    { "label": "Wie?", "items": ["...", "..."] },
                    { "label": "Gevoel", "items": ["...", "..."] },
                    { "label": "Sub-dimensie", "items": ["...", "..."] },
                    { "label": "Argument", "items": ["...", "..."] }
                ],
                "emptyTables": {
                    "collaboration": "| Bron | Wie? | Gevoel | Sub-dimensie | Argument |\n|---|---|---|---|---|\n| Bron 1 | ${writingLines} | ${writingLines} | ${writingLines} | ${writingLines} |\n| Bron 2 | ${writingLines} | ${writingLines} | ${writingLines} | ${writingLines} |", 
                    
                    "quadrant": "| | **${xLabels[0] || '..'}** | **${xLabels[1] || '..'}** |\n|---|---|---|\n| **${yLabels[0] || '..'}** | ${writingLines} | ${writingLines} |\n| **${yLabels[1] || '..'}** | ${writingLines} | ${writingLines} |"
                }
            }
        }`;
        const result = await getModel().generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (e) { res.status(500).json({ error: 'Fout stap 3' }); }
});

// STAP 4: ANTWOORDEN
router.post('/generate-lesson-v2/step4', async (req, res) => {
    try {
        const { concept, sources } = req.body;
        const activeSources = sources.slice(0, 6);
        const sourcesText = activeSources.map((s, i) => `BRON ${i+1}: ${s.title}\n"${(s.content||"").substring(0,600)}..."`).join('\n\n');

        console.log("[A40] 🎬 Stap 4/4: Antwoorden...");
        const prompt = `
        DOEL: Deel 4 - Antwoordmodel.
        BRONNEN: ${sourcesText}

        OUTPUT JSON:
        {
            "sourceAnalyses": [
                { "sourceId": "1", "questions": ["Vraag 1...", "Vraag 2...", "Vraag 3..."], "answers": ["...", "...", "..."] }
            ],
            "reflection": { "questions": ["..."], "answers": ["..."] },
            "filledTables": { 
                "collaboration": "Markdown tabel INGEVULD met antwoorden", 
                "quadrant": "Markdown tabel INGEVULD met bronnummers" 
            }
        }`;
        const result = await getModel().generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (e) { res.status(500).json({ error: 'Fout stap 4' }); }
});

module.exports = router;

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

// --- STAP 1: DOCENT BASIS ---
router.post('/generate-lesson-v2/step1', async (req, res) => {
    try {
        const { concept, sources } = req.body;
        const activeSources = sources.slice(0, 6);
        const sourcesText = activeSources.map((s, i) => `BRON ${i+1}: ${s.title}`).join('\n');

        console.log("[A40] 🎬 Stap 1/4: Docent & Didactiek...");
        const prompt = `
        ROL: Expert geschiedenisdidactiek.
        DOEL: Maak DEEL 1 (Docentenhandleiding).
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
                "lessonGoal": "Kern.",
                "grabBagRationale": "Uitleg.",
                "sourceQuadrant": { "axisX": "...", "axisY": "...", "explanation": "..." }
            }
        }`;
        const result = await getModel().generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (e) { res.status(500).json({ error: 'Fout stap 1' }); }
});

// --- STAP 2: FASEN ---
router.post('/generate-lesson-v2/step2', async (req, res) => {
    try {
        console.log("[A40] 🎬 Stap 2/4: Fasen...");
        const { concept } = req.body;
        const prompt = `MAAK LESFASEN JSON VOOR "${concept.title}": { "phases": [ { "phaseName": "...", "time": "...", "teacherRole": "...", "studentRole": "...", "materials": "..." } ] }`;
        const result = await getModel().generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (e) { res.status(500).json({ error: 'Fout stap 2' }); }
});

// --- STAP 3: LEERLING (TABELLEN MET LIJNTJES) ---
router.post('/generate-lesson-v2/step3', async (req, res) => {
    try {
        const { concept, sources, quadrantContext } = req.body; 
        const activeSources = sources.slice(0, 6);
        const sourcesText = activeSources.map((s, i) => `BRON ${i+1}: ${s.title}`).join('\n');
        
        const axes = quadrantContext || { axisX: "Links <-> Rechts", axisY: "Boven <-> Onder" };
        const xLabels = axes.axisX.split('<->').map(s => s.trim());
        const yLabels = axes.axisY.split('<->').map(s => s.trim());

        console.log("[A40] 🎬 Stap 3/4: Werkblad met schrijflijnen...");
        
        // We maken een variabele voor de schrijflijntjes om de prompt schoon te houden
        const writingLines = "..........................<br><br>..........................<br><br>..........................";

        const prompt = `
        ROL: Expert geschiedenisdidactiek.
        DOEL: Maak het LEERLINGENWERKBLAD voor "${concept.title}".
        BRONNEN: ${sourcesText}
        
        OPDRACHT TABELLEN:
        1. **Samenwerkingstabel:**
           - Rijen: "Bron 1", "Bron 2", etc.
           - Cellen: Gebruik exact deze string voor schrijfruimte: "${writingLines}"
        
        2. **Kwadrant:**
           - Assen: X=${axes.axisX}, Y=${axes.axisY}
           - Cellen: Gebruik exact deze string voor schrijfruimte: "${writingLines}"

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

// --- STAP 4: DIEPTE & ANTWOORDEN (INGEVULD!) ---
router.post('/generate-lesson-v2/step4', async (req, res) => {
    try {
        const { concept, sources } = req.body;
        const activeSources = sources.slice(0, 6);
        const sourcesText = activeSources.map((s, i) => `BRON ${i+1}: ${s.title}\n"${(s.content||"").substring(0,600)}..."`).join('\n\n');

        console.log("[A40] 🎬 Stap 4/4: Antwoorden Genereren...");
        const prompt = `
        DOEL: Deel 4 - VOLLEDIG INGEVULD ANTWOORDMODEL.
        BRONNEN: ${sourcesText}

        EISEN ANTWOORDMODEL:
        1. **Vragen:** Geef per bron 3 vragen + de juiste antwoorden.
        2. **Reflectie:** Geef voorbeeldantwoorden op de reflectievragen.
        3. **Tabellen:** Vul de Samenwerkingstabel en het Kwadrant **VOLLEDIG IN** met de informatie uit de bronnen. GEEN lege plekken, GEEN puntjes. Zet de bronnummers in de juiste vakken.

        OUTPUT JSON:
        {
            "sourceAnalyses": [
                { "sourceId": "1", "questions": ["Vraag 1...", "Vraag 2...", "Vraag 3..."], "answers": ["Antwoord 1...", "Antwoord 2...", "Antwoord 3..."] }
            ],
            "reflection": { "questions": ["..."], "answers": ["..."] },
            "filledTables": { 
                "collaboration": "| Bron | Wie? | Gevoel | Sub | Arg |\n|---|---|---|---|---|\n| 1 | [Persoon] | [Emotie] | [Begrip] | [Uitleg] |", 
                "quadrant": "| | Sub 1 | Sub 2 |\n|---|---|---|\n| Sub 3 | Bron 1, 4 | Bron 2 |\n| Sub 4 | Bron 3 | Bron 5, 6 |" 
            }
        }`;
        const result = await getModel().generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (e) { res.status(500).json({ error: 'Fout stap 4' }); }
});

module.exports = router;

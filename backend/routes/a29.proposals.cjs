const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/propose-lessons', async (req, res) => {
    try {
        const { sources } = req.body;

        if (!sources || sources.length < 2) {
            return res.status(400).json({ error: 'Minimaal 2 bronnen vereist.' });
        }

        // --- DEBUGGING: WAT KOMT ER BINNEN? ---
        console.log('\n--- AI ONTVANGT DEZE BRONNEN ---');
        sources.slice(0, 3).forEach((s, i) => console.log(`${i+1}. ${s.title} (${s.provider})`));
        console.log(`... en nog ${sources.length - 3} andere.`);
        console.log('----------------------------------\n');

        const inputSources = sources.slice(0, 40).map((s, i) => ({
            id: s.id,
            title: s.title,
            content: s.fullText ? s.fullText.substring(0, 600) : (s.description || '').substring(0, 600),
            provider: s.provider
        }));

        const prompt = `
        Je bent een expert in geschiedenisdidactiek.
        
        BRONNENLIJST (Gebruik UITSLUITEND deze bronnen):
        ${JSON.stringify(inputSources)}

        OPDRACHT:
        Maak 3 lesvoorstellen die gebaseerd zijn op DEZE specifieke bronnenlijst. Verzin geen bronnen erbij.
        
        EISEN PER VOORSTEL:
        1. **Titel**: Pakkend, gebaseerd op het thema van de bronnen.
        2. **Hoofdvraag**: Een verbaasde/oordelende leerlingvraag (Presentisme). "Hoezo deden ze...?"
        3. **Leeropbrengst (Rationale)**:
           Gebruik dit exacte formaat:
           [Concrete Sub-dimensie] (Politiek-institutioneel): Uitleg...
           [Concrete Sub-dimensie] (Sociaal-economisch): Uitleg...
           [Concrete Sub-dimensie] (Cultureel-mentaal): Uitleg...
           [Concrete Sub-dimensie] (Individueel): Uitleg...

        4. **Bronnen**: Selecteer ID's uit de aangeleverde lijst.

        OUTPUT (JSON Array):
        [
          {
            "id": 1,
            "title": "...",
            "mainQuestion": "...",
            "rationale": "...",
            "selectedSourceIds": ["..."]
          }
        ]
        `;

        const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-pro";
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        
        res.json(JSON.parse(text));

    } catch (error) {
        console.error('[AI] Fout:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

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

        // Input voorbereiden
        const inputSources = sources.slice(0, 40).map(s => ({
            id: s.id,
            title: s.title,
            content: s.fullText ? s.fullText.substring(0, 600) : (s.description || '').substring(0, 600),
            provider: s.provider
        }));

        const prompt = `
        Je bent een expert in geschiedenisdidactiek.
        
        BRONNEN SET:
        ${JSON.stringify(inputSources)}

        OPDRACHT:
        Ontwikkel exact **3 lesvoorstellen** (concepten).

        !!! CRUCIALE EIS VOOR DE HOOFDVRAAG (LEES DIT GOED) !!!
        De hoofdvraag mag NOOIT over de specifieke bronnen gaan.
        De vraag moet gaan over het **GROTE HISTORISCHE/MORELE THEMA** dat deze bronnen illustreren.
        
        * ❌ FOUT (Te dicht op de bron): "Wat kunnen we leren uit deze brief van Luther?"
        * ❌ FOUT (Te specifiek): "Hoe dacht de schrijver over de aflatenhandel?"
        * ✅ GOED (Helikopterview + Presentisme): "Hoezo luisterden al die mensen naar één monnik die ruzie zocht met de machtige kerk?"
        * ✅ GOED (Helikopterview): "Waarom zou je je leven wagen voor je geloof als je ook gewoon je mond kunt houden?"

        De bronnen zijn slechts het **bewijsmateriaal** om die grote vraag te beantwoorden.

        EISEN PER VOORSTEL:
        
        1. **Titel**: Kort & Thematisch (bijv. "Macht en Geloof", "Protest en Moed").
        
        2. **Presentistische Hoofdvraag**: 
           Een vraag in spreektaal van een 16-jarige. Verbaasd, oordelend, vanuit het NU.
           *Gebruik woorden als "Hoezo", "Waarom", "Echt raar".*

        3. **Leeropbrengst (Rationale)**: 
           Leg uit hoe de bronnen antwoord geven op die grote vraag.
           Gebruik DIT EXACTE FORMAAT (met enters):
           
           [Concrete Sub-dimensie] (Politiek-institutioneel): [Uitleg...]
           [Concrete Sub-dimensie] (Sociaal-economisch): [Uitleg...]
           [Concrete Sub-dimensie] (Cultureel-mentaal): [Uitleg...]
           [Concrete Sub-dimensie] (Individueel): [Uitleg...]

           *Kies sub-dimensies die passen bij het thema (bijv. Propaganda, Honger, Angst, Machtsvertoon).*

        4. **Bronnen**: Selecteer 3 tot 8 bronnen.

        OUTPUT FORMAAT (JSON Array):
        [
          {
            "id": 1,
            "title": "...",
            "mainQuestion": "...",
            "rationale": "Machtsmisbruik (Politiek-institutioneel): Uitleg...\\nArmoede (Sociaal-economisch): Uitleg...",
            "selectedSourceIds": ["..."]
          }
        ]
        Geef alleen JSON.
        `;

        const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-pro";
        // Iets hogere temperatuur (0.65) helpt om los te komen van de letterlijke brontekst
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.65 } 
        });

        const text = result.response.text().replace(/```json|```/g, '').trim();
        res.json(JSON.parse(text));

    } catch (error) {
        console.error('[AI] Fout:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

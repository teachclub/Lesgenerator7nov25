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

        // Input voorbereiden (Max 40)
        const inputSources = sources.slice(0, 40).map(s => ({
            id: s.id,
            title: s.title,
            content: s.fullText ? s.fullText.substring(0, 600) : (s.description || '').substring(0, 600),
            provider: s.provider
        }));

        const prompt = `
        Je bent een expert in geschiedenisdidactiek.
        Doelgroep: Leerlingen (15-17 jaar).

        JOUW TAAK:
        Ontwikkel 3 lesvoorstellen volgens de methode "Het Vreemde Verleden".
        Startpunt = Oordeel/Verwondering vanuit het NU. 
        Eindpunt = Historisch Begrip van het TOEN.

        ---------------------------------------------------------
        VOORBEELD VAN DE JUISTE TOON (Volg dit!):
        
        [
          {
            "id": 1,
            "title": "Gastarbeiders: Mens of Machine?",
            "mainQuestion": "Hoe haal je het in je hoofd om mensen hierheen te halen voor het vuile werk, ze in slechte pensions te stoppen en dan te verwachten dat ze niet meedoen in de samenleving? Dachten ze dat het robots waren?",
            "rationale": "Economische noodzaak (Sociaal-economisch): Bedrijven hadden dringend handjes nodig en dachten alleen aan productie.\\nTijdelijkheid (Cultureel-mentaal): Iedereen (ook de arbeiders zelf) dacht dat het verblijf kort zou zijn, dus integratie leek onnodig.\\nHuisvestingsbeleid (Politiek-institutioneel): De overheid regelde sobere opvang om kosten te drukken.\\nPersoonlijke offers (Individueel): Migranten accepteerden slechte omstandigheden om hun gezin in het thuisland te kunnen onderhouden.",
            "selectedSourceIds": ["bron_a", "bron_b"]
          }
        ]
        ---------------------------------------------------------

        NIEUWE BRONNEN SET:
        ${JSON.stringify(inputSources)}

        EISEN PER VOORSTEL:

        1. **Titel**: Kort & Pakkend.
        
        2. **Presentistische Hoofdvraag**: 
           - Persona: Een moderne 16-jarige leerling.
           - Toon: Verbaasd, oordelend over het *beleid/omstandigheden* (niet over de mensen zelf).
           - VEILIGHEIDSCHECK: Vermijd racisme/xenofobie. Focus op onbegrip over armoede, macht of oneerlijkheid.

        3. **Leeropbrengst (Rationale)**: 
           - Beschrijf 4 historische inzichten.
           - FORMAT: [Concrete Sub-dimensie] (Politiek-institutioneel): [Uitleg...]
             (Enzovoort voor alle 4 dimensies)

        4. **Bronnen**: Selecteer 3 tot 8 bronnen.

        OUTPUT (JSON Array):
        [ { "id": 1, ... }, { "id": 2, ... }, { "id": 3, ... } ]
        Geef alleen JSON.
        `;

        const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-pro";
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6 } 
        });

        const text = result.response.text().replace(/```json|```/g, '').trim();
        res.json(JSON.parse(text));

    } catch (error) {
        console.error('[AI] Fout:', error);
        res.status(500).json({ error: error.message });
    }
});

// DIT IS DE CRUCIALE REGEL DIE MOET KLOPPEN VOOR SERVER.CJS
module.exports = router;

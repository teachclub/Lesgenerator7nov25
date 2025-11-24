const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Flexibel model (standaard 1.5, of 2.5 als ingesteld)
const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-1.5-flash";

router.post('/propose-lessons', async (req, res) => {
  try {
    const { selectedSources, query } = req.body;

    console.log('--- Nieuwe Didactische Request (Tim Huijgen Model) ---');
    console.log('Query:', query);
    console.log('Model:', modelName);

    if (!selectedSources || selectedSources.length === 0) {
        return res.status(400).json({ error: 'Geen bronnen geselecteerd.' });
    }

    // Input inkorten
    const inputSources = selectedSources.map(s => ({
      id: s.id, 
      title: s.title,
      type: s.type,
      content: s.fullText ? s.fullText.substring(0, 350) : (s.description || '').substring(0, 350)
    }));

    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
    Je bent een expert in geschiedenisdidactiek (Havo/Vwo Bovenbouw).
    Je methodiek is "Het Vreemde Verleden" (Tim Huijgen).
    
    KERN VAN DE METHODIEK:
    Een les begint NOOIT met een historische vraag, maar ALTIJD met een "presentistische verwondering" vanuit de leerling.
    De leerling kijkt met de bril van 2025 (individualisme, democratie, internet, mensenrechten) naar het verleden en snapt er niets van.

    THEMA: "${query}" (of wat domineert in de bronnen).

    BRONNEN SET (max 40):
    ${JSON.stringify(inputSources)}

    STIJLGIDS VOOR DE "HOOK" (CRUCIAAL!):
    De hook moet klinken als een verontwaardigde of onbegrijpende 16-jarige. 
    Gebruik woorden als: "gewoon", "toch", "dom", "super", "belachelijk".
    
    GOEDE VOORBEELDEN (GEBRUIK DEZE TOON):
    - "Waarom gingen mensen vrijwillig in van die vieze fabrieken werken als je daar halfdood vandaan kwam?"
    - "Hoe kun je als ouder je kind serieus de fabriek insturen, dat doe je je kind toch niet aan?"
    - "Hoezo hadden vrouwen en homo’s toen bijna geen rechten, dat is toch basis in een normaal land?"
    - "Waarom checkten mensen toen niet gewoon andere bronnen, zoals wij nu doen op internet?"
    - "Hoe kun je na WO I zó dom zijn om weer richting een nieuwe wereldoorlog te gaan, dat foutje maak je toch geen tweede keer?"
    - "Waarom accepteerden Nederlanders de Duitse bezetting, je gaat toch niet 'gewoon door' onder een vijand?"
    - "Als er zoveel welvaart was, waarom bleven er dan toch nog zoveel mensen in armoede hangen?"

    OPDRACHT:
    Ontwikkel exact 3 lesvoorstellen (JSON).

    STRUCTUUR PER LESVOORSTEL:
    1. "title": Pakkende titel.
    2. "targetAudience": "Havo/Vwo Bovenbouw"
    3. "hook": De presentistische leerlingvraag (zie stijlgids).
    4. "rationale": Exact 4 regels uitleg hoe de bronnen dit nuanceren (contextualiseren).
       Format: [Sub-dimensie] ([abstracte dimensie]): [uitleg]
       Gebruik dimensies: Politiek-institutioneel, Sociaal-economisch, Cultureel-mentaal, Individueel.
    5. "selectedSourceIds": Array met 3-8 bron-ID's die bij deze vraag passen.

    OUTPUT FORMAAT (JSON only):
    [
      {
        "title": "...",
        "targetAudience": "Havo/Vwo Bovenbouw",
        "hook": "...", 
        "rationale": "...",
        "selectedSourceIds": ["...", "..."]
      }
    ]
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85 } // Iets hoger gezet voor creativiteit/brutaliteit
    });

    const response = await result.response;
    let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const jsonResponse = JSON.parse(text);
        res.json(jsonResponse);
    } catch (parseError) {
        console.error('JSON Parse fout:', parseError);
        res.json([]); 
    }

  } catch (error) {
    console.error('[AI Proposals] Fout:', error);
    res.status(500).json({ error: 'Kon geen lesvoorstellen genereren.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-1.5-flash";

router.post('/propose-lessons', async (req, res) => {
  try {
    const { selectedSources, query } = req.body;

    if (!selectedSources || selectedSources.length === 0) {
        return res.status(400).json({ error: 'Geen bronnen geselecteerd.' });
    }

    const inputSources = selectedSources.map(s => ({
      id: s.id, 
      title: s.title,
      type: s.type,
      content: (s.fullText || s.content || s.description || '').substring(0, 400)
    }));

    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
    ROL:
    Je bent een expert in geschiedenisdidactiek (Havo/Vwo Bovenbouw) en DE STRENGE PORTIER van de lesinhoud.
    Methode: "Het Vreemde Verleden".

    CONTEXT:
    Thema/KA: "${query}"
    Beschikbare Bronnen: ${inputSources.length}

    BRONNEN SET:
    ${JSON.stringify(inputSources)}

    OPDRACHT:
    Selecteer bronnen en ontwikkel exact 3 lesconcepten (JSON).

    1. DE SELECTIE (De Strenge Portier):
       - **Check 1 (KA Match):** Hoort deze bron écht bij het Kenmerkend Aspect "${query}"? Zo nee -> WEG.
       - **Check 2 (Dimensie Match):** Kan deze bron gebruikt worden om een politiek, sociaal, economisch of cultureel aspect van de hoofdvraag te verklaren? Zo nee -> WEG.
       - **Resultaat:** Kies per concept 12-15 bronnen die deze checks doorstaan.
       - Sorteer op relevantie (Top 5 eerst).

    2. DE HOOFDVRAAG (De 'Bias' Hook):
       - Abstract niveau (boven de bronnen).
       - Vanuit Hindsight Bias of Presentisme.
       - Toon: Verbaasd/Betweterig ("Waarom deden ze niet gewoon...").
       - VERBODEN: "Dom", "Bizar", "Aanvankelijk".

    3. DE RATIONALE (De Verklaring):
       - Leg in 4 regels uit hoe de geselecteerde bronnen antwoord geven vanuit verschillende sub-dimensies.
       - Laat zien dat de bronnen de 'bewijsstukken' zijn voor het gedrag van toen.

    OUTPUT:
    Een JSON-lijst met 3 voorstellen.
    [
      {
        "title": "...",
        "targetAudience": "Havo/Vwo Bovenbouw",
        "hook": "...", 
        "rationale": "...",
        "selectedSourceIds": ["..."]
      }
    ]
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85 }
    });

    const response = await result.response;
    let text = response.text();

    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        text = text.substring(firstBracket, lastBracket + 1);
    }

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

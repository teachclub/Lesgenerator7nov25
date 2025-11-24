const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Hier pakken we jouw custom model, of vallen terug op 1.5
const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-1.5-flash";

router.post('/propose-lessons', async (req, res) => {
  try {
    const { selectedSources, query } = req.body;

    console.log('--- Nieuwe Request op /propose-lessons ---');
    console.log('Query:', query);
    console.log('Gebruikt Model:', modelName);
    console.log('Aantal bronnen:', selectedSources ? selectedSources.length : 0);

    if (!selectedSources || selectedSources.length === 0) {
        return res.status(400).json({ error: 'Geen bronnen geselecteerd.' });
    }

    const inputSources = selectedSources.map(s => ({
      id: s.id, 
      title: s.title,
      type: s.type,
      content: s.fullText ? s.fullText.substring(0, 300) : (s.description || '').substring(0, 300)
    }));

    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Je bent een expert in geschiedenisdidactiek.
      
      OPDRACHT:
      Bedenk 3 unieke, pakkende lesconcepten op basis van de bronnen.
      
      ONDERWERP: "${query}"
      BESCHIKBARE BRONNEN: ${JSON.stringify(inputSources)}

      EISEN PER CONCEPT:
      1. **Selectie (De "Longlist")**: Kies voor elk concept een **RUIME** selectie van bronnen (minimaal 8, bij voorkeur 12-15).
         - Zorg voor variatie: Tekst én Beeld.
         - Kies bronnen die verschillende perspectieven tonen.
         - Het doel is dat de docent zelf de zwakke broeders wegstreept.
      2. **Hook**: Een prikkelende vraag/stelling vanuit het NU (Cognitief Conflict).
      3. **Rationale**: De historische context.

      OUTPUT FORMAAT (JSON Array):
      [
        {
          "title": "...",
          "targetAudience": "...",
          "hook": "...",
          "rationale": "...",
          "selectedSourceIds": ["id1", "id2", "id3", ...] 
        }
      ]
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
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

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-1.5-flash";

router.post('/propose-lessons', async (req, res) => {
  try {
    const { selectedSources, query } = req.body;

    console.log('--- Nieuwe Request (Met Sortering) ---');
    console.log('Totaal bronnen in bakje:', selectedSources.length);

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

    THEMA: "${query}" (of wat domineert in de bronnen).
    AANTAL BESCHIKBARE BRONNEN: ${inputSources.length}

    BRONNEN SET:
    ${JSON.stringify(inputSources)}

    OPDRACHT:
    Ontwikkel exact 3 lesvoorstellen (JSON).

    ESSENTIEEL - DE TRECHTER (LONGLIST):
    Je maakt per concept een **RUIME VOORSELECTIE** (Longlist).
    - Selecteer per concept **MINIMAAL 10 tot 15 bronnen**.
    
    SORTERING (CRUCIAAL):
    Je moet de lijst 'selectedSourceIds' sorteren op RELEVANTIE:
    - Positie 1 t/m 5: De absolute **TOPBRONNEN** die de kern van dit concept vormen.
    - Positie 6+: De aanvullende bronnen (verdieping/differentiatie).
    
    STIJLGIDS VOOR DE "HOOK":
    De hook moet klinken als een verontwaardigde of onbegrijpende 16-jarige (Tim Huijgen methodiek).
    Gebruik woorden als: "gewoon", "toch", "dom", "super", "belachelijk".

    OUTPUT FORMAAT (JSON only):
    [
      {
        "title": "...",
        "targetAudience": "Havo/Vwo Bovenbouw",
        "hook": "...", 
        "rationale": "...",
        "selectedSourceIds": ["id_top1", "id_top2", "id_top3", "id_rest1", "id_rest2", ...]
      }
    ]
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85 }
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

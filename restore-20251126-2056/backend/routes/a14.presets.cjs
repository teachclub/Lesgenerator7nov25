const express = require('express');
const router = express.Router();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let kaTrefwoorden = {};
try { kaTrefwoorden = require('../data/ka-trefwoorden.cjs'); } 
catch (e) { console.error("⚠️ Tabel niet geladen:", e.message); }

function getRandomTerms(array, count) {
    if (!array || array.length === 0) return [];
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

router.post('/search-preset', async (req, res) => {
  // We halen query HIER op, zodat hij beschikbaar is in de hele functie (ook in catch)
  const { query } = req.body; 

  try {
    if (!query) return res.status(400).json({ error: "Geen query" });

    // STAP 1: DETECTIE (KA + Cijfer)
    const kaMatch = query.match(/KA\s?(\d+)/i);
    
    if (kaMatch) {
        const kaCode = `KA${kaMatch[1]}`; // Maakt "KA45"
        
        if (kaTrefwoorden[kaCode]) {
            const selection = getRandomTerms(kaTrefwoorden[kaCode], 6);
            console.log(`[A14] ✅ ${kaCode} herkend! Termen: ${selection.join(', ')}`);
            return res.json({ terms: selection });
        } else {
            console.log(`[A14] ⚠️ ${kaCode} herkend, maar staat niet in de tabel.`);
        }
    }

    // STAP 2: GEMINI FALLBACK
    // Gebruik het model uit de environment variabele, of een veilige fallback
    const modelName = process.env.GEMINI_MODEL_CHIPS || 'gemini-pro'; 
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    console.log(`[A14] 🤖 Gemini (${modelName}) denkt na over: "${query}"`);
    
    const prompt = `Geef 3 historische zoektermen voor: "${query}". JSON: { "terms": [] }`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    
    res.json(JSON.parse(text));

  } catch (error) {
    console.error('[A14] Fout:', error.message);
    // Hier crashte hij eerder omdat 'query' niet bestond in deze scope. Nu wel.
    res.json({ terms: [query || ""] }); 
  }
});

module.exports = router;

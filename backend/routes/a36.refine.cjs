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

router.post('/refine-concept', async (req, res) => {
  try {
    const { currentProposal, feedback, sources } = req.body;

    if (!currentProposal || !feedback || !sources) {
      return res.status(400).json({ error: "Ontbrekende data voor aanpassing." });
    }

    // We sturen alleen de bronnen mee die bij DIT concept horen (om tokens te sparen)
    const relevantSources = sources.filter(s => currentProposal.selectedSourceIds.includes(s.id));
    
    // Fallback: als er geen ID's matchen (zeldzaam), stuur alles mee (max 15)
    const sourcesToUse = relevantSources.length > 0 ? relevantSources : sources.slice(0, 15);

    const sourcesText = sourcesToUse.map(s => `[${s.id}] ${s.title}: ${(s.content || "").substring(0, 300)}...`).join('\n');

    const prompt = `
      ROL: Expert geschiedenisdidactiek.
      DOEL: Pas een bestaand lesconcept aan op basis van feedback van de docent.
      
      HUIDIG CONCEPT:
      Titel: "${currentProposal.title}"
      Hook: "${currentProposal.hook}"
      Rationale: "${currentProposal.rationale}"
      
      FEEDBACK DOCENT:
      "${feedback}"

      BRONNEN SET (Let op: je moet met deze bronnen werken):
      ${sourcesText}

      OPDRACHT:
      Herschrijf de Titel, Hook en Rationale zodat ze voldoen aan de feedback.
      Behoud de JSON structuur. 
      Zorg dat de nieuwe hook nog steeds past bij de "Hindsight Bias" / Verwondering stijl, tenzij de feedback anders zegt.

      OUTPUT (JSON):
      {
        "title": "Nieuwe Titel",
        "targetAudience": "${currentProposal.targetAudience}",
        "hook": "Nieuwe Hook...",
        "rationale": "Nieuwe Rationale...",
        "selectedSourceIds": ${JSON.stringify(currentProposal.selectedSourceIds)} 
      }
      
      Antwoord ALLEEN met JSON.
    `;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_CHIPS || 'gemini-1.5-flash' });

    console.log(`[A36] 🛠️ Concept aanpassen: "${feedback}"`);
    const result = await model.generateContent(prompt);
    const updatedProposal = JSON.parse(cleanJson(result.response.text()));

    res.json(updatedProposal);

  } catch (error) {
    console.error('[A36] ❌ Fout bij aanpassen:', error);
    res.status(500).json({ error: 'Kon concept niet aanpassen.' });
  }
});

module.exports = router;

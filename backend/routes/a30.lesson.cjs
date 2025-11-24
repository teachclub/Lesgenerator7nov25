const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Hier pakken we jouw custom model, of vallen terug op 1.5
const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-1.5-flash";
const model = genAI.getGenerativeModel({ model: modelName });

router.post('/generate-lesson', async (req, res) => {
  try {
    const { concept, sources } = req.body;

    console.log('--- Nieuwe Les Aanvraag ---');
    console.log('Model:', modelName);

    if (!concept || !sources || sources.length === 0) {
      return res.status(400).json({ error: 'Concept en bronnen zijn verplicht' });
    }

    const sourcesText = sources.map((s, i) => `Bron ${i + 1} (${s.title}):\n${s.content}`).join('\n\n');

    const prompt = `
      Je bent een ervaren onderwijsspecialist en didactisch expert.
      Schrijf een volledig, gedetailleerd lesplan in Markdown formaat.
      
      GEKOZEN CONCEPT:
      Pakkende Hook: ${concept.hook}
      Context/Uitleg: ${concept.context}
      
      BESCHIKBARE BRONNEN:
      ${sourcesText}
      
      INSTRUCTIES:
      - Gebruik de hook en context als fundering.
      - Integreer informatie uit de bronnen expliciet.
      - Schrijf in het Nederlands.
      - Gebruik Markdown (koppen, lijsten, vetgedrukt) voor een duidelijke structuur.
      
      GEWENSTE STRUCTUUR:
      # [Pakkende Titel van de Les]
      
      ## Lesinformatie
      * **Doelgroep:** Voortgezet onderwijs (pas niveau aan op basis van inhoud)
      * **Tijdsduur:** 50 minuten
      * **Leerdoelen:** (3-4 concrete doelen)
      
      ## 1. Opening & Hook (5-10 min)
      (Beschrijf hoe de docent de les start met de gegeven hook)
      
      ## 2. Instructie & Kern (15-20 min)
      (De inhoudelijke uitleg, gebruikmakend van de bronnen. Geef aan wat de docent vertelt/doet.)
      
      ## 3. Verwerking & Opdracht (15 min)
      (Een concrete opdracht voor de leerlingen om de stof te verwerken)
      
      ## 4. Afsluiting & Evaluatie (5 min)
      (Hoe wordt de les afgerond en gecontroleerd of doelen zijn behaald?)
    `;

    const result = await model.generateContent(prompt);
    const lessonPlan = result.response.text();

    res.json({ lessonPlan });

  } catch (error) {
    console.error('Fout bij genereren les:', error);
    res.status(500).json({ error: 'Er ging iets mis bij het genereren van de les.' });
  }
});

module.exports = router;

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const MASTERPROMPT_HISTORY = require('../prompts/masterprompt-history.cjs');

const router = express.Router();

const apiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim();
const modelName = (process.env.GEMINI_MODEL_LESSON_V2 || 'gemini-2.5-flash-lite').trim();

let model = null;

if (!apiKey) {
  console.warn('[A40] ⚠️ Geen GOOGLE_API_KEY of GEMINI_API_KEY gezet. /api/generate-lesson-v2/full zal falen.');
} else {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: modelName });
    console.log(`[A40] ✅ Gemini model voor full-lesson geladen: ${modelName}`);
  } catch (err) {
    console.error('[A40] ❌ Fout bij initialiseren Gemini model voor full-lesson:', err);
  }
}

function buildLessonPrompt(concept, sources) {
  const title = concept.title || 'Naamloze les';
  const hook = concept.hook || '';
  const shortSources = (sources || [])
    .slice(0, 8)
    .map((s, idx) => {
      const text = (s.fullText || s.content || s.description || '')
        .replace(/\s+/g, ' ')
        .slice(0, 1200);
      return [
        `Bron ${idx + 1}:`,
        `  Titel: ${s.title || 'Zonder titel'}`,
        `  Provider: ${s.provider || 'Onbekend'}`,
        `  Type: ${s.type || 'UNKNOWN'}`,
        text ? `  Tekst: ${text}` : '  Tekst: (geen tekst beschikbaar)'
      ].join('\n');
    })
    .join('\n\n');

  return `
${MASTERPROMPT_HISTORY}

CONCEPT (door de docent gekozen):
- Titel: "${title}"
- Verwonderingsvraag / hook (leerlingtaal): "${hook}"

BRONNEN (max 8, ingekort):
${shortSources || '(geen bronnen aangeleverd – gebruik dan alleen de conceptinformatie)'}

OPDRACHT AAN JOU ALS MODEL:
Je gaat nu op basis van bovenstaande MASTER-PROMPT, het concept en de bronnen
EEN LESBUNDEL GENEREREN IN JSON, GESCHIKT VOOR HET VRAGEN VAN "HET VREEMDE VERLEDEN".

GEEF UITSLUITEND GELDIGE JSON MET EXACT DEZE STRUCTUUR (GEEN UITLEG ERBUITEN):

{
  "step1": {
    "docentenInstructie": {
      "wat": "korte beschrijving (max 3 zinnen)",
      "hoe": "korte beschrijving (max 4 zinnen)",
      "waarom": "korte beschrijving (max 4 zinnen)"
    },
    "lesPlanning": {
      "tabelMarkdown": "| Fase | Tijd | Activiteit |\\n|---|---|---|\\n..."
    }
  },
  "step2": {
    "hoofdvraag": "presentistische hoofdvraag in leerlingentaal, met oordeel vanuit NU",
    "leerlingInleiding": "inleiding bij de hoofdvraag in 150-250 woorden",
    "kwadrantAsLabels": {
      "X_links": "korte label links",
      "X_rechts": "korte label rechts",
      "Y_boven": "korte label boven",
      "Y_onder": "korte label onder"
    }
  },
  "step3": {
    "bronVragen": [
      {
        "bronNummer": 1,
        "observeren": "vraag 1 in leerlingentaal over wat er letterlijk te zien/te lezen is",
        "interpreteren": "vraag 2 in leerlingentaal over betekenis / bedoeling",
        "hoofdvraagRelatie": "vraag 3 die expliciet koppelt aan de hoofdvraag"
      }
      // eventueel ook voor bron 2, 3, ... als die er zijn
    ],
    "samenwerkingTabelLeeg": "Markdown-tabel (zonder antwoorden) die leerlingen invullen om bronnen te vergelijken",
    "kwadrantLeeg": "Markdown-tabel van het kwadrant met de labels uit step2.kwadrantAsLabels, zonder antwoorden",
    "reflectieOpdracht": "uitgewerkte schrijfopdracht (ca. 100-150 woorden) waarin leerlingen in alledaagse taal terugkeren naar de hoofdvraag en de vier kwadrant-dimensies gebruiken"
  },
  "step4": {
    "samenwerkingTabelIngevuld": "dezelfde tabel als in step3.samenwerkingTabelLeeg, maar nu ingevuld als voorbeeldantwoord",
    "kwadrantIngevuld": "hetzelfde kwadrant als in step3.kwadrantLeeg, maar nu ingevuld met kernwoorden / zinnen per vak",
    "bronAntwoorden": [
      {
        "bronNummer": 1,
        "observerenAntwoord": "korte voorbeeldobservatie",
        "interpreterenAntwoord": "korte voorbeeldinterpretatie",
        "hoofdvraagRelatieAntwoord": "korte uitleg hoe deze bron helpt de hoofdvraag te beantwoorden"
      }
      // opnieuw per bron die in bronVragen is gebruikt
    ]
  }
}

BELANGRIJK:
- Schrijf in het Nederlands.
- Hoofdvraag: altijd impliciet presentistisch en in leerlingentaal (bijv. "Hoe konden mensen ooit...?", "Waarom dachten ze dat dat normaal was?").
- GEEN verwijzingen naar deze instructie of naar de MASTER-PROMPT.
- GEEN uitleg buiten de JSON; alleen de JSON zelf.
`.trim();
}

function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Model gaf geen tekst terug.');
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Kon geen JSON-object vinden in modelantwoord.');
  }

  const jsonString = text.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`JSON parse-fout: ${err.message}. Ruwe JSON: ${jsonString.slice(0, 400)}`);
  }
}

router.post('/generate-lesson-v2/full', async (req, res) => {
  const { concept, sources } = req.body || {};

  if (!concept || !sources || !Array.isArray(sources) || sources.length === 0) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'concept en sources (minimaal 1) zijn verplicht voor generate-lesson-v2/full.'
    });
  }

  if (!model) {
    return res.status(500).json({
      error: 'NO_MODEL',
      message: 'Geen geldig Gemini-model geconfigureerd (check GOOGLE_API_KEY / GEMINI_API_KEY en GEMINI_MODEL_LESSON_V2).'
    });
  }

  try {
    console.log(
      '[A40/full] 🚀 Start full-lesson generatie met',
      sources.length,
      'bronnen. Titel:',
      concept.title || '(geen titel)'
    );

    const prompt = buildLessonPrompt(concept, sources);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const json = extractJsonFromText(text);

    if (!json.step1 || !json.step2 || !json.step3 || !json.step4) {
      throw new Error('Modelantwoord mist één of meer van de velden step1/step2/step3/step4.');
    }

    console.log('[A40/full] ✅ Lesbundel gegenereerd.');
    return res.json(json);
  } catch (err) {
    console.error('[A40/full] ❌ full lesson error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message || 'Onbekende fout in generate-lesson-v2/full'
    });
  }
});

module.exports = router;


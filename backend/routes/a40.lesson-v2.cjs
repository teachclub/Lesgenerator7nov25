// routes/a40.lesson-v2.cjs
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ override: true });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const modelName = process.env.GEMINI_MODEL_CHIPS || 'gemini-1.5-flash';
const model = genAI.getGenerativeModel({ model: modelName });

function buildMasterpromptV4({ tv, ka, concept, sources, tvLabel, kaLabel }) {
  const CONCEPT_JSON = JSON.stringify(concept || {}, null, 2);
  const SOURCES_JSON = JSON.stringify(sources || [], null, 2);

  return `
ROL
Je bent een ervaren docent-ontwikkelaar geschiedenis (bovenbouw havo/vwo) die werkt volgens de didactiek van "Het Vreemde Verleden" (Tim Huijgen). Je doel is het bevorderen van historisch redeneren, multiperspectiviteit en het doorbreken van presentisme. Je schrijft in helder, toegankelijk Nederlands voor 15–18-jarigen.

CONTEXT
- Tijdvak: ${tvLabel || 'onbekend'} (tv=${tv})
- Kenmerkend Aspect: ${kaLabel || 'onbekend'} (ka=${ka})
- Aantal geselecteerde bronnen: ${(sources || []).length}

INPUT – CONCEPT & BRONNEN
- CONCEPT:
${CONCEPT_JSON}

- BRONNEN (JSON):
${SOURCES_JSON}

Let op:
- Elke bron heeft een \`id\`, \`title\`, \`type\`, en tekst (\`fullText\` / \`content\` / \`description\`).
- De \`title\` mag je gebruiken in de bronvragen ("In bron 3, [titel] ...").

DOEL
Maak een complete lesstructuur (JSON) waarin:
1. De presentistische hoofdvraag en hook uit het concept centraal staan.
2. Leerlingen via OBSERVEREN → INTERPRETEREN → RELATIE MET HOOFDVRAAG werken.
3. Het kwadrant context-specifieke subdimensies krijgt.
4. De reflectie expliciet vraagt naar de onderbouwing van de kwadrant-plaatsing.

STRUCTUUR VAN DE OUTPUT (JSON)
Je geeft exact één JSON-object terug. Geen markdown buiten de JSON, geen introductie.

{
  "step1": {
    "docentenInstructie": {
      "wat": "...",
      "hoe": "...",
      "waarom": "..."
    },
    "lesPlanning": {
      "tabelMarkdown": "..."
    }
  },
  "step2": {
    "hoofdvraag": "...",
    "leerlingInleiding": "...",
    "kwadrantAsLabels": {
      "X_links": "...",
      "X_rechts": "...",
      "Y_boven": "...",
      "Y_onder": "..."
    }
  },
  "step3": {
    "bronVragen": [
      {
        "bronNummer": 0,
        "observeren": "...",
        "interpreteren": "...",
        "hoofdvraagRelatie": "..."
      }
    ],
    "samenwerkingTabelLeeg": "...",
    "kwadrantLeeg": "...",
    "reflectieOpdracht": "...",
    "samenwerkingHints": {
      "observaties": ["...", "..."],
      "interpretaties": ["...", "..."],
      "linkHoofdvraag": ["...", "..."]
    },
    "kwadrantBegrippen": ["...", "..."]
  },
  "step4": {
    "samenwerkingTabelIngevuld": "...",
    "kwadrantIngevuld": "...",
    "bronAntwoorden": [
      {
        "bronNummer": 0,
        "observerenAntwoord": "...",
        "interpreterenAntwoord": "...",
        "hoofdvraagRelatieAntwoord": "..."
      }
    ]
  }
}

GEDETAILLEERDE INSTRUCTIES PER STAP

--- STEP 1: DOCENTENINSTRUCTIE ---
- \`docentenInstructie.wat\`: Beschrijf in 2-3 zinnen wat leerlingen inhoudelijk onderzoeken.
- \`docentenInstructie.hoe\`: Beschrijf de didactische route (Start -> Bronnen -> Kwadrant -> Reflectie).
- \`docentenInstructie.waarom\`: Leg uit waarom deze les relevant is voor historisch besef (causaliteit/standplaatsgebondenheid).
- \`lesPlanning.tabelMarkdown\`: Een Markdown-tabel met kolommen: Fase | Duur | Activiteit. (5 fasen: Start, Verkennen, Analyseren, Plenair, Reflectie).

--- STEP 2: LEERLINGEN INTRO ---
- \`hoofdvraag\`: Neem over uit concept (of verbeter licht). Moet presentistisch/prikkelend zijn.
- \`leerlingInleiding\`: Leg in 2-4 alinea's (leerlingtaal) uit waar de les over gaat, wat de historische context is, en benoem het 'vreemde' aspect (presentisme).
- \`kwadrantAsLabels\`: Bepaal labels voor de X- en Y-as.
  - X: Dichtbij vs. Ver van dagelijks leven (of vergelijkbaar).
  - Y: Grote vs. Kleine invloed/verandering (of vergelijkbaar).

--- STEP 3: OPDRACHTEN & HINTS ---

3A. BRONVRAGEN (\`bronVragen\`)
Voor elke bron in de input:
- \`observeren\`: "Wat zie je / lees je precies in bron X?"
- \`interpreteren\`: "Wat betekent dit? Wat zegt de maker hiermee?"
- \`hoofdvraagRelatie\`: "Hoe helpt deze bron bij het beantwoorden van de hoofdvraag?"

3B. TABEL LEEG (\`samenwerkingTabelLeeg\`)
Markdown-tabel. Kolommen: | Groep | Bron(nen) | Belangrijkste observaties | Interpretatie | Link met hoofdvraag |. Laat cellen leeg ("...").

3C. DYNAMISCHE HINTS (\`samenwerkingHints\`)
Genereer invulbegrippen (geen zinnen) voor boven de tabel.
- REGEL VOOR AANTAL: Gebruik het aantal bronnen als richtlijn.
  - Per kolom (observaties, interpretaties, linkHoofdvraag): Maximaal 1 begrip per bron.
  - Absolute limiet: Maximaal 12 begrippen per lijst.
- INHOUD:
  - \`observaties\`: Concrete zichtbare dingen uit de bronnen.
  - \`interpretaties\`: Betekenis, gevoel, belangen.
  - \`linkHoofdvraag\`: Korte koppeling naar het centrale probleem.

3D. KWADRANT (\`kwadrantLeeg\` & \`kwadrantBegrippen\`)
- \`kwadrantBegrippen\`: 6-10 inhoudelijke begrippen die leerlingen in het kwadrant moeten plaatsen.
- \`kwadrantLeeg\`: Markdown-tabel (structuur van een 2x2 matrix of lijst).
  - BELANGRIJK: Gebruik bij de indeling specifieke subdimensies in plaats van alleen generieke termen.
  - Vorm: "Politiek: [Specifieke Context]", "Sociaal: [Specifieke Groep]", etc.

3E. REFLECTIE (\`reflectieOpdracht\`)
Genereer één string met 3 genummerde vragen:
1. Vraag naar de meest opvallende bron/inzicht.
2. Vraag naar de plaatsing in het kwadrant: "Waarom heb je jouw bron bij [Subdimensie X] geplaatst en niet bij een andere? Wat was je motivatie?"
3. Vraag naar een vergelijking met het heden (historische empathie/verschil).

--- STEP 4: ANTWOORDMODELLEN ---

4A. TABEL INGEVULD (\`samenwerkingTabelIngevuld\`)
Vul de tabel uit 3B in met concrete, korte antwoorden (geen "leerlingen zien dat...", maar direct het antwoord).

4B. KWADRANT INGEVULD (\`kwadrantIngevuld\`)
Vul de tabel uit 3D in. Plaats de begrippen logisch bij de subdimensies.

4C. BRON ANTWOORDEN (\`bronAntwoorden\`)
Per bron:
- \`observerenAntwoord\`: Korte opsomming feiten.
- \`interpreterenAntwoord\`: Kern van de boodschap.
- \`hoofdvraagRelatieAntwoord\`: Directe link naar de hoofdvraag.

EINDE PROMPT
`;
}

// Helper: één keer Gemini aanroepen, JSON parsen, hele object teruggeven
async function runGeminiAndParse({ tv, ka, tvLabel, kaLabel, concept, sources }) {
  const prompt = buildMasterpromptV4({
    tv,
    ka,
    tvLabel,
    kaLabel,
    concept,
    sources,
  });

  const result = await model.generateContent(prompt);
  const rawText = result.response.text().trim();

  // Strip eventuele ```json ``` code fences
  let jsonText = rawText;
  const fenceIndex = jsonText.indexOf('```');
  if (fenceIndex !== -1) {
    const firstBrace = jsonText.indexOf('{', fenceIndex);
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('[a40] JSON parse error');
    console.error('rawText begin:', rawText.slice(0, 200));
    console.error('jsonText begin:', jsonText.slice(0, 200));
    throw new Error('Gemini-output kon niet als JSON geparsed worden.');
  }

  return parsed;
}

/**
 * ROOT – healthcheck
 */
router.get('/', (req, res) => {
  res.json({
    ok: true,
    route: 'generate-lesson-v2 root',
    message: 'a40.lesson-v2.cjs is geladen',
  });
});

/**
 * STEP 1 – Docenteninstructie & lesplanning
 */
router.post('/step1', async (req, res) => {
  try {
    const { tv, ka, tvLabel, kaLabel, concept, sources } = req.body || {};

    if (!concept || !sources) {
      return res.status(400).json({
        error: 'concept en sources zijn verplicht voor step1.',
      });
    }

    const parsed = await runGeminiAndParse({
      tv,
      ka,
      tvLabel,
      kaLabel,
      concept,
      sources,
    });

    const step1 = parsed.step1 || parsed;

    return res.json({
      step: 1,
      data: step1,
    });
  } catch (err) {
    console.error('[a40.step1] error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error in /step1',
    });
  }
});

/**
 * STEP 2 – Hoofdvraag, leerlinginleiding & kwadrant-aslabels
 */
router.post('/step2', async (req, res) => {
  try {
    const { tv, ka, tvLabel, kaLabel, concept, sources } = req.body || {};

    if (!concept || !sources) {
      return res.status(400).json({
        error: 'concept en sources zijn verplicht voor step2.',
      });
    }

    const parsed = await runGeminiAndParse({
      tv,
      ka,
      tvLabel,
      kaLabel,
      concept,
      sources,
    });

    const step2 = parsed.step2 || parsed;

    return res.json({
      step: 2,
      data: step2,
    });
  } catch (err) {
    console.error('[a40.step2] error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error in /step2',
    });
  }
});

/**
 * FULL – placeholder (later: alle stappen in één keer)
 */
router.post('/full', async (req, res) => {
  try {
    return res.json({
      status: 'ok',
      message:
        'full-endpoint placeholder – hier komt de volledige Gemini-lesson (step1–4)',
    });
  } catch (err) {
    console.error('[a40.full] error:', err);
    return res.status(500).json({
      error: 'Internal server error in /full',
      details: err.message,
    });
  }
});

module.exports = router;


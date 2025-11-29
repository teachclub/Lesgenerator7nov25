// routes/a40.lesson-v2.cjs
// IMPLEMENTATIE MASTERPLAN: Schema-Gestuurde Architectuur & Poortwachter Validatie
// Met interne opsplitsing van stap 3 (3a/3b) en stap 4 (4a/4b)

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper: Schoon JSON op (verwijdert markdown fences indien aanwezig)
function cleanJson(text) {
  if (!text) return '';
  let clean = text.replace(/```json/gi, '').replace(/```/g, '');
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    clean = clean.substring(first, last + 1);
  }
  return clean.trim();
}

const getModel = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('CRITICAL: GOOGLE_API_KEY ontbreekt in environment.');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL_LESSON_V2 || 'gemini-2.5-flash-lite';
  
  return genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });
};

// --- VALIDATIES & BRON-MAPPING ---

const validateContext = (concept, sources, stepName) => {
  if (!concept) throw new Error(`[${stepName}] Estafette fout: Geen concept ontvangen.`);
  if (!sources || !Array.isArray(sources)) throw new Error(`[${stepName}] Estafette fout: Geen bronnenlijst ontvangen.`);
  if (sources.length === 0) throw new Error(`[${stepName}] Estafette fout: Bronnenlijst is leeg. De AI mag niet hallucineren.`);
};

function mapSourcesForPrompt(sources = []) {
  return sources.map((s, idx) => ({
    id: idx + 1,
    titel: s.title || `Bron ${idx + 1}`,
    inhoud: s.fullText || s.content || '(Geen tekst)'
  }));
}

// Kortere variant voor snippet-gebruik (minder tokens)
function mapSourcesForSnippets(sources = [], maxChars = 600) {
  return sources.map((s, idx) => {
    const raw = s.fullText || s.content || '(Geen tekst)';
    return {
      id: idx + 1,
      titel: s.title || `Bron ${idx + 1}`,
      snippet: raw.slice(0, maxChars)
    };
  });
}

// Centrale Prompt Regels (SSOT component)
const BASE_SYSTEM_PROMPT = `
ROL: Je bent een expert in geschiedenisdidactiek en JSON-constructie.
DOEL: Genereer lesmateriaal strikt volgens het opgegeven JSON-schema.
CONSTRAINT: Gebruik ALLEEN de aangeleverde bronnen. Verzin GEEN feiten.
OUTPUT: Alleen valide JSON.
`;

// -----------------------------------------------------
// STEP 1 – INSTRUCTIE & PLANNING
// -----------------------------------------------------
router.post('/generate-lesson-v2/step1', async (req, res) => {
  try {
    const { concept, sources } = req.body;
    validateContext(concept, sources, 'STEP 1');

    const prompt = `
      ${BASE_SYSTEM_PROMPT}
      
      CONTEXT:
      Concept: ${JSON.stringify(concept)}
      Bronnen: ${JSON.stringify(mapSourcesForPrompt(sources))}

      TAAK:
      Genereer de docenteninstructie en planning in dit exacte JSON formaat:
      {
        "docentenInstructie": {
          "wat": "Korte beschrijving van de kernactiviteit (B2 niveau).",
          "hoe": "Korte beschrijving van de werkvorm en aanpak.",
          "waarom": "Didactische onderbouwing van de meerwaarde."
        },
        "lesPlanning": {
          "tabelMarkdown": "| Fase | Tijd | Activiteit |\\n|---|---|---|\\n..."
        }
      }
    `;

    const model = getModel();
    const result = await model.generateContent(prompt);
    return res.json(JSON.parse(cleanJson(result.response.text())));
  } catch (e) {
    console.error('[Step 1 Error]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------
// STEP 2 – INLEIDING & CONTEXT
// -----------------------------------------------------
router.post('/generate-lesson-v2/step2', async (req, res) => {
  try {
    const { concept } = req.body;
    if (!concept) throw new Error("Step 2 mist concept.");

    const prompt = `
      ${BASE_SYSTEM_PROMPT}
      CONTEXT: ${JSON.stringify(concept)}

      TAAK:
      Genereer de inleiding voor de leerling.
      JSON Formaat:
      {
        "hoofdvraag": "Prikkelende, presentistische hoofdvraag (max 20 woorden).",
        "leerlingInleiding": "Wervende inleiding (80-120 woorden, B1 niveau).",
        "kwadrantAsLabels": {
           "X_links": "Label X-as Links (bijv. Angst)",
           "X_rechts": "Label X-as Rechts (bijv. Hoop)",
           "Y_boven": "Label Y-as Boven (bijv. Macht)",
           "Y_onder": "Label Y-as Onder (bijv. Onmacht)"
        }
      }
      Zorg dat de as-labels echte dilemma's of tegenstellingen zijn.
    `;

    const model = getModel();
    const result = await model.generateContent(prompt);
    return res.json(JSON.parse(cleanJson(result.response.text())));
  } catch (e) {
    console.error('[Step 2 Error]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------
// INTERNAL 3A – VRAGEN PER BRON
// -----------------------------------------------------
async function generateBronVragen(model, concept, sources) {
  const snippets = mapSourcesForSnippets(sources, 600);
  const vragen = [];

  for (const bron of snippets) {
    const prompt = `
      ${BASE_SYSTEM_PROMPT}

      CONTEXT:
      Concept: ${JSON.stringify(concept)}
      Bron:
      {
        "bronNummer": ${bron.id},
        "titel": ${JSON.stringify(bron.titel)},
        "snippet": ${JSON.stringify(bron.snippet)}
      }

      TAAK:
      Maak precies 3 analysevragen voor deze éne bron in onderstaand JSON-formaat:
      {
        "bronNummer": ${bron.id},
        "observeren": "Vraag over wat de leerling letterlijk ziet/leest in deze bron.",
        "interpreteren": "Vraag over de betekenis of bedoeling van deze bron.",
        "hoofdvraagRelatie": "Vraag die expliciet de link legt tussen deze bron en de hoofdvraag van de les."
      }

      Let op:
      - Gebruik B1/B2-taal.
      - Geen antwoorden geven, alleen vragen.
      - Verwijs niet naar andere bronnen.
    `;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(cleanJson(result.response.text()));

    vragen.push({
      bronNummer: parsed.bronNummer || bron.id,
      observeren: parsed.observeren || '',
      interpreteren: parsed.interpreteren || '',
      hoofdvraagRelatie: parsed.hoofdvraagRelatie || ''
    });
  }

  return vragen;
}

// -----------------------------------------------------
// INTERNAL 3B – LEGE TABELLEN + REFLECTIE
// -----------------------------------------------------
async function generateLeerlingWerkblad(model, concept, bronVragen, quadrantContext) {
  const compactVragen = bronVragen.map(v => ({
    bronNummer: v.bronNummer,
    observeren: v.observeren,
    interpreteren: v.interpreteren,
    hoofdvraagRelatie: v.hoofdvraagRelatie
  }));

  const prompt = `
    ${BASE_SYSTEM_PROMPT}

    CONTEXT:
    Concept: ${JSON.stringify(concept)}
    BronVragen: ${JSON.stringify(compactVragen)}
    Assen: ${JSON.stringify(quadrantContext || {})}

    TAAK:
    Genereer uitsluitend:
    - een lege samenwerkingstabel,
    - een leeg kwadrant (2x2),
    - een reflectieopdracht.

    JSON Formaat:
    {
      "samenwerkingTabelLeeg": "| Bron | Wie spreekt? | Kerngevoel | Subdimensie | Verklaring |\\n|---|---|---|---|---|\\n| . | . | . | . | . |",
      "kwadrantLeeg": "Markdown string van een lege 2x2 tabel met de opgegeven assen.",
      "reflectieOpdracht": "Een prikkelende eindopdracht voor leerlingen (100-150 woorden, B1)."
    }

    Richtlijnen:
    - De tabel moet duidelijk maken wat leerlingen moeten invullen, maar nog geen inhoud bevatten.
    - Het kwadrant moet de assenlabels bevatten, maar nog geen bronnummers.
    - De reflectieopdracht verwijst naar de hoofdvraag en het werken met de bronnen.
  `;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(cleanJson(result.response.text()));

  return {
    samenwerkingTabelLeeg: parsed.samenwerkingTabelLeeg || '',
    kwadrantLeeg: parsed.kwadrantLeeg || '',
    reflectieOpdracht: parsed.reflectieOpdracht || ''
  };
}

// -----------------------------------------------------
// STEP 3 – ANALYSE & TABELLEN (3A + 3B)
// -----------------------------------------------------
router.post('/generate-lesson-v2/step3', async (req, res) => {
  try {
    const { concept, sources, quadrantContext } = req.body || {};
    validateContext(concept, sources, 'STEP 3');

    const model = getModel();

    const bronVragen = await generateBronVragen(model, concept, sources);
    const werkblad = await generateLeerlingWerkblad(model, concept, bronVragen, quadrantContext);

    return res.json({
      bronVragen,
      samenwerkingTabelLeeg: werkblad.samenwerkingTabelLeeg,
      kwadrantLeeg: werkblad.kwadrantLeeg,
      reflectieOpdracht: werkblad.reflectieOpdracht
    });
  } catch (e) {
    console.error('[Step 3 Error]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------
// INTERNAL 4A – INGEVULDE TABELLEN (ANTWOORDMODEL)
// -----------------------------------------------------
async function generateIngevuldeTabellen(model, concept, bronVragen) {
  const compactVragen = bronVragen.map(v => ({
    bronNummer: v.bronNummer,
    observeren: v.observeren,
    interpreteren: v.interpreteren,
    hoofdvraagRelatie: v.hoofdvraagRelatie
  }));

  const prompt = `
    ${BASE_SYSTEM_PROMPT}

    CONTEXT:
    Concept: ${JSON.stringify(concept)}
    BronVragen: ${JSON.stringify(compactVragen)}

    TAAK:
    Geef een ingevuld voorbeeld van:
    - een samenwerkingstabel,
    - een kwadrant met bronnummers en heel korte toelichting.

    JSON Formaat:
    {
      "samenwerkingTabelIngevuld": "Markdown tabel met ingevulde voorbeeldantwoorden per bron (1 regel per bron).",
      "kwadrantIngevuld": "Markdown 2x2-tabel met in elk vak de relevante bronnummers en een korte toelichting."
    }

    Richtlijnen:
    - Gebruik alleen de genoemde bronnummers.
    - Antwoorden zijn beknopt, maar inhoudelijk plausibel.
  `;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(cleanJson(result.response.text()));

  return {
    samenwerkingTabelIngevuld: parsed.samenwerkingTabelIngevuld || '',
    kwadrantIngevuld: parsed.kwadrantIngevuld || ''
  };
}

// -----------------------------------------------------
// INTERNAL 4B – RICHTANTWOORDEN PER BRON
// -----------------------------------------------------
async function generateBronAntwoorden(model, concept, bronVragen) {
  const compactVragen = bronVragen.map(v => ({
    bronNummer: v.bronNummer,
    observeren: v.observeren,
    interpreteren: v.interpreteren,
    hoofdvraagRelatie: v.hoofdvraagRelatie
  }));

  const prompt = `
    ${BASE_SYSTEM_PROMPT}

    CONTEXT:
    Concept: ${JSON.stringify(concept)}
    BronVragen: ${JSON.stringify(compactVragen)}

    TAAK:
    Geef per bron korte richtantwoorden in dit JSON-formaat:
    {
      "bronAntwoorden": [
        {
          "bronNummer": 1,
          "observerenAntwoord": "Korte beschrijving van wat de leerling idealiter waarneemt.",
          "interpreterenAntwoord": "Korte uitleg van de betekenis/context.",
          "hoofdvraagRelatieAntwoord": "Hoe draagt deze bron bij aan het beantwoorden van de hoofdvraag?"
        }
        // voor alle bronnummers die in BronVragen voorkomen
      ]
    }

    Richtlijnen:
    - Antwoorden zijn kort (2-3 zinnen), B2 niveau.
    - Gebruik alleen info die plausibel is op basis van de bronvragen (geen nieuwe feiten uit de lucht grijpen).
  `;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(cleanJson(result.response.text()));

  const list = parsed.bronAntwoorden || [];
  return list.map(item => ({
    bronNummer: item.bronNummer,
    observerenAntwoord: item.observerenAntwoord || '',
    interpreterenAntwoord: item.interpreterenAntwoord || '',
    hoofdvraagRelatieAntwoord: item.hoofdvraagRelatieAntwoord || ''
  }));
}

// -----------------------------------------------------
// STEP 4 – ANTWOORDMODEL (4A + 4B)
// -----------------------------------------------------
router.post('/generate-lesson-v2/step4', async (req, res) => {
  try {
    const { concept, sources, bronVragen } = req.body || {};
    validateContext(concept, sources, 'STEP 4');

    const model = getModel();

    // Als bronVragen niet expliciet zijn meegestuurd, genereer ze opnieuw
    const vragen = bronVragen && Array.isArray(bronVragen) && bronVragen.length > 0
      ? bronVragen
      : await generateBronVragen(model, concept, sources);

    const tabellen = await generateIngevuldeTabellen(model, concept, vragen);
    const antwoorden = await generateBronAntwoorden(model, concept, vragen);

    return res.json({
      samenwerkingTabelIngevuld: tabellen.samenwerkingTabelIngevuld,
      kwadrantIngevuld: tabellen.kwadrantIngevuld,
      bronAntwoorden: antwoorden
    });
  } catch (e) {
    console.error('[Step 4 Error]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;


// routes/a40.lesson-v2.cjs
// Lessy 2000 – STRICT MODE: Dwingende Markdown-sjablonen voor tabellen en kwadranten

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Helper om AI-tekst schoon te maken zodat JSON.parse minder snel crasht
function cleanJson(text) {
  if (!text || typeof text !== 'string') return '';

  let clean = text.trim();

  // 1. Strip ```json ... ``` of ``` ... ```
  if (clean.startsWith('```')) {
    clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  // 2. Pak alleen van eerste { tot laatste }
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    clean = clean.substring(first, last + 1);
  }

  // 3. Foute escapes: "\|" -> "|"
  clean = clean.replace(/\\\|/g, '|');

  // 4. Weg met rare control characters (< 0x20 behalve \n\r\t)
  clean = clean.replace(/[\u0000-\u0019]/g, (c) => {
    if (c === '\n' || c === '\r' || c === '\t') return c;
    return ' ';
  });

  return clean.trim();
}

// 1 centrale model-helper, zodat hij met jouw env-vars werkt
const getModel = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY ontbreekt in environment.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Volgorde: LESSON → GENERATE → PROPOSALS → CHIPS → fallback
  const modelName =
    process.env.GEMINI_MODEL_LESSON ||
    process.env.GEMINI_MODEL_GENERATE ||
    process.env.GEMINI_MODEL_PROPOSALS ||
    process.env.GEMINI_MODEL_CHIPS ||
    'gemini-2.5-flash-lite';

  console.log('[A40] ▶ Gebruik lesmodel:', modelName);

  return genAI.getGenerativeModel({ model: modelName });
};

// DE HARDE REGELS (Worden boven elke prompt geplakt)
const BASE_RULES = `
JE ROL:
- Je bent LESSY 2000, een vakcollega geschiedenis.
- Je werkt strikt volgens de instructies hieronder.

BRONVEILIGHEID (CRUCIAAL):
- De bronnen zijn HEILIG. Je mag de brontekst NIET wijzigen, samenvatten of herschrijven.
- Je mag GEEN nieuwe feiten toevoegen die niet in de bron staan.
- Baseer je antwoorden 100% op de aangeleverde bronteksten.

CONSISTENTIE:
- Verwijs alleen naar bestaande bronnummers.
- Als een bronnummer niet bestaat:
  - Vul GEEN verzonnen bron in.
  - Zet validation.status = "error" met een duidelijke melding.
- Anders validation.status = "ok".

STRUCTUUR:
- Lever ALTIJD geldige JSON.
- Voor tabellen en kwadranten MOET je de opgegeven Markdown-structuur letterlijk overnemen.
- GEEN uitleg eromheen, GEEN markdown-fences (\`\`\`), GEEN platte tekst buiten de JSON.
`;

// Eén plek waar we AI-output → JSON → response doen
function respondWithJsonFromModel(res, rawText, contextLabel) {
  try {
    const cleaned = cleanJson(rawText);
    const parsed = JSON.parse(cleaned);
    return res.json(parsed);
  } catch (err) {
    console.error(`[A40] JSON parse-fout bij ${contextLabel}:`, err);
    console.error('[A40] Ruwe AI-tekst was:\n', rawText);
    return res.status(500).json({
      error: 'AI_JSON_PARSE_ERROR',
      step: contextLabel,
      message: 'De AI-output kon niet als geldige JSON gelezen worden.',
    });
  }
}

// Bronnen mappen naar iets wat in de prompt leesbaar is
function mapSourcesForPrompt(sources = []) {
  return sources.map((s, idx) => ({
    id: s.id || String(idx + 1),
    number: idx + 1,
    title: s.title || `Bron ${idx + 1}`,
    content: s.fullText || s.content || '',
  }));
}

// --- STAP 1: Docent & Planning ---
router.post('/generate-lesson-v2/step1', async (req, res) => {
  try {
    const { concept, sources } = req.body || {};
    if (!concept) return res.status(400).json({ error: 'concept ontbreekt' });

    const prompt = `${BASE_RULES}
TAKENTAAL STAP 1 – DOCENTENINSTRUCTIE & PLANNING
CONCEPT: ${JSON.stringify(concept)}
BRONNEN (titels): ${JSON.stringify(
      mapSourcesForPrompt(sources).map((b) => ({ number: b.number, title: b.title }))
    )}

TAAK:
Maak JSON met:
1. "docentenInstructie": {
     "wat": string,
     "hoe": string,
     "waarom": string
   }
2. "lesPlanning": {
     "tabelMarkdown": string
   }

Regels voor de lesPlanning-tabel:
- Gebruik voor de tabel EXACT deze kop (in Markdown):

  | Fase | Tijd | Doel | Wat doet de docent? | Wat doen de leerlingen? | Materialen |
  |---|---|---|---|---|---|

- Voeg daarna voor elke fase (bijv. Start, Verkenning, Verdieping, Afsluiting) één rij toe.

TECHNIEK:
- Lever ALLEEN geldige JSON terug, GEEN tekst eromheen.
`;

    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    return respondWithJsonFromModel(res, result.response.text(), 'step1');
  } catch (e) {
    console.error('[A40] Fout step1:', e);
    return res.status(500).json({ error: e.message || 'Fout in step1' });
  }
});

// --- STAP 2: Inleiding & Dimensies (CONCRETE LABELS) ---
router.post('/generate-lesson-v2/step2', async (req, res) => {
  try {
    const { concept } = req.body || {};
    if (!concept) return res.status(400).json({ error: 'concept ontbreekt' });

    const prompt = `${BASE_RULES}
TAKENTAAL STAP 2 – INLEIDING & DIMENSIES
CONCEPT: ${JSON.stringify(concept)}

BELANGRIJK VOOR HET KWADRANT:
- Gebruik GEEN abstracte containerbegrippen (zoals "Economisch" of "Politiek") als as-labels.
- Gebruik CONCRETE, inhoudelijke subdimensies die een dilemma vormen.
- Voorbeeld GOED: "Geopolitieke rivaliteit" vs "Vreedzaam protest".
- Voorbeeld FOUT: "Politiek" vs "Sociaal".

TAAK:
Maak JSON met:
{
  "leerlingInleiding": string,  // 80–120 woorden, pakkend, B1
  "hoofdvraag": string,        // presentistisch, max 20 woorden
  "kernDimensies": [ string ], // bijv. ["politiek", "sociaal-economisch"]
  "subDimensies": [ string ],  // concretere labels
  "kwadrantAsLabels": {
    "X_links": string,
    "X_rechts": string,
    "Y_boven": string,
    "Y_onder": string
  }
}

TECHNIEK:
- Alleen geldige JSON, GEEN omringende tekst.
`;

    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    return respondWithJsonFromModel(res, result.response.text(), 'step2');
  } catch (e) {
    console.error('[A40] Fout step2:', e);
    return res.status(500).json({ error: e.message || 'Fout in step2' });
  }
});

// --- STAP 3: Werkblad (STRENGE TABEL FORMATTING) ---
router.post('/generate-lesson-v2/step3', async (req, res) => {
  try {
    const { concept, sources, quadrantContext } = req.body || {};
    if (!concept || !sources) return res.status(400).json({ error: 'data ontbreekt' });

    const mapped = mapSourcesForPrompt(sources);
    const axes = quadrantContext || {
      X_links: 'Links',
      X_rechts: 'Rechts',
      Y_boven: 'Boven',
      Y_onder: 'Onder',
    };

    const prompt = `${BASE_RULES}
TAKENTAAL STAP 3 – WERKBLAD TABELLEN
CONCEPT: ${JSON.stringify(concept)}
BRONNEN: ${JSON.stringify(mapped)}
KWADRANT-ASSEN: ${JSON.stringify(axes)}

JE MOET JE HOUDEN AAN DEZE EXACTE MARKDOWN-FORMATS VOOR DE TABELLEN.
WIJK NIET AF VAN DE KOLOMMEN.

TAAK 1: Vragen per bron (JSON Array)
- Maak voor elke bron 3 vragen:
  - "observeren" (wat zie je / lees je concreet?)
  - "interpreteren" (wat betekent dat in context?)
  - "hoofdvraagRelatie" (hoe helpt dat de hoofdvraag te beantwoorden?)

TAAK 2: Samenwerkingstabel (Markdown String)
- Gebruik EXACT deze kopregel en laat de rijen LEGEN (met puntjes):

| Bron | Wie spreekt? | Kerngevoel / overtuiging | Gekozen subdimensie | Twee verklaringen (kort) |
|---|---|---|---|---|
| 1 | ... | ... | ... | ... |

- Voeg voor iedere bron een eigen rij toe, met alleen "..." als placeholders.

TAAK 3: Kwadrant (Markdown String)
- Maak een 2x2 tabel met EXACT deze indeling. Zet de as-labels op de juiste plek:

| | **${axes.X_links}** | **${axes.X_rechts}** |
|---|---|---|
| **${axes.Y_boven}** | ... | ... |
| **${axes.Y_onder}** | ... | ... |

TAAK 4: Reflectieopdracht (String)
- Korte opdracht in leerlingtaal (3–4 zinnen) waarin ze hun positie in het kwadrant moeten verantwoorden.

OUTPUT JSON (ENKEL DIT!):
{
  "bronVragen": [
    {
      "bronNummer": number,
      "observerenVraag": string,
      "interpreterenVraag": string,
      "hoofdvraagRelatieVraag": string
    }
  ],
  "samenwerkingTabelLeeg": "MARKDOWN_STRING",
  "kwadrantLeeg": "MARKDOWN_STRING",
  "reflectieOpdracht": string,
  "validation": { "status": "ok", "message": "" }
}
`;

    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    return respondWithJsonFromModel(res, result.response.text(), 'step3');
  } catch (e) {
    console.error('[A40] Fout step3:', e);
    return res.status(500).json({ error: e.message || 'Fout in step3' });
  }
});

// --- STAP 4: Antwoordmodel (STRENGE TABEL FORMATTING) ---
router.post('/generate-lesson-v2/step4', async (req, res) => {
  try {
    const { concept, sources } = req.body || {};
    if (!concept || !sources) return res.status(400).json({ error: 'data ontbreekt' });

    const mapped = mapSourcesForPrompt(sources);

    const prompt = `${BASE_RULES}
TAKENTAAL STAP 4 – ANTWOORDMODEL
CONCEPT: ${JSON.stringify(concept)}
BRONNEN: ${JSON.stringify(mapped)}

JE MOET JE HOUDEN AAN DEZE EXACTE MARKDOWN-FORMATS VOOR DE TABELLEN.

TAAK 1: Antwoorden per bron (JSON Array)
- Richtantwoorden per bron met velden:
  - "bronNummer"
  - "observerenAntwoord"
  - "interpreterenAntwoord"
  - "hoofdvraagRelatieAntwoord"
  - "stereotyperingAnalyseAntwoord"

TAAK 2: Ingevulde Samenwerkingstabel (Markdown String)
- Vul de tabel in met 1 regel per bron. Gebruik DEZE kopregel:

| Bron | Wie spreekt? | Kerngevoel / overtuiging | Gekozen subdimensie | Twee verklaringen (kort) |
|---|---|---|---|---|

- Elke rij bevat een korte samenvatting in leerlingtaal.

TAAK 3: Ingevuld Kwadrant (Markdown String)
- Vul het kwadrant in. Per vakje:
  - Noem de relevante bronnummers.
  - Voeg 1 korte zin motivatie toe.

Structuur:

| | **[As Links]** | **[As Rechts]** |
|---|---|---|
| **[As Boven]** | (Bron nrs en korte uitleg) | (Bron nrs en korte uitleg) |
| **[As Onder]** | (Bron nrs en korte uitleg) | (Bron nrs en korte uitleg) |

TAAK 4: Reflectie Antwoorden (Array)
- 2–4 voorbeeldantwoorden op de reflectieopdracht, in leerlingtaal.

OUTPUT JSON (ENKEL DIT!):
{
  "bronAntwoorden": [...],
  "samenwerkingTabelIngevuld": "MARKDOWN_STRING",
  "kwadrantIngevuld": "MARKDOWN_STRING",
  "reflectieAntwoorden": [...],
  "validation": { "status": "ok", "message": "" }
}
`;

    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    return respondWithJsonFromModel(res, result.response.text(), 'step4');
  } catch (e) {
    console.error('[A40] Fout step4:', e);
    return res.status(500).json({ error: e.message || 'Fout in step4' });
  }
});

module.exports = router;


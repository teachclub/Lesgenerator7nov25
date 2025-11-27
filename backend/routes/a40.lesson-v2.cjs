// routes/a40.lesson-v2.cjs
// Lessy 2000 – viertraps lesgenerator met strakke guardrails voor Gemini

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Kleine helper om ```json fences weg te strippen
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
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY ontbreekt in environment.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL_CHIPS || 'gemini-2.5-flash-lite';
  return genAI.getGenerativeModel({ model: modelName });
};

// Centrale “AI handboei” – dit komt boven elke stap-prompt
const BASE_RULES = `
JE ROL:
- Je bent LESSY 2000, een vakcollega geschiedenis.
- Je werkt strikt volgens de instructies hieronder.

BRONVEILIGHEID (HEEL BELANGRIJK):
- De bronnen worden buiten jou om gegenereerd uit CSV en KLEIO.
- Je mag de brontekst NIET wijzigen, samenvatten of herschrijven.
- Je mag GEEN nieuwe feiten toevoegen die niet in de bron staan.
- Alle vragen, analyses en antwoorden moeten herleidbaar zijn tot de brontekst.
- Als je iets niet zeker weet op basis van de bron, zeg dan expliciet dat je het niet weet.

CONSISTENTIE & REFERENTIES:
- Je mag alleen verwijzen naar bronnummers die in de aangeleverde lijst bestaan.
- Maak NOOIT zelf extra bronnummers, geen “Bron 9” als er maar 8 zijn.
- Als je merkt dat je een bronnummer nodig hebt dat niet bestaat, DOE DAN HET VOLGENDE:
  - Vul GEEN verzonnen bron in.
  - Zet in het veld validation.status = "error".
  - Zet in validation.message een korte uitleg in het Nederlands, bijvoorbeeld:
    "Hey, de verwijzing naar Bron 9 klopt niet, er zijn maar 8 bronnen."
- Als alles consistent is, zet validation.status = "ok".

STRUCTUUR:
- Hou je exact aan de gevraagde JSON-structuur.
- Geen HTML, geen <br>, alleen platte tekst en Markdown-tabellen.
- Gebruik leerlingtaal B1 in leerlingdelen en professionele docententaal in docentenonderdelen.
`;

// Helper om veilig JSON te parsen en bij fouten een nette 500 terug te geven
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
      message:
        'De AI-output kon niet als geldige JSON gelezen worden. Zie backend-log voor details.',
    });
  }
}

// Klein hulpfunctie om bronnen compacter te sturen (geen onnodige velden)
function mapSourcesForPrompt(sources = []) {
  return sources.map((s, idx) => ({
    id: s.id || String(idx + 1),
    number: idx + 1,
    title: s.title || `Bron ${idx + 1}`,
    provider: s.provider || '',
    content: s.fullText || s.content || '',
  }));
}

/**
 * STAP 1 – Docenteninstructie + Didactiek (WAT / HOE / WAAROM)
 */
router.post('/generate-lesson-v2/step1', async (req, res) => {
  console.log('[A40] ▶ step1 hit met keys:', Object.keys(req.body || {}));

  try {
    const { concept, sources } = req.body || {};
    if (!concept) {
      console.warn('[A40] step1: concept ontbreekt in body');
      return res.status(400).json({ error: 'concept ontbreekt in body' });
    }

    const prompt = `${BASE_RULES}

TAKENTAAL STAP 1 – DOCENTENINSTRUCTIE & LESPLANNING

CONCEPT (samenvatting van de les/hoofdvraag):
${JSON.stringify(concept, null, 2)}

KORTE INFO OVER AANGELEVERDE BRONNEN (alleen titels en nummers, GEEN tekst):
${JSON.stringify(
  mapSourcesForPrompt(sources).map((b) => ({
    number: b.number,
    id: b.id,
    title: b.title,
  })),
  null,
  2
)}

JE TAAK IN DEZE STAP:
- Maak ALLEEN de DOCENTENVERSIE-basis:
  1. docentenInstructie:
     - wat (WAT gaan we doen?)
     - hoe (HOE gaan we dat doen? werkvormen, tijdsindeling)
     - waarom (WAAROM is dit didactisch en historisch belangrijk?)
  2. lesPlanning:
     - een tabel met fasen: Fase, Tijd, Doel, Wat doet de docent, Wat doen de leerlingen, Materialen

FORMAT (ALTIJD JSON):

{
  "docentenInstructie": {
    "wat": "…",
    "hoe": "…",
    "waarom": "…"
  },
  "lesPlanning": {
    "tabelMarkdown": "| Fase | Tijd | Doel | Wat doet de docent? | Wat doen de leerlingen? | Materialen |\\n| --- | --- | --- | --- | --- | --- |\\n| ... | ... | ... | ... | ... | ... |"
  },
  "validation": {
    "status": "ok" | "error",
    "message": "uitleg als er iets mis is (bijv. ontbrekende info)"
  }
}

- Gebruik GEEN broninhoud in deze stap.
- Als je een probleem ziet (bijv. concept mist cruciale info), zet validation.status = "error" en leg het kort uit.
`;

    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = result.response.text();
    return respondWithJsonFromModel(res, text, 'step1');
  } catch (e) {
    console.error('[A40] Fout in step1:', e);
    return res.status(500).json({
      error: 'STEP1_ERROR',
      message: String(e.message || e),
    });
  }
});

/**
 * STAP 2 – Leerlinginleiding + Hoofdvraag + Dimensie-keuze
 */
router.post('/generate-lesson-v2/step2', async (req, res) => {
  console.log('[A40] ▶ step2 hit met keys:', Object.keys(req.body || {}));

  try {
    const { concept } = req.body || {};
    if (!concept) {
      console.warn('[A40] step2: concept ontbreekt in body');
      return res.status(400).json({ error: 'concept ontbreekt in body' });
    }

    const prompt = `${BASE_RULES}

TAKENTAAL STAP 2 – LEERLINGENTRY + HOOFDVRAAG + DIMENSIES

CONCEPT:
${JSON.stringify(concept, null, 2)}

JE TAAK:
- Maak nog GEEN vragen per bron.
- Genereer alleen:
  1. "leerlingInleiding": 80–120 woorden in B1-leerlingtaal (geen uitleg over "presentisme", wel nieuwsgierig makend).
  2. "hoofdvraag": max. 20 woorden, in leerlingentaal, met een oordelende "nu-bril" (presentistische startvraag).
  3. "kernDimensies": lijst van maximaal 4 hoofddimensies (ECO, SOC, POL, RUI, CHR) die bij dit onderwerp passen.
  4. "subDimensies": lijst van 4 subdimensies, concretere invulling van die hoofddimensies.
  5. "kwadrantAsLabels": labels (max. 3 woorden) voor X_links, X_rechts, Y_boven, Y_onder, gebaseerd op de gekozen dimensies.

FORMAT (ALTIJD JSON):

{
  "leerlingInleiding": "…",
  "hoofdvraag": "…",
  "kernDimensies": ["ECO", "SOC"],
  "subDimensies": ["werkloosheid & crisis", "propaganda & vijandbeeld", "…", "…"],
  "kwadrantAsLabels": {
    "X_links": "…",
    "X_rechts": "…",
    "Y_boven": "…",
    "Y_onder": "…"
  },
  "validation": {
    "status": "ok" | "error",
    "message": "…"
  }
}

REGELS:
- Geen broninhoud gebruiken (dat komt in een volgende stap).
- Labels maximaal 3 woorden, B1-leerlingentaal.
`;

    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = result.response.text();
    return respondWithJsonFromModel(res, text, 'step2');
  } catch (e) {
    console.error('[A40] Fout in step2:', e);
    return res.status(500).json({
      error: 'STEP2_ERROR',
      message: String(e.message || e),
    });
  }
});

/**
 * STAP 3 – Leerlingwerkblad:
 * - 3 vragen per bron
 * - Lege samenwerkingstabel
 * - Leeg kwadrant (met labels uit stap 2)
 */
router.post('/generate-lesson-v2/step3', async (req, res) => {
  console.log('[A40] ▶ step3 hit met keys:', Object.keys(req.body || {}));

  try {
    const { concept, sources, quadrantContext } = req.body || {};
    if (!concept || !sources || !Array.isArray(sources) || sources.length === 0) {
      console.warn('[A40] step3: concept en/of sources ontbreken');
      return res
        .status(400)
        .json({ error: 'concept en sources zijn verplicht in step3' });
    }

    const mapped = mapSourcesForPrompt(sources);
    const axes = quadrantContext || {
      X_links: '…',
      X_rechts: '…',
      Y_boven: '…',
      Y_onder: '…',
    };

    const prompt = `${BASE_RULES}

TAKENTAAL STAP 3 – LEERLINGWERKBLAD (VRAGEN + LEGE TABELLEN)

CONCEPT:
${JSON.stringify(concept, null, 2)}

BRONNEN (je mag alleen LEZEN, niet veranderen):
${JSON.stringify(
  mapped.map((b) => ({
    number: b.number,
    id: b.id,
    title: b.title,
    content: b.content,
  })),
  null,
  2
)}

ASSEN VOOR HET KWADRANT (UIT STAP 2):
${JSON.stringify(axes, null, 2)}

JE TAAK:
1. Maak per bron drie vragen:
   - "observeren": wat zie/lees je concreet? (feitelijk, detailgericht)
   - "interpreteren": bedoeling/motief/perspectief (op basis van de tekst)
   - "hoofdvraagRelatie": hoe helpt deze bron om de hoofdvraag te beantwoorden? (minimaal 1 oorzaak/mechanisme)
   Indien de bron stereotyperend of discriminerend is, voeg een vierde vraag toe "stereotyperingAnalyse".
2. Maak een lege samenwerkingstabel in Markdown met exact deze kopregel:

| Bron | Wie spreekt? | Kerngevoel / overtuiging | Gekozen subdimensie | Twee verklaringen (kort) |
| --- | --- | --- | --- | --- |
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |
| 3 | ... | ... | ... | ... |
| 4 | ... | ... | ... | ... |
| 5 | ... | ... | ... | ... |
| 6 | ... | ... | ... | ... |
| 7 | ... | ... | ... | ... |
| 8 | ... | ... | ... | ... |

3. Maak een leeg 2×2-kwadrant met de labels uit quadrantContext:

|  | **${axes.X_links || '[X_links]'}** | **${axes.X_rechts || '[X_rechts]'}** |
| --- | --- | --- |
| **${axes.Y_boven || '[Y_boven]'}** | ... | ... |
| **${axes.Y_onder || '[Y_onder]'}** | ... | ... |

4. Voeg onder het kwadrant één reflectie-opdracht toe voor leerlingen:

"Opdracht kwadrant:
1. Kies het kwadrant dat volgens jou het meest helpt om de hoofdvraag te verklaren en leg uit met twee bronnummers.
2. Verplaats daarna één bron naar een ander kwadrant en geef een tegenargument: wat verandert er aan je conclusie?"

FORMAT (ALTIJD JSON):

{
  "bronVragen": [
    {
      "bronNummer": 1,
      "observeren": "…",
      "interpreteren": "…",
      "hoofdvraagRelatie": "…",
      "stereotyperingAnalyse": "…" (optioneel, alleen indien nodig)
    }
  ],
  "samenwerkingTabelLeeg": "MARKDOWN-TABEL HIER",
  "kwadrantLeeg": "MARKDOWN-TABEL HIER",
  "reflectieOpdracht": "…",
  "validation": {
    "status": "ok" | "error",
    "message": "bijv. 'Hey, de verwijzing naar Bron 9 klopt niet, er zijn maar 8 bronnen.'"
  }
}

REGELS:
- Je mag GEEN brontekst veranderen.
- Verwijs alleen naar bestaande bronnummers (1 t/m ${mapped.length}).
- Als je merkt dat je buiten deze range gaat, zet validation.status = "error" en beschrijf het probleem.
`;

    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = result.response.text();
    return respondWithJsonFromModel(res, text, 'step3');
  } catch (e) {
    console.error('[A40] Fout in step3:', e);
    return res.status(500).json({
      error: 'STEP3_ERROR',
      message: String(e.message || e),
    });
  }
});

/**
 * STAP 4 – Antwoordmodel (docent)
 */
router.post('/generate-lesson-v2/step4', async (req, res) => {
  console.log('[A40] ▶ step4 hit met keys:', Object.keys(req.body || {}));

  try {
    const { concept, sources } = req.body || {};
    if (!concept || !sources || !Array.isArray(sources) || sources.length === 0) {
      console.warn('[A40] step4: concept en/of sources ontbreken');
      return res
        .status(400)
        .json({ error: 'concept en sources zijn verplicht in step4' });
    }

    const mapped = mapSourcesForPrompt(sources);

    const prompt = `${BASE_RULES}

TAKENTAAL STAP 4 – ANTWOORDMODEL (DOCENT)

CONCEPT:
${JSON.stringify(concept, null, 2)}

BRONNEN (alleen lezen, niet veranderen):
${JSON.stringify(
  mapped.map((b) => ({
    number: b.number,
    id: b.id,
    title: b.title,
    content: b.content,
  })),
  null,
  2
)}

JE TAAK:
1. Maak per bron richtantwoorden:
   "observerenAntwoord", "interpreterenAntwoord", "hoofdvraagRelatieAntwoord",
   en indien relevant "stereotyperingAnalyseAntwoord".
2. Maak een ingevulde samenwerkingstabel (zelfde kop als in step3) met 1 regel per bron.
3. Maak een ingevuld 2×2-kwadrant met:
   - lijstje bronnummers per vak
   - per vak 1 korte motivatiezin.
4. Geef voorbeeldantwoorden voor de reflectie (max. 2–3 zinnen per reflectiepunt).

FORMAT (ALTIJD JSON):

{
  "bronAntwoorden": [
    {
      "bronNummer": 1,
      "observerenAntwoord": "…",
      "interpreterenAntwoord": "…",
      "hoofdvraagRelatieAntwoord": "…",
      "stereotyperingAnalyseAntwoord": "…" (optioneel)
    }
  ],
  "samenwerkingTabelIngevuld": "MARKDOWN-TABEL HIER",
  "kwadrantIngevuld": "MARKDOWN-TABEL HIER",
  "reflectieAntwoorden": [
    "…",
    "…",
    "…"
  ],
  "validation": {
    "status": "ok" | "error",
    "message": "…"
  }
}

REGELS:
- Gebruik alleen bestaande bronnummers 1 t/m ${mapped.length}.
- Als een verwijzing niet klopt, zet validation.status = "error" en leg uit wat er mis is.
- Verzin GEEN extra broninhoud; alles moet te herleiden zijn tot de aangeleverde content.
`;

    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = result.response.text();
    return respondWithJsonFromModel(res, text, 'step4');
  } catch (e) {
    console.error('[A40] Fout in step4:', e);
    return res.status(500).json({
      error: 'STEP4_ERROR',
      message: String(e.message || e),
    });
  }
});

module.exports = router;


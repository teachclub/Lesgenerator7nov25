// routes/a40.lesson-v2.cjs
// Lesgenerator v2 – 4 stappen (docent, leerlingen, bronnenblad, antwoordmodel)

const express = require("express");
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.warn("[A40] GOOGLE_API_KEY ontbreekt – Gemini werkt niet.");
}

const MODEL_NAME =
  process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash-lite";

let genAI = null;
let model = null;

function getModel() {
  if (!API_KEY) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  if (!model) {
    model = genAI.getGenerativeModel({
      model: MODEL_NAME,
    });
  }
  return model;
}

/**
 * Probeer uit de modeloutput een JSON-blok te vissen en te parsen.
 * We verwachten OF puur JSON, OF JSON binnen ```json ``` fencing.
 */
function extractJson(text) {
  if (!text) {
    throw new Error("Lege Gemini-output");
  }

  let cleaned = text.trim();

  // Strip eventuele markdown-fencing
  if (cleaned.startsWith("```")) {
    const firstFence = cleaned.indexOf("```");
    const secondFence = cleaned.indexOf("```", firstFence + 3);
    if (secondFence !== -1) {
      cleaned = cleaned.slice(firstFence + 3, secondFence).trim();
    }
    // strip evt. "json" of "JSON" label
    if (cleaned.toLowerCase().startsWith("json")) {
      cleaned = cleaned.slice(4).trim();
    }
  }

  // Zoek eerste { en laatste }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Geen geldig JSON-object gevonden in Gemini-output.");
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("[a40] JSON parse error");
    console.error("rawText begin:", text.slice(0, 200));
    console.error("jsonText begin:", jsonText.slice(0, 200));
    throw new Error("Gemini-output kon niet als JSON geparsed worden.");
  }
}

/**
 * Algemene Gemini-runner met prompt.
 * stepLabel is alleen voor logging (bijv. "step1", "step2", ...).
 *
 * Nieuwe API-call: generateContent({ contents: [...] })
 */
async function runGeminiAndParse(prompt, stepLabel = "step") {
  const mdl = getModel();
  if (!mdl) {
    throw new Error("Geen Gemini-model beschikbaar (API-key ontbreekt).");
  }

  const result = await mdl.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const text = result.response.text();
  const json = extractJson(text);

  if (!json || typeof json !== "object") {
    throw new Error(`Ongeldige JSON-structuur voor ${stepLabel}`);
  }

  return json;
}

/**
 * Helper: compacte representatie van bronnen voor in de prompt.
 * Kort, in de stijl van de trefferweergave (titel + provider + kort stukje tekst).
 */
function sourcesToPromptSnippet(sources = []) {
  return sources
    .map((s) => {
      const headerParts = [
        `id: ${s.id}`,
        s.provider ? `provider: ${s.provider}` : "",
        s.type ? `type: ${s.type}` : "",
        s.title ? `titel: ${s.title}` : "",
      ].filter(Boolean);

      const header = headerParts.join(" | ");
      const raw = s.fullText || s.description || "";
      const text = raw.replace(/\s+/g, " ").slice(0, 220);
      return `- ${header}\n  tekst: ${text}`;
    })
    .join("\n");
}

/**
 * Masterprompt – basisuitleg Vreemde Verleden / presentisme.
 */
function baseDidacticPreamble() {
  return `
Je bent een Nederlandse didactische expert in geschiedenisonderwijs
(3/4 havo/vwo) en werkt volgens Tim Huijgen, "Het Vreemde Verleden".

KERN:
- Leerlingen starten vanuit een onbewust presentisme: zij kijken met de bril van nu
  en vinden gedrag uit het verleden vaak "bizar, dom, extreem, racistisch, vrouwonvriendelijk, achterlijk".
- De hoofdvraag mag die onbewuste houding weerspiegelen (bv. "Waarom stemden mensen op zo'n maniak als Hitler?").
- Jouw lesdoel is NIET dat oordeel te bevestigen, maar het uit te dagen:
  - laat zien HOE mensen toen dachten,
  - waarom hun keuzes in die context logisch konden lijken,
  - expliciteer standplaatsgebondenheid, tijdgebonden normen, machtsverhoudingen,
    religie, ideologie, economie, sociale hiërarchie, enz.

Schrijf:
- altijd in het Nederlands,
- helder en concreet (B1/B2),
- voor 3/4 havo/vwo,
- zonder leerlingen te betuttelen.
`;
}

/**
 * STEP 1 – DOCENTENINSTRUCTIE + LESPLANNING
 */
function buildStep1Prompt(body) {
  const { concept = {}, sources = [] } = body;
  const tv = concept.tvLabel || concept.tv || "";
  const ka = concept.kaLabel || concept.ka || "";

  return `
${baseDidacticPreamble()}

CONTEXT STEP 1 – DOCENTENINSTRUCTIE & PLANNING
Doel:
- Geef de docent een helder overzicht van WAT, HOE, WAAROM van de les.
- Leg expliciet de link met:
  - de (impliciet presentistische) hoofdvraag,
  - de bronnen,
  - het doorbreken van presentisme en ontwikkelen van historisch besef.

BELANGRIJK:
- Als er al een hoofdvraag is meegegeven in "concept.hoofdvraag":
  - gebruik die hoofdvraag vrijwel letterlijk, hoogstens licht taalkundig bijgeschaafd.
  - verander de didactische intentie (presentistische bril) NIET.

Tijdvak / KA (indien gebruikt):
- Tijdvak: ${tv || "onbekend"}
- Kenmerkend aspect: ${ka || "onbekend"}

Invoer (concept):
${JSON.stringify(concept, null, 2)}

Invoer (korte bron-samenvattingen):
${sourcesToPromptSnippet(sources)}

OUTPUTVEREISTEN
- Je MOET geldige JSON teruggeven met exact dit schema:

{
  "step": 1,
  "data": {
    "docentenInstructie": {
      "wat": "string",
      "hoe": "string",
      "waarom": "string"
    },
    "lesPlanning": {
      "tabelMarkdown": "string"
    }
  }
}

Richtlijnen inhoud:
- "wat": 2–4 zinnen. Wat onderzoeken leerlingen? Koppel aan hoofdvraag, bronnen en "vreemde" element.
- "hoe": 3–6 zinnen. Beschrijf de fasen: start, verkennen, analyseren (tabel/kwadrant), klassengesprek, reflectie.
- "waarom": 2–4 zinnen. Waarom is dit belangrijk voor historisch besef en het doorbreken van presentisme?

- "tabelMarkdown": geldige Markdown-tabel met kolommen Fase | Duur | Activiteit.
  Gebruik bijv. fasen: Start, Verkennen, Analyseren, Plenair, Reflectie.

BELANGRIJK:
- Geen extra tekst buiten het JSON-object.
- Geen uitleg, geen markdown fences, alleen JSON.
`;
}

/**
 * STEP 2 – LEERLINGMATERIAAL (WERKBLAD)
 *
 * Alles wat de leerlingen invullen / lezen:
 * - hoofdvraag
 * - leerlingInleiding
 * - bronVragen
 * - invulTabel (kolommen + meerkeuzelijst)
 * - kwadrantAsLabels
 * - reflectieVragen
 */
function buildStep2Prompt(body) {
  const { concept = {}, sources = [] } = body;
  const tv = concept.tvLabel || concept.tv || "";
  const ka = concept.kaLabel || concept.ka || "";

  return `
${baseDidacticPreamble()}

CONTEXT STEP 2 – LEERLINGMATERIAAL (WERKBLAD)
Doel:
- Genereer alles voor het leerlingwerkblad:
  - een hoofdvraag met onbewust presentisme,
  - een inleiding in leerlingtaal (jij-vorm),
  - concrete, GENUMMERDE vragen per bron,
  - een invultabel met drie kolommen (observaties, interpretatie, link met hoofdvraag),
    inclusief meerkeuze-begrippen waaruit leerlingen kiezen,
  - labels voor het kwadrant (X/Y-assen),
  - korte reflectievragen.

HOOFDVRAAG – STRIKTE REGELS:
- Als "concept.hoofdvraag" bestaat en een niet-lege string is:
  - neem deze hoofdvraag vrijwel letterlijk over als "data.hoofdvraag".
  - hoogstens licht taalkundig bijschaven (spelfouten/loopt niet lekker).
- Als er geen hoofdvraag is:
  - formuleer zelf een onbewust presentistische hoofdvraag.
  - gebruik ten minste één duidelijk oordeelwoord (bijv. "gek, bizar, raar, dom, achterlijk, extreem, overdreven, hysterisch, maniakaal, hard, wreed, oneerlijk").
  - richt de vraag op "zij/mensen toen/Duitsers/Amerikanen/boeren/etc.", NIET op "wij".
  - VERMIJD expliciete woorden als "wij", "nu", "tegenwoordig", "in onze tijd".
  - koppel de vraag aan tijdvak/KA en de bronnen.

Tijdvak / KA:
- Tijdvak: ${tv || "onbekend"}
- Kenmerkend aspect: ${ka || "onbekend"}

Invoer (concept):
${JSON.stringify(concept, null, 2)}

Invoer (korte bron-samenvattingen):
${sourcesToPromptSnippet(sources)}

OUTPUTVEREISTEN
Geef exact JSON met deze structuur:

{
  "step": 2,
  "data": {
    "hoofdvraag": "string",
    "leerlingInleiding": "string",
    "bronVragen": [
      {
        "bronId": "string",
        "vragen": ["string", "string"]
      }
    ],
    "invulTabel": {
      "kolommen": [
        {
          "id": "observaties",
          "label": "Belangrijkste observaties",
          "omschrijving": "string"
        },
        {
          "id": "interpretatie",
          "label": "Interpretatie",
          "omschrijving": "string"
        },
        {
          "id": "linkMetHoofdvraag",
          "label": "Link met hoofdvraag",
          "omschrijving": "string"
        }
      ],
      "meerkeuzeOpties": [
        {
          "kolomId": "observaties",
          "opties": ["string", "string"]
        },
        {
          "kolomId": "interpretatie",
          "opties": ["string", "string"]
        },
        {
          "kolomId": "linkMetHoofdvraag",
          "opties": ["string", "string"]
        }
      ]
    },
    "kwadrantAsLabels": {
      "X_links": "string",
      "X_rechts": "string",
      "Y_boven": "string",
      "Y_onder": "string"
    },
    "reflectieVragen": ["string", "string"]
  }
}

Richtlijnen inhoud:

- "hoofdvraag":
  - expliciet gekoppeld aan tijdvak/KA en bronnen,
  - onbewust presentistisch geformuleerd (leerling oordeelt, maar is zich daar niet van bewust).

- "leerlingInleiding":
  - 2–4 alinea's (gebruik \\n\\n),
  - jij-vorm, legt kort uit dat wij nu anders kijken dan toen,
  - maakt duidelijk wat de klas gaat onderzoeken en welke bronnen ze gebruiken.

- "bronVragen":
  - per bron 1–3 concrete vragen.
  - elke vraag MOET beginnen met een nummer en punt, bijvoorbeeld:
    - "1. Wat zie je hier precies gebeuren?"
    - "2. Waarom reageren deze mensen zo?"
  - vragen richten op observeren, interpreteren en koppelen aan de hoofdvraag.

- "invulTabel":
  - deze tabel is voor LEGE leerlingcellen: jij definieert alleen
    - de kolomnamen (label),
    - een korte omschrijving (uitleg wat er in die kolom moet).
  - vul GEEN voorbeeldrijen of voorbeeldantwoorden in.
  - "meerkeuzeOpties" zijn alleen lijsten met kernbegrippen waaruit leerlingen later kunnen kiezen;
    ze staan NIET als ingevulde tekst in de cellen.

- "kwadrantAsLabels":
  - geef alleen de labels voor X_links, X_rechts, Y_boven, Y_onder (subdimensies).
  - vul GEEN voorbeelden van punten in het kwadrant; leerlingen tekenen/plaatsen zélf.

- "reflectieVragen":
  - 3–6 vragen, gericht op:
    - historisch redeneren,
    - standplaatsgebondenheid,
    - bewustwording van eigen oordeel (presentisme),
    - evt. parallellen met nu (zonder moralistische preek).

BELANGRIJK:
- Geen losse tekst buiten het JSON-object.
`;
}

/**
 * STEP 3 – BRONNENBLAD (LOS BLAD VOOR LEERLINGEN)
 *
 * Hier is de AI relatief "dom": we geven vooral een net gestructureerd
 * bronnenblad; inhoud komt grotendeels direct uit de aangeleverde sources.
 */
function buildStep3Data(body) {
  const { concept = {}, sources = [] } = body;

  const data = {
    inleiding:
      "In dit bronnenblad vind je alle bronnen (met nummer) die je nodig hebt voor de les. Gebruik bronnummer en titel wanneer je verwijst naar een specifieke bron in je antwoorden.",
    bronnen: sources.map((s, idx) => ({
      id: s.id,
      nummer: idx + 1,
      titel: s.title || s.description || `Bron ${idx + 1}`,
      subtitel: s.provider || "",
      type: s.type || "TEXT",
      provider: s.provider || "",
      url: s.url || null,
      imageUrl: s.imageUrl || null,
      fullText: s.fullText || s.content || s.description || "",
    })),
    concept,
  };

  return {
    step: 3,
    data,
  };
}

/**
 * STEP 4 – ANTWOORDBLADEN (ALLEEN VOOR DOCENT)
 */
function buildStep4Prompt(body) {
  const {
    concept = {},
    sources = [],
    step2Data = null,
  } = body;

  return `
${baseDidacticPreamble()}

CONTEXT STEP 4 – ANTWOORDBLADEN VOOR DOCENT
Doel:
- Geef de docent houvast bij:
  - voorbeeld-antwoorden op bronvragen,
  - voorbeeldinvulling van de invultabel per bron,
  - een globale voorbeeld-plaatsing in het kwadrant,
  - richtinggevende opmerkingen bij de reflectievragen.

LET OP:
- Dit is GEEN sluitend, enig juist antwoordmodel.
- Je geeft kernwoorden / kernzinnen die een docent helpen,
  maar laat ruimte voor variatie en discussie in de klas.

Invoer (concept):
${JSON.stringify(concept, null, 2)}

Invoer (bronnen – kort):
${sourcesToPromptSnippet(sources)}

Eventuele step2-data (leerlingkant, facultatief):
${step2Data ? JSON.stringify(step2Data, null, 2) : "geen step2Data meegeleverd"}

OUTPUTVEREISTEN
Geef exact JSON met deze structuur:

{
  "step": 4,
  "data": {
    "bronAntwoorden": [
      {
        "bronId": "string",
        "vragenAntwoorden": [
          {
            "vraag": "string",
            "voorbeeldAntwoord": "string"
          }
        ]
      }
    ],
    "invulTabelVoorbeeld": [
      {
        "bronId": "string",
        "observaties": ["string"],
        "interpretatie": ["string"],
        "linkMetHoofdvraag": ["string"]
      }
    ],
    "kwadrantVoorbeelden": [
      {
        "bronId": "string",
        "positie": "links-boven | links-onder | rechts-boven | rechts-onder",
        "toelichting": "string"
      }
    ],
    "reflectieVoorbeelden": [
      "string",
      "string"
    ]
  }
}

Richtlijnen:
- "bronAntwoorden":
  - gebruik de (genummerde) vragen per bron uit step2, of reconstrueer zélf logische vragen,
  - geef per vraag 1 kernachtig voorbeeldantwoord op havo/vwo-niveau.
- "invulTabelVoorbeeld":
  - gebruik per bron 2–5 kernbegrippen per kolom,
  - sluit aan bij de meerkeuze-opties en bij het historisch redeneren.
- "kwadrantVoorbeelden":
  - kies voor elke belangrijke bron een kwadrantpositie,
  - leg kort uit waarom die bron daar hoort.
- "reflectieVoorbeelden":
  - 3–6 korte aanwijzingen / voorbeeldgedachten bij de reflectievragen
    (niet woordelijk, maar als "richtlijn" voor wat je ongeveer zou kunnen verwachten).

BELANGRIJK:
- Geen beslissende eindconclusie voorkauwen.
- Geen losse tekst buiten het JSON-object.
`;
}

/**
 * ROUTES
 */

// Step 1 – docenteninstructie + lesplanning
router.post("/step1", async (req, res) => {
  try {
    const prompt = buildStep1Prompt(req.body || {});
    const json = await runGeminiAndParse(prompt, "step1");

    if (!json.data || !json.data.docentenInstructie || !json.data.lesPlanning) {
      throw new Error("Step1-output mist verplichte velden.");
    }

    res.json(json);
  } catch (err) {
    console.error("[a40.step1] error:", err);
    res.status(500).json({
      error: "step1 failed",
      details: err.message || String(err),
    });
  }
});

// Step 2 – leerlinginleiding + werkblad-elementen
router.post("/step2", async (req, res) => {
  try {
    const prompt = buildStep2Prompt(req.body || {});
    const json = await runGeminiAndParse(prompt, "step2");

    if (
      !json.data ||
      typeof json.data.hoofdvraag !== "string" ||
      !json.data.kwadrantAsLabels
    ) {
      throw new Error("Step2-output mist verplichte velden.");
    }

    res.json(json);
  } catch (err) {
    console.error("[a40.step2] error:", err);
    res.status(500).json({
      error: "step2 failed",
      details: err.message || String(err),
    });
  }
});

// Step 3 – bronnenblad (zonder Gemini, puur server-side opgebouwd)
router.post("/step3", async (req, res) => {
  try {
    const json = buildStep3Data(req.body || {});
    res.json(json);
  } catch (err) {
    console.error("[a40.step3] error:", err);
    res.status(500).json({
      error: "step3 failed",
      details: err.message || String(err),
    });
  }
});

// Step 4 – antwoordbladen (met Gemini)
router.post("/step4", async (req, res) => {
  try {
    const body = req.body || {};
    const prompt = buildStep4Prompt(body);
    const json = await runGeminiAndParse(prompt, "step4");

    if (!json.data || !json.data.bronAntwoorden) {
      throw new Error("Step4-output mist verplichte velden.");
    }

    res.json(json);
  } catch (err) {
    console.error("[a40.step4] error:", err);
    res.status(500).json({
      error: "step4 failed",
      details: err.message || String(err),
    });
  }
});

module.exports = router;


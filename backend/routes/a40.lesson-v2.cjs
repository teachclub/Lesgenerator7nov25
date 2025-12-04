// routes/a40.lesson-v2.cjs
// Lesgenerator v2 – 4 stappen (docent, leerlingen, bronnenblad, antwoordmodel)
// MASTERPROMPT v6 volledig geïntegreerd

const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ----------------------
// GEMINI INIT
// ----------------------
const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.warn("[A40] GOOGLE_API_KEY ontbreekt – Gemini werkt niet.");
}

const MODEL_NAME = process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash-lite";

let genAI = null;
let model = null;

function getModel() {
  if (!API_KEY) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY);
  if (!model) {
    model = genAI.getGenerativeModel({
      model: MODEL_NAME,
    });
  }
  return model;
}

// ----------------------
// JSON EXTRACTOR
// ----------------------
function extractJson(text) {
  if (!text) throw new Error("Lege Gemini-output");
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    const firstFence = cleaned.indexOf("```");
    const secondFence = cleaned.indexOf("```", firstFence + 3);
    if (secondFence !== -1) {
      cleaned = cleaned.slice(firstFence + 3, secondFence).trim();
    }
    if (cleaned.toLowerCase().startsWith("json")) {
      cleaned = cleaned.slice(4).trim();
    }
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Geen geldig JSON-object gevonden.");
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonText);
}

// ----------------------
// GEMINI CALL
// ----------------------
async function runGeminiAndParse(prompt, label) {
  const mdl = getModel();
  if (!mdl) throw new Error("Geen Gemini-model beschikbaar (API-key ontbreekt).");

  const result = await mdl.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = result.response.text();
  const json = extractJson(text);

  if (!json || typeof json !== "object") {
    throw new Error(`Ongeldige JSON-structuur in ${label}`);
  }
  return json;
}

// ----------------------
// BRONNEN → PROMPT SNIPPET
// ----------------------
function sourcesToPromptSnippet(sources = []) {
  return sources
    .map((s) => {
      const headerParts = [
        `id: ${s.id}`,
        s.provider ? `provider: ${s.provider}` : "",
        s.type ? `type: ${s.type}` : "",
        s.title ? `titel: ${s.title}` : "",
      ].filter(Boolean);

      return (
        "- " +
        headerParts.join(" | ") +
        "\n  tekst: " +
        (s.fullText || s.description || "")
          .replace(/\s+/g, " ")
          .slice(0, 300)
      );
    })
    .join("\n");
}

// ----------------------
// MASTERPROMPT v6 — DROP-IN (compact)
// ----------------------
function baseDidacticPreamble() {
  return `
MASTERPROMPT v6 — LESSIE LESGENERATOR

Rol:
Expert geschiedenisdidacticus (Huijgen / Vreemde Verleden / contextualiseren).
Genereer lesmateriaal HAVO/VWO dat leerlingen presentisme laat herkennen en historische context laat bouwen.

LESDOELEN:
- presentisme herkennen
- context opbouwen via 5 dimensies (tijd/ruimte/politiek/economie/sociaal-cultureel)
- bronnen analyseren (observatie → context → hoofdvraag)
- eerste verklaring herzien

STAP 1 — Eerste reactie
Leerlingen: eerste oordeel, eerste verklaring, “wat weet ik nog niet?”

STAP 2 — Context bouwen
Genereer 6–7 concrete subdimensies (geen jargon, leerlingtaal).

STAP 2B — Selectie kwadrant
Kies exact 4 subdimensies → X_links / X_rechts / Y_boven / Y_onder.

STAP 3 — Bronvragen
Per bron 4–6 vragen:
- 1–2 observatie
- 2–3 context (subdimensies)
- 1–2 hoofdvraag-koppeling

STAP 4 — Herziening
Leerlingen herzien hun eerste verklaring op basis van context & bronnen.

QUALITY RULES:
- geen anachronismen, geen presentistisch eindantwoord
- 6–7 subdimensies
- exacte 4 kwadrantdimensies
- taalniveau HAVO/VWO
- alles concreet, leerlingvriendelijk

JSON-SCHEMA (AI MOET HIERBINNEN BLIJVEN):
{
  "docentenInstructie": { "wat": "", "hoe": "", "waarom": "" },
  "subdimensies": [],
  "kwadranten": { "X_links": [], "X_rechts": [], "Y_boven": [], "Y_onder": [] },
  "bronvragen": []
}
`;
}

// ----------------------
// STEP 1 PROMPT
// ----------------------
function buildStep1Prompt(body) {
  const { concept = {}, sources = [] } = body;
  return `
${baseDidacticPreamble()}

CONTEXT: STEP 1 – DOCENT
Genereer:
- wat (3–4 zinnen)
- hoe (4–6 zinnen)
- waarom (2–4 zinnen)
- lesplanning (Markdown-tabel)

Invoer concept:
${JSON.stringify(concept, null, 2)}

Invoer bronnenkort:
${sourcesToPromptSnippet(sources)}

OUTPUT:
{
  "step": 1,
  "data": {
    "docentenInstructie": { "wat": "", "hoe": "", "waarom": "" },
    "lesPlanning": { "tabelMarkdown": "" }
  }
}
GEEN extra tekst buiten JSON.
`;
}

// ----------------------
// STEP 2 PROMPT (grote update)
// ----------------------
function buildStep2Prompt(body) {
  const { concept = {}, sources = [] } = body;

  return `
${baseDidacticPreamble()}

CONTEXT: STEP 2 – LEERLINGMATERIAAL
Genereer:
- hoofdvraag met onbewust presentisme
- leerlinginleiding (2–4 alinea’s)
- 6–7 subdimensies
- 4 kernsubdimensies gekoppeld aan kwadrant-assen
- bronvragen per bron (4–6)
- invultabel (3 kolommen, omschrijvingen, meerkeuzeopties 6–15 per kolom)
- reflectievragen (3–6)

Invoer concept:
${JSON.stringify(concept, null, 2)}

Invoer bronnenkort:
${sourcesToPromptSnippet(sources)}

OUTPUT:
{
  "step": 2,
  "data": {
    "hoofdvraag": "",
    "leerlingInleiding": "",
    "subdimensies": [],
    "kwadranten": {
      "X_links": [],
      "X_rechts": [],
      "Y_boven": [],
      "Y_onder": []
    },
    "bronVragen": [],
    "invulTabel": {
      "kolommen": [
        { "id": "observaties", "label": "Belangrijkste observaties", "omschrijving": "" },
        { "id": "interpretatie", "label": "Interpretatie", "omschrijving": "" },
        { "id": "linkMetHoofdvraag", "label": "Link met hoofdvraag", "omschrijving": "" }
      ],
      "meerkeuzeOpties": []
    },
    "reflectieVragen": []
  }
}
GEEN extra tekst behalve JSON.
`;
}

// ----------------------
// STEP 3 – BRONNENBLAD (server-side)
// ----------------------
function buildStep3Data(body) {
  const { concept = {}, sources = [] } = body;

  return {
    step: 3,
    data: {
      inleiding:
        "In dit bronnenblad vind je alle bronnen met nummer. Gebruik de bronverwijzingen in je antwoorden.",
      bronnen: sources.map((s, idx) => ({
        id: s.id,
        nummer: idx + 1,
        titel: s.title || s.description || `Bron ${idx + 1}`,
        type: s.type || "TEXT",
        provider: s.provider || "",
        url: s.url || null,
        imageUrl: s.imageUrl || null,
        fullText: s.fullText || s.content || s.description || "",
      })),
      concept,
    },
  };
}

// ----------------------
// STEP 4 PROMPT
// ----------------------
function buildStep4Prompt(body) {
  const { concept = {}, sources = [], step2Data = null } = body;

  return `
${baseDidacticPreamble()}

CONTEXT: STEP 4 – ANTWOORDMODEL
Genereer voorbeeldantwoorden op:
- bronvragen
- tabelinvulling
- kwadrantplaatsing
- reflectievragen

Invoer concept:
${JSON.stringify(concept, null, 2)}

Bronnenkort:
${sourcesToPromptSnippet(sources)}

Step2-data:
${step2Data ? JSON.stringify(step2Data, null, 2) : "geen"}

OUTPUT:
{
  "step": 4,
  "data": {
    "bronAntwoorden": [],
    "invulTabelVoorbeeld": [],
    "kwadrantVoorbeelden": [],
    "reflectieVoorbeelden": []
  }
}
ENKEL JSON.
`;
}

// ----------------------
// ROUTES
// ----------------------
router.post("/step1", async (req, res) => {
  try {
    const prompt = buildStep1Prompt(req.body);
    const json = await runGeminiAndParse(prompt, "step1");
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: "step1 failed", details: err.message });
  }
});

router.post("/step2", async (req, res) => {
  try {
    const prompt = buildStep2Prompt(req.body);
    const json = await runGeminiAndParse(prompt, "step2");
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: "step2 failed", details: err.message });
  }
});

router.post("/step3", async (req, res) => {
  try {
    const json = buildStep3Data(req.body);
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: "step3 failed", details: err.message });
  }
});

router.post("/step4", async (req, res) => {
  try {
    const prompt = buildStep4Prompt(req.body);
    const json = await runGeminiAndParse(prompt, "step4");
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: "step4 failed", details: err.message });
  }
});

module.exports = router;


// backend/prompts/lessonV2.step1.cjs
// Step 1 – Docenteninstructie + lesplanning
// Output = JSON met chainSignature + docentensectie + lesplanning
// Gebaseerd op MASTER_SIGNATURE v6MP6dec + Huijgen-dimensies

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function buildStep1Prompt({ concept, sources }) {
  const c = concept || {};
  const s = sources || [];

  const systemText = `
Je bent een expert in geschiedenisdidactiek, contextualiseren (Tim Huijgen),
en het schrijven van heldere docentmaterialen voor bovenbouwleerlingen.

Je maakt STEP 1: DOCENTENINSTRUCTIE.

STRUCTUUR VAN WAT JE MOET MAKEN:

1. "wat – hoe – waarom"
   - WAT: korte uitleg van de inhoud en de focus van de les.
   - HOE: uitleg van de opbouw, werkvormen en wat leerlingen concreet doen.
   - WAAROM: vakdidactische onderbouwing: hoe de les leerlingen helpt
     historisch te redeneren, contextualiseren en de hoofdvraag te beantwoorden.

2. DEELVRAGEN & SUBDIMENSIES
   Je maakt 4 deelvragen, gebaseerd op:
   - de gekozen hoofdvraag,
   - de Huijgen-dimensies:
       * Tijd & Tijdgeest
       * Sociale verhoudingen & groepsculturen
       * Politiek & macht
       * Waarden & normen / morele logica van tijdgenoten
   Elke deelvraag koppelt aan 1 aantrekkende dimensie, en vormt
   een analytische opstap naar de hoofdvraag.

3. BRONKOPPELING — HOUVAST VOOR DOCENT
   Je groepeert ALLE GEKOZEN bronnen per deelvraag:
   - Per deelvraag:
       * "Deze bronnen horen hierbij omdat..."
       * Lijst met bron-ID’s + 1 zin waarom deze bron relevant is.
   - Je maakt deze sectie SUPER overzichtelijk.
   - Als een bron meerdere deelvragen raakt, mag dat, maar kies één hoofdplek.

4. LESPLANNING (TABEL)
   Tabel met:
   - Fase
   - Activiteit
   - Tijd
   - Doel / welke deelvraag centraal staat
   - Product / output van leerlingen

5. OUTPUT
   Je geeft ALLEEN JSON terug:
   {
     "step": 1,
     "data": {
       "chainSignature": "v6MP6dec",
       "docent": {
         "wat": "...",
         "hoe": "...",
         "waarom": "...",
         "deelvragen": [...],
         "bronkoppeling": { ... },
         "lesplanning": [...]
       }
     }
   }

REGELS:
- Gebruik NOOIT het woord “tegenwoordig”, “achteraf”, “met de kennis van nu”.
- Hoofdvraag blijft zoals aangeleverd.
- Leerlingentaal = helder, niet te academisch, geen bijzinnen-machine.
- ABSOLUUT geen markdown.
`;

  const inputJson = JSON.stringify(
    {
      chainSignature: MASTER_SIGNATURE,
      concept: c,
      sources: s,
    },
    null,
    2
  );

  return `${systemText}

INVOER:
${inputJson}

CHAIN_SIGNATURE: ${MASTER_SIGNATURE}`;
}

function validateStep1Response(json) {
  if (!json || typeof json !== "object")
    throw new Error("Step1: geen JSON");
  if (json.step !== 1)
    throw new Error("Step1: verkeerde step-index");
  if (!json.data || json.data.chainSignature !== MASTER_SIGNATURE)
    throw new Error("Step1: chainSignature mismatch");
  return json;
}

module.exports = {
  MASTER_SIGNATURE,
  buildStep1Prompt,
  validateStep1Response,
};


// backend/prompts/lessonV2.step2.cjs
// Combineert hoofdvraag, inleiding, bronvragen, invultabel, reflectie

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildHoofdvraagSection } = require("./lessonV2.step2.hoofdvraag.cjs");
const { buildInleidingSection } = require("./lessonV2.step2.inleiding.cjs");
const { buildBronvragenSection } = require("./lessonV2.step2.bronvragen.cjs");
const { buildInvultabelSection } = require("./lessonV2.step2.invultabel.cjs");
const { buildReflectieSection } = require("./lessonV2.step2.reflectie.cjs");

function buildStep2Prompt({ concept, sources }) {
  const c = concept || {};
  const s = sources || [];

  const systemText = `
Je maakt STEP 2: LEERLINGMATERIAAL.
Alles moet direct bruikbaar zijn voor HAVO/VWO-leerlingen.

STRUCTUUR:
- hoofdvraag (exact overnemen, leerlingentaal, maximaal 1 zin)
- inleiding (kort, activerend, 2–3 zinnen)
- bronvragen per bron (3 vragen per bron, gericht op deelvragen + subdimensies)
- invultabel (observatie – interpretatie – link met deelvraag & hoofdvraag)
- reflectie: welke deelvraag weegt het zwaarst?

GEEN markdown, geen lijstjes met '-', alleen platte tekst of JSON-structuren.
`;

  const jsonInput = JSON.stringify(
    { chainSignature: MASTER_SIGNATURE, concept: c, sources: s },
    null,
    2
  );

  return `${systemText}

INVOER:
${jsonInput}

CHAIN_SIGNATURE: ${MASTER_SIGNATURE}`;
}

function validateStep2Response(json) {
  if (!json || typeof json !== "object")
    throw new Error("Step2: geen JSON");
  if (json.step !== 2)
    throw new Error("Step2: verkeerde step-index");
  if (!json.data || json.data.chainSignature !== MASTER_SIGNATURE)
    throw new Error("Step2: chainSignature mismatch");
  return json;
}

module.exports = {
  MASTER_SIGNATURE,
  buildStep2Prompt,
  validateStep2Response,
  buildHoofdvraagSection,
  buildInleidingSection,
  buildBronvragenSection,
  buildInvultabelSection,
  buildReflectieSection,
};


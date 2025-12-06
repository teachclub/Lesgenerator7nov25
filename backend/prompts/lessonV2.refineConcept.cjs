// backend/prompts/lessonV2.refineConcept.cjs
// Bouwt een prompt voor het licht herschrijven van een concept
// (title, hook, hoofdvraag) met behoud van masterSignature.

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function buildRefineConceptPrompt({ concept, mode, userHint }) {
  const c = concept || {};
  const m = mode || "default";
  const hint = userHint || "";

  const payload = {
    chainSignature: MASTER_SIGNATURE,
    mode: m,
    userHint: hint,
    concept: {
      id: c.id || null,
      title: c.title || "",
      hook: c.hook || "",
      hoofdvraag: c.hoofdvraag || c.hoofdvraagText || "",
      masterSignature: c.masterSignature || MASTER_SIGNATURE,
      tv: c.tv || "",
      ka: c.ka || "",
    },
  };

  const systemText =
`Je bent een expert in geschiedenisdidactiek.
Je werkt volgens:
- Het Vreemde Verleden
- historisch redeneren en contextualiseren
- anti-presentisme in de uitleg
- WEL presentistische verwondering in de hoofdvraag ("Hoe konden zij...?").

Je krijgt één concept (title, hook, hoofdvraag, tv, ka) en een mode:

- "default": maak alleen kleine stilistische verbeteringen.
- "more_judgement": maak hook en hoofdvraag iets scherper, met meer morele spanning.
- "softer": maak de toon iets neutraler en meer onderzoekend.

Regels voor de hoofdvraag:
- blijf presentistisch in de zin van verwondering ("Hoe konden zij...").
- geen hindsight ("achteraf", "nu weten we dat", "wat ze niet doorhadden").
- geen moreel oordeel vanuit 2025 dat er dik bovenop ligt.

Gebruik de userHint alleen als extra nuance, niet als totale herontwerp-opdracht.

Geef ALLEEN JSON terug met:

{
  "chainSignature": "<exacte CHAIN_SIGNATURE>",
  "mode": "<mode>",
  "concept": {
    "id": "...",
    "title": "...",
    "hook": "...",
    "hoofdvraag": "...",
    "masterSignature": "<ongewijzigde masterSignature>",
    "tv": "...",
    "ka": "..."
  }
}

GEEN extra tekst, GEEN markdown, GEEN uitleg.`;

  const jsonInput = JSON.stringify(payload, null, 2);

  const prompt = `${systemText}

INVOER:
${jsonInput}

CHAIN_SIGNATURE: ${MASTER_SIGNATURE}`;

  return prompt;
}

function validateRefineResponse(json, expectedSignature = MASTER_SIGNATURE) {
  if (!json || typeof json !== "object") {
    throw new Error("Refine-response is geen JSON-object");
  }
  if (json.chainSignature !== expectedSignature) {
    throw new Error(
      `Refine chainSignature mismatch: expected "${expectedSignature}", got "${json.chainSignature}"`
    );
  }
  if (!json.concept || typeof json.concept !== "object") {
    throw new Error("Refine-response mist concept-object");
  }
  if (json.concept.masterSignature !== expectedSignature) {
    throw new Error(
      `Refine concept.masterSignature mismatch: expected "${expectedSignature}", got "${json.concept.masterSignature}"`
    );
  }
  return json;
}

module.exports = {
  MASTER_SIGNATURE,
  buildRefineConceptPrompt,
  validateRefineResponse,
};


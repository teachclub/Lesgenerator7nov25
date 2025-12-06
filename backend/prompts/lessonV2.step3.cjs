// *****************************************
// lessonV2.step3.cjs
// STEP 3 – BRONNENBLAD (GEEN AI)
// v6MP6dec – puur structureren wat we al hebben
// *****************************************

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

/**
 * STEP3 = bronnenblad voor docent/leerling.
 *
 * Geen AI-call; we zetten alleen de geselecteerde bronnen netjes op een rij.
 *
 * INPUT (body):
 * {
 *   concept: { id, title, hoofdvraag, ... },
 *   sources: [ { id, title, provider, type, url, imageUrl, snippet, ... } ]
 * }
 *
 * OUTPUT:
 * {
 *   "step": "step3",
 *   "data": {
 *     "chainSignature": "<MASTER_SIGNATURE>",
 *     "concept": {
 *       "id": "...",
 *       "title": "...",
 *       "hoofdvraag": "..."
 *     },
 *     "bronnen": [
 *       {
 *         "id": "...",
 *         "title": "...",
 *         "provider": "...",
 *         "type": "...",
 *         "url": "...",
 *         "imageUrl": "...",
 *         "snippet": "..."
 *       }
 *     ]
 *   }
 * }
 */

function buildStep3Data(body = {}) {
  const concept = body.concept || {};
  const sources = Array.isArray(body.sources) ? body.sources : [];

  const bronnen = sources.map((s) => ({
    id: s.id,
    title: s.title || "",
    provider: s.provider || "",
    type: s.type || "",
    url: s.url || s.link || null,
    imageUrl: s.imageUrl || null,
    snippet: s.snippet || s.description || "",
  }));

  return {
    step: "step3",
    data: {
      chainSignature: MASTER_SIGNATURE,
      concept: {
        id: concept.id || null,
        title: concept.title || "",
        hoofdvraag: concept.hoofdvraag || "",
      },
      bronnen,
    },
  };
}

module.exports = {
  buildStep3Data,
};


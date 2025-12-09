"use strict";

// *****************************************
// lessonV2.step3.cjs
// STEP 3 – BRONNENBLAD (GEEN AI)
// v7 – puur structureren wat we al hebben
// - STEP 1/2 werken met LIGHT sources in de prompt
// - STEP 3 krijgt juist de VOLLEDIGE brondata voor het bronnenblad
// *****************************************

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

/**
 * STEP3 = bronnenblad voor docent/leerling.
 *
 * Geen AI-call; we zetten alleen de geselecteerde bronnen netjes op een rij.
 *
 * INPUT (body):
 * {
 *   concept: {
 *     id?: string | number,
 *     title?: string,
 *     hoofdvraag?: string
 *   },
 *   sources: [
 *     {
 *       id: string | number,
 *       title?: string,
 *       provider?: string,
 *       type?: string,
 *       url?: string,
 *       link?: string,
 *       imageUrl?: string,
 *       snippet?: string,
 *       description?: string,
 *       fullText?: string,
 *       content?: string,
 *       periodHint?: string,
 *       meta?: object
 *     }
 *   ]
 * }
 *
 * OUTPUT (PURE DATA, GEEN PROMPT):
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
 *         "snippet": "...",
 *         "description": "...",
 *         "periodHint": "...",
 *         "meta": { ... }
 *       }
 *     ]
 *   }
 * }
 *
 * Let op:
 * - STEP 3 mag de snippet/description WEL bevatten (dit is het bronnenblad).
 * - Dit bestand bevat GEEN prompt-tekst en GEEN AI-instructies.
 * - Het is puur een JSON-structurering van bestaande data voor frontend/export.
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
    description: s.description || "",
    periodHint: s.periodHint || "",
    meta: s.meta || {},
  }));

  return {
    step: "step3",
    data: {
      chainSignature: MASTER_SIGNATURE,
      concept: {
        id: concept.id ?? null,
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


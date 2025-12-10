"use strict";

// backend/prompts/lessonV2.refineConcept.cjs
// Dunne wrapper rond MASTERPROMPT v7.1 voor refine-concept endpoint

const {
  CHAIN_SIGNATURE,
  buildBaseRefineConceptPrompt,
} = require("./lessonV2.base.cjs");

/**
 * Bouwt de prompt voor het verfijnen van een bestaand lesconcept.
 */
function buildRefineConceptPrompt(params) {
  return buildBaseRefineConceptPrompt(params);
}

/**
 * Eenvoudige validatie + normalisatie van de Gemini-response.
 */
function validateRefineConceptResponse(json) {
  if (!json || typeof json !== "object") {
    throw new Error("Refine-concept: JSON-response is leeg of ongeldig.");
  }

  const concept =
    json.concept ||
    (json.data && json.data.concept) ||
    json.conceptRefined ||
    json;

  if (!concept || typeof concept !== "object") {
    throw new Error("Refine-concept: geen 'concept'-object in response.");
  }

  if (!concept.hoofdvraag) {
    throw new Error(
      "Refine-concept: 'hoofdvraag' ontbreekt in concept-object."
    );
  }

  const safeConcept = {
    hoofdvraag: String(concept.hoofdvraag || ""),
    hook: String(concept.hook || ""),
    context: String(concept.context || ""),
    tv: concept.tv != null ? String(concept.tv) : "",
    tvLabel: String(concept.tvLabel || ""),
    ka: concept.ka != null ? String(concept.ka) : "",
    kaLabel: String(concept.kaLabel || ""),
    lesopbrengst: String(concept.lesopbrengst || ""),
  };

  const meta = {
    chainSignature: CHAIN_SIGNATURE,
    complexityLevel:
      (json.meta && json.meta.complexityLevel) !== undefined
        ? json.meta.complexityLevel
        : undefined,
    nuanceLevel:
      (json.meta && json.meta.nuanceLevel) !== undefined
        ? json.meta.nuanceLevel
        : undefined,
    uitleg: (json.meta && json.meta.uitleg) || "",
  };

  return { concept: safeConcept, meta };
}

module.exports = {
  buildRefineConceptPrompt,
  validateRefineConceptResponse,
};


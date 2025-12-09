"use strict";

/**
 * lessonV2.step2.cjs
 * -------------------
 * DUN DOORGEEF-LUIK VOOR STEP 2 (LEERLINGMATERIAAL)
 *
 * Alle inhoudelijke / didactische regels voor stap 2
 * (anti-presentisme, kwadrant, samenwerkingstabel, woordbanken, reflectie, enz.)
 * staan in de MASTERPROMPT + lessonV2.base.cjs.
 *
 * Deze file doet NIETS anders dan:
 *   - de payload (concept, sources, tvKa, etc.) aannemen;
 *   - aangeven dat het om "step2" gaat;
 *   - de echte prompt laten bouwen door de base-builder.
 */

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildLessonV2BasePrompt } = require("./lessonV2.base.cjs");

/**
 * Bouwt de prompt voor STEP 2 door de centrale base-builder aan te sturen.
 *
 * @param {object} payload
 *   Verwacht o.a.:
 *   - concept: { hoofdvraag, deelvragen, ... }
 *   - sources: LIGHT sources (id, title, provider, type)
 *   - tvKa: { tv, tvLabel, ka, kaLabel }
 *
 * @returns {string} prompt-tekst voor Gemini
 */
function buildStep2Prompt(payload = {}) {
  const safePayload = {
    ...payload,
    step: "step2",
    masterSignature: MASTER_SIGNATURE,
  };

  return buildLessonV2BasePrompt(safePayload);
}

module.exports = {
  buildStep2Prompt,
};


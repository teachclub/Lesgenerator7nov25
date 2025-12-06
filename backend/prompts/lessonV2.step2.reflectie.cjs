// backend/prompts/lessonV2.step2.reflectie.cjs
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function buildReflectieSection(deelvragen) {
  return {
    chainSignature: MASTER_SIGNATURE,
    reflectie: [
      "Welke van de vier deelvragen vind jij het belangrijkst voor het begrijpen van de hoofdvraag? Waarom?",
      "Welke bron vond jij het meest verrassend of schokkend? Wat zegt dat over de tijdgeest van toen?",
    ],
  };
}

module.exports = { buildReflectieSection };


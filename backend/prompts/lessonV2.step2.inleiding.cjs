// backend/prompts/lessonV2.step2.inleiding.cjs
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function buildInleidingSection(concept) {
  return {
    chainSignature: MASTER_SIGNATURE,
    inleiding:
      "In deze les onderzoek je waarom mensen in het verleden keuzes maakten die voor ons vreemd, naïef of onverwacht lijken. Je bekijkt bronnen, vergelijkt perspectieven en ontdekt hoe tijdgenoten hun eigen wereld begrepen. Zo werk je stap voor stap toe naar het beantwoorden van de hoofdvraag.",
  };
}

module.exports = { buildInleidingSection };


// backend/prompts/lessonV2.step2.bronvragen.cjs
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function buildBronvragenSection(sources, deelvragen) {
  const output = {};

  for (const src of sources) {
    output[src.id] = {
      bronId: src.id,
      vragen: [
        "Wat zie of lees je precies in deze bron (belangrijkste observatie)?",
        "Welke bedoeling, angst, hoop of overtuiging herken je bij tijdgenoten in deze bron (interpretatie)?",
        "Hoe helpt deze bron bij het beantwoorden van een van de deelvragen? Leg kort uit.",
      ],
    };
  }

  return {
    chainSignature: MASTER_SIGNATURE,
    bronvragen: output,
  };
}

module.exports = { buildBronvragenSection };


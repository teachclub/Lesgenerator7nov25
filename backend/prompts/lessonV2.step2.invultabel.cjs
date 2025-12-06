// backend/prompts/lessonV2.step2.invultabel.cjs
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function buildInvultabelSection(deelvragen) {
  return {
    chainSignature: MASTER_SIGNATURE,
    tabel: {
      kolommen: [
        "Bron(nen)",
        "Observatie (wat zie/lees je?)",
        "Interpretatie (wat betekent dit voor tijdgenoten?)",
        "Link met deelvraag",
        "Link met hoofdvraag",
      ],
    },
  };
}

module.exports = { buildInvultabelSection };


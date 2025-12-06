// backend/prompts/lessonV2.step2.hoofdvraag.cjs
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function buildHoofdvraagSection(concept) {
  return {
    chainSignature: MASTER_SIGNATURE,
    hoofdvraag: concept.hoofdvraag || "",
  };
}

module.exports = { buildHoofdvraagSection };


// prompts/lessonV2.step4.cjs
const { baseDidacticPreamble, sourcesToPromptSnippet } = require("./lessonV2.base.cjs");

function buildStep4Prompt(body) {
  const { concept = {}, sources = [], step2Data = null } = body;

  return `
${baseDidacticPreamble()}

CONTEXT: STEP 4 – ANTWOORDMODEL
Genereer voorbeeldantwoorden op:
- bronvragen
- tabelinvulling
- kwadrantplaatsing
- reflectievragen

Invoer concept:
${JSON.stringify(concept, null, 2)}

Bronnenkort:
${sourcesToPromptSnippet(sources)}

Step2-data:
${step2Data ? JSON.stringify(step2Data, null, 2) : "geen"}

OUTPUT:
{
  "step": 4,
  "data": {
    "bronAntwoorden": [],
    "invulTabelVoorbeeld": [],
    "kwadrantVoorbeelden": [],
    "reflectieVoorbeelden": []
  }
}
ENKEL JSON.
`;
}

module.exports = {
  buildStep4Prompt,
};


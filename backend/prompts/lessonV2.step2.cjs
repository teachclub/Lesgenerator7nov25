// prompts/lessonV2.step2.cjs
// Orchestrator voor STEP 2 – roept 6 losse prompt-secties aan

const { baseDidacticPreamble, sourcesToPromptSnippet } = require("./lessonV2.base.cjs");

const buildHoofdvraagSection = require("./lessonV2.step2.hoofdvraag.cjs");
const buildInleidingSection = require("./lessonV2.step2.inleiding.cjs");
const buildKwadrantSection = require("./lessonV2.step2.kwadrant.cjs");
const buildBronvragenSection = require("./lessonV2.step2.bronvragen.cjs");
const buildInvultabelSection = require("./lessonV2.step2.invultabel.cjs");
const buildReflectieSection = require("./lessonV2.step2.reflectie.cjs");

function buildStep2Prompt(body) {
  const { concept = {}, sources = [] } = body;

  return `
${baseDidacticPreamble()}

${buildHoofdvraagSection(concept)}
${buildInleidingSection()}
${buildKwadrantSection()}
${buildBronvragenSection()}
${buildInvultabelSection()}
${buildReflectieSection()}

==================================================
INVOER
==================================================

Invoer concept:
${JSON.stringify(concept, null, 2)}

Invoer bronnenkort:
${sourcesToPromptSnippet(sources)}

==================================================
OUTPUT (ENKEL DIT JSON-OBJECT)
==================================================

Je geeft ALLEEN onderstaand JSON-object (geen uitleg erbuiten):

{
  "step": 2,
  "data": {
    "hoofdvraag": "",
    "leerlingInleiding": "",
    "subdimensies": [],
    "kwadrantAsLabels": {
      "X_links": "",
      "X_rechts": "",
      "Y_boven": "",
      "Y_onder": ""
    },
    "bronVragen": [
      {
        "bronId": 0,
        "vragen": [
          "1. ...",
          "2. ...",
          "3. ...",
          "4. ..."
        ]
      }
    ],
    "invulTabel": {
      "kolommen": [
        {
          "id": "observaties",
          "label": "Belangrijkste observaties",
          "omschrijving": ""
        },
        {
          "id": "interpretatie",
          "label": "Interpretatie",
          "omschrijving": ""
        },
        {
          "id": "linkMetHoofdvraag",
          "label": "Link met hoofdvraag",
          "omschrijving": ""
        }
      ],
      "meerkeuzeOpties": []
    },
    "reflectieVragen": []
  }
}

- "hoofdvraag": 1 zin:
  - als het concept al een "hoofdvraag" heeft: neem die EXACT over, in het Nederlands;
  - alleen als het concept GEEN hoofdvraag heeft, formuleer je zelf een nieuwe volgens de instructies.
- "leerlingInleiding": 2–4 alinea’s, derde persoon, geen directe aanspreekvorm.
- "kwadrantAsLabels": ALTIJD gevuld met 4 zinvolle labels.
- "bronVragen": voor elke bron één object:
  - "bronId": id uit "sources";
  - "vragen": array met PRECIES 4 vragen, genummerd "1. ...", ..., "4. ...".
- "invulTabel": korte, duidelijke omschrijvingen voor de drie kolommen.
- "reflectieVragen": 3–6 vragen in leerlingtaal.

GEEN extra tekst buiten dit JSON-object.
`;
}

module.exports = {
  buildStep2Prompt,
};


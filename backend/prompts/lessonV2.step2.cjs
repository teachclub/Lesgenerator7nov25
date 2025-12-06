// *****************************************
// lessonV2.step2.cjs
// STEP 2 – LEERLINGMATERIAAL
// v6MP6dec – inleiding, bronvragen, invultabel, reflectie
// *****************************************

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

/**
 * STEP2 = LEERLINGBLAD:
 * - hoofdvraag (kop)
 * - inleiding in leerlingtaal (kort, nieuwsgierig makend, NIET de aha al geven)
 * - bronvragen: per bron 1 vraag, gekoppeld aan een deelvraag + subdimensie
 * - invultabel: observaties / interpretatie / link met hoofdvraag, per groep
 * - reflectie: 2–4 vragen waarmee leerlingen terugkijken op hoofdvraag en dimensies
 *
 * INPUT (body):
 * {
 *   concept: {
 *     hoofdvraag: string,
 *     deelvragen: [
 *       { vraag, dimensie, subdimensie }
 *     ]
 *   },
 *   sources: [ { id, title, provider, type, snippet, ... } ]
 * }
 *
 * Verwachting UI:
 * - data.hoofdvraag: string
 * - data.inleiding: string (markdown OK)
 * - data.bronvragen: [
 *     {
 *       "sourceId": "<id>",
 *       "vraag": "<leerlingvraag>",
 *       "deelvraagIndex": 0-3,
 *       "dimensie": "<dimensie>",
 *       "subdimensie": "<subdimensie>"
 *     }
 *   ]
 * - data.invultabel: {
 *     "kolommen": [ "Belangrijkste observaties", "Interpretatie", "Link met hoofdvraag" ],
 *     "rijen": [
 *       {
 *         "label": "Groep A",
 *         "uitleg": "werkt met bron(nen) … bij deelvraag …",
 *         "deelvraagIndex": 0
 *       }
 *     ]
 *   }
 * - data.reflectie: {
 *     "vragen": [
 *       {
 *         "vraag": "<leerlingvraag>",
 *         "aandachtspuntVoorDocent": "<1 zin, optioneel>"
 *       }
 *     ]
 *   }
 */

function buildStep2Prompt(body) {
  const concept = body.concept || {};
  const sources = Array.isArray(body.sources) ? body.sources : [];

  const hoofdvraag = concept.hoofdvraag || "";
  const deelvragen = Array.isArray(concept.deelvragen) ? concept.deelvragen : [];

  const sourcesJson = JSON.stringify(
    sources.map((s) => ({
      id: s.id,
      title: s.title || "",
      provider: s.provider || "",
      type: s.type || "",
      snippet: s.snippet || s.description || "",
      periodHint: s.periodHint || "",
      meta: s.meta || {},
    })),
    null,
    2
  );

  const deelvragenJson = JSON.stringify(deelvragen, null, 2);

  return `
CHAIN_SIGNATURE: ${MASTER_SIGNATURE}

Je bent een ervaren geschiedenisdidacticus.
Je maakt ALLEEN het LEERLINGMATERIAAL (stap 2) bij een LesGO-les.

CONCEPT:

HOOFDVRAAG:
"${hoofdvraag}"

DEELVRAGEN (met dimensies en subdimensies):
${deelvragenJson}

BRONNEN (Kleio + Cito – max ${sources.length} die je mag gebruiken):
${sourcesJson}

//////////////////////////////////////////////////////////
// BELANGRIJK OVER TOON EN ANTI-PRESENTISME
//////////////////////////////////////////////////////////

- De hoofdvraag mag fel of oordeelrijk klinken (leerlingperspectief).
- Jij geeft in de leerlingtekst NIET alvast de uitleg die de verwondering oplost.
- Geen zinnen als:
  * "Met de kennis van nu weten we dat..."
  * "Tegenwoordig vinden we dat..."
- De inleiding mag wel bevestigen dat het vreemd lijkt, maar:
  * laat het echte "aha"-moment ontstaan door de bronnen en vragen.
- Leerlingentaal: helder, direct, niet kinderachtig.

//////////////////////////////////////////////////////////
// TAAK – VUL DE VOLGENDE ONDERDELEN
//////////////////////////////////////////////////////////

1. HOOFDVRAAG (data.hoofdvraag)
- Neem de hoofdvraag EXACT over zoals gegeven.

2. INLEIDING (data.inleiding)
- Schrijf 1 korte alinea (3–6 zinnen) in leerlingtaal.
- Doel:
  * zet kort de situatie en tijd neer (context van toen),
  * laat merken dat het gedrag/denken voor ons vreemd voelt,
  * eindig met iets als: "Jullie gaan met bronnen onderzoeken hoe dat kon."
- GEEN verklaring van het antwoord; alleen nieuwsgierig maken.
- GEEN expliciete verwijzingen naar "dimensies" of "subdimensies" in de tekst.

3. BRONVRAGEN (data.bronvragen)
- Maak voor 8–12 representatieve bronnen een leerlingvraag.
- Per bronvraag:
  * "sourceId": exacte id uit de bronlijst,
  * "vraag": concrete vraag waarmee een leerling iets uit de bron haalt,
  * "deelvraagIndex": 0, 1, 2 of 3 (koppel elke bron aan de BEST passende deelvraag),
  * "dimensie": copy van de dimensie van die deelvraag,
  * "subdimensie": copy van de subdimensie van die deelvraag.
- VRAAGTYPES:
  * Observatie ("Wat zie je / wat gebeurt er volgens deze bron?"),
  * Interpretatie ("Wat probeert de maker duidelijk te maken?"),
  * Link met hoofdvraag ("Wat zegt deze bron over de hoofdvraag?").
- Schrijf per bron EÉN duidelijke vraag. Geen samengestelde vraag met "en" erin.

4. INVULTABEL (data.invultabel)
- Maak een tabelstructuur voor groepswerk.
- Gebruik ALTIJD deze kolomnamen:
  * "Belangrijkste observaties"
  * "Interpretatie"
  * "Link met hoofdvraag"
- Maak 3–4 rijen, bijv.:
  * Groep A, B, C (en eventueel D).
- Per rij:
  * "label": "Groep A" / "Groep B" / ...
  * "uitleg": kort wat deze groep doet
    - bv. "Werkt met bronnen over propaganda (deelvraag 1)"
  * "deelvraagIndex": 0–3 (koppel iedere rij aan de meest passende deelvraag).

5. REFLECTIE (data.reflectie)
- Maak 2–4 reflectievragen.
- Deze vragen komen NA het werken met de bronnen en de invultabel.
- VRAAGTYPES:
  * Terug naar de hoofdvraag: "Wat begrijp je nu beter over waarom ...?"
  * Verschillende perspectieven: "Welk perspectief vond je het meest verrassend en waarom?"
  * Zelfreflectie: "Wat vind jij nu van het gedrag/denken dat je hebt onderzocht?"
- Per reflectievraag:
  * "vraag": leerlingformulering,
  * "aandachtspuntVoorDocent": 1 korte zin met wat de docent in de antwoorden kan laten terugkomen
    (bijv. "Laat leerlingen expliciet verwijzen naar minimaal 2 bronnen.").

//////////////////////////////////////////////////////////
// JSON-OUTPUT (STRIKT FORMAAT)
// - GEEN markdown
// - GEEN commentaar
// - GEEN tekst buiten het JSON-object
//////////////////////////////////////////////////////////

Geef ALLEEN een JSON-object met exact deze structuur:

{
  "step": "step2",
  "data": {
    "chainSignature": "${MASTER_SIGNATURE}",
    "hoofdvraag": "${hoofdvraag}",
    "inleiding": "<1 alinea in leerlingtaal>",
    "bronvragen": [
      {
        "sourceId": "<id uit bronlijst>",
        "vraag": "<leerlingvraag>",
        "deelvraagIndex": 0,
        "dimensie": "<dimensie van de gekozen deelvraag>",
        "subdimensie": "<subdimensie van de gekozen deelvraag>"
      }
    ],
    "invultabel": {
      "kolommen": [
        "Belangrijkste observaties",
        "Interpretatie",
        "Link met hoofdvraag"
      ],
      "rijen": [
        {
          "label": "Groep A",
          "uitleg": "<korte uitleg wat deze groep doet>",
          "deelvraagIndex": 0
        }
      ]
    },
    "reflectie": {
      "vragen": [
        {
          "vraag": "<reflectievraag in leerlingtaal>",
          "aandachtspuntVoorDocent": "<1 zin voor docent, mag leeg zijn maar laat dit veld wel bestaan>"
        }
      ]
    }
  }
}
`;
}

module.exports = {
  buildStep2Prompt,
};


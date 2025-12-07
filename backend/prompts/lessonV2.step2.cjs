// *****************************************
// lessonV2.step2.cjs
// STEP 2 – LEERLINGMATERIAAL
// v7 – inleiding, bronvragen, invultabel, reflectie
// *****************************************

"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildBasePreamble } = require("./lessonV2.base.cjs");

/**
 * STEP2 = LEERLINGBLAD:
 * - hoofdvraag (kop)
 * - inleiding in leerlingtaal (kort, nieuwsgierig makend, NIET de aha al geven)
 * - bronvragen: per bron meerdere vragen mogelijk, in 3 lagen (+ optionele betrouwbaarheidsvraag)
 * - invultabel: samenwerken & afwegen met v7-kolommen
 * - reflectie: 2–4 vragen waarmee leerlingen terugkijken op hoofdvraag en deelvragen
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
 * Verwachting UI (contract blijft gelijk):
 * - data.hoofdvraag: string
 * - data.inleiding: string
 * - data.bronvragen: [
 *     {
 *       "sourceId": "<id>",
 *       "vraag": "<leerlingvraag>",
 *       "deelvraagIndex": 0-3,
 *       "dimensie": "<dimensie>",
 *       "subdimensie": "<subdimensie>"
 *     }
 *   ]
 *   (LET OP: er mogen meerdere items per sourceId zijn, JSON-schema blijft gelijk.)
 *
 * - data.invultabel: {
 *     "kolommen": [
 *       // v7: 4 kolommen, maar type blijft: array van strings
 *     ],
 *     "rijen": [
 *       {
 *         "label": "Groep A",
 *         "uitleg": "werkt met bron(nen) … bij deelvraag …",
 *         "deelvraagIndex": 0
 *       }
 *     ]
 *   }
 *
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
  const preamble = buildBasePreamble(MASTER_SIGNATURE);

  return `
${preamble}

==== CONTEXT – STEP2 (LEERLINGMATERIAAL) ====

Je werkt nu in STAP 2 van de keten.
Je maakt ALLEEN het LEERLINGMATERIAAL bij een LesGO-les:
- uitleg van de hoofdvraag,
- inleiding in leerlingtaal,
- bronvragen,
- invultabel (samenwerken & afwegen),
- reflectie.

Alle algemene didactische regels over:
- hoofdvraag (verwondering, anti-presentisme),
- 4 deelvragen + dimensies + subdimensies,
- bronselectie, invultabel, reflectie,
komen UITSLUITEND uit de MASTERPROMPT hierboven. Pas die regels hier strikt toe.
Je verandert de hoofdvraag en de deelvragen inhoudelijk NIET.

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
  * "In onze tijd zouden we dit nooit accepteren."
- De inleiding mag wel bevestigen dat het vreemd lijkt, maar:
  * laat het echte "aha"-moment ontstaan door de bronnen en vragen.
- Leerlingentaal: helder, direct, niet kinderachtig.

//////////////////////////////////////////////////////////
// TAAK – VUL DE VOLGENDE ONDERDELEN
//////////////////////////////////////////////////////////

1. HOOFDVRAAG (data.hoofdvraag)
- Neem de hoofdvraag EXACT over zoals gegeven.
- Verander hier niets aan.

2. INLEIDING (data.inleiding)
- Schrijf 1 korte alinea (3–6 zinnen) in leerlingtaal.
- Doel:
  * zet kort de situatie en tijd neer (context van toen),
  * laat merken dat het gedrag/denken voor ons vreemd voelt,
  * eindig met iets als: "Jullie gaan met bronnen onderzoeken hoe dat kon."
- GEEN verklaring van het antwoord; alleen nieuwsgierig maken.
- GEEN expliciete verwijzingen naar "dimensies" of "subdimensies" in de tekst.

3. BRONVRAGEN (data.bronvragen – v7-regels)
- Je maakt per gekozen bron MEERDERE vragen mogelijk, maar het JSON-schema blijft hetzelfde.
- Je hoeft NIET alle bronnen te gebruiken; kies 8–12 representatieve bronnen.
- Per bron kun je 2–4 vragen maken. Elke vraag wordt een apart object in data.bronvragen.

- Voor ELKE bronvraag:
  * "sourceId": exacte id uit de bronlijst,
  * "vraag": concrete vraag waarmee een leerling iets uit de bron haalt,
  * "deelvraagIndex": 0, 1, 2 of 3 (koppel aan de BEST passende deelvraag),
  * "dimensie": kopie van de dimensie van die deelvraag,
  * "subdimensie": kopie van de subdimensie van die deelvraag.

- Werk in DRIE LAGEN (plus optionele betrouwbaarheidsvragen):

  1) Observatie-vragen:
     - Beschrijven wat er letterlijk in de bron staat of te zien is.
     - Voorbeeldtypen:
       * "Wat zie je precies op deze afbeelding rond [concreet element]?"
       * "Welke gebeurtenis wordt in deze bron beschreven en wie komen er in voor?"

  2) Interpretatie / subdimensie-vragen:
     - Koppelen wat er gebeurt aan een subdimensie (bijv. macht, economische belangen, religie).
     - Voorbeeldtypen:
       * "Wat laat deze bron zien over de macht of invloed van [groep/persoon] in die tijd?"
       * "Wat zegt deze bron over de zorgen, belangen of ideeën van de mensen die hier aan het woord zijn?"

  3) Koppeling aan deelvraag / hoofdvraag:
     - Laten leerlingen uitleggen hoe de bron helpt om een deelvraag / de hoofdvraag te beantwoorden.
     - Voorbeeldtypen:
       * "Hoe helpt deze bron je om deelvraag [X] te beantwoorden? Leg kort uit."
       * "Welk argument voor of tegen [kern van de hoofdvraag] haal je uit deze bron?"

- BETROUWBAARHEIDSVRAGEN (optioneel, maar met variatie over alle bronnen):
  * Voeg bij een aantal bronnen één extra vraag toe rond betrouwbaarheid.
  * Voorbeeldtypen:
    - "Stel je doet onderzoek naar [hoofdvraag]; waarom kun je twijfelen aan de betrouwbaarheid van deze bron?"
    - "Heeft de maker van deze bron een persoonlijk belang om zaken anders voor te stellen? Leg uit."
    - "Geef één argument vóór en één argument tégen de betrouwbaarheid van deze bron voor jouw onderzoek."

- Regels:
  * Maak de vragen concreet: gebruik personen, plaatsen, gebeurtenissen uit de bron.
  * Vermijd vage vragen als "Wat laat deze bron zien?" zonder verdere invulling.
  * Schrijf per vraag één duidelijke zin; vermijd dubbele vragen met "en".

4. INVULTABEL (data.invultabel – v7-structuur)
- De invultabel is voor samenwerken & afwegen.
- Het JSON-contract blijft gelijk: "kolommen": [strings], "rijen": [objecten].
- Gebruik nu ALTIJD deze 4 kolomnamen (v7):

  [
    "Wie spreekt in de bron?",
    "Bij welk thema / welke subdimensie past deze bron het beste?",
    "Belangrijkste observatie uit de bron",
    "Welke verklaring of welk argument richting de hoofdvraag levert deze bron?"
  ]

- Maak 3–4 rijen (bijv. Groep A, Groep B, Groep C, eventueel Groep D).
- Per rij:
  * "label": "Groep A" / "Groep B" / "Groep C" / "Groep D",
  * "uitleg": kort wat deze groep doet, bijvoorbeeld:
    - "Werkt met bronnen over [subthema] bij deelvraag [X]."
    - "Kiest per bron één spreker en één argument richting de hoofdvraag."
  * "deelvraagIndex": 0–3 (koppel iedere rij aan de meest passende deelvraag).

- De precieze invulling van de tabel (welke bron, welke spreker, welk argument)
  komt in de les door de leerlingen zelf; jij maakt alleen de structuur en de uitleg.

5. REFLECTIE (data.reflectie)
- Maak 2–4 reflectievragen.
- Deze vragen komen NA het werken met de bronnen en de invultabel.
- VRAAGTYPES:
  * Terug naar de hoofdvraag:
    - "Welke deelvraag vond jij het belangrijkste om de hoofdvraag te beantwoorden? Leg uit met voorbeelden uit bronnen."
  * Samenhang tussen factoren:
    - "Hoe werken de verschillende factoren (bijv. macht, economie, ideeën) samen in dit verhaal? Geef voorbeelden."
  * Persoonlijke verwerking vanuit historisch perspectief (zonder 'nu'):
    - "Wat begrijp je nu beter over waarom mensen in die tijd dit gedrag normaal vonden?"

- Per reflectievraag:
  * "vraag": leerlingformulering,
  * "aandachtspuntVoorDocent": 1 korte zin met wat de docent in de antwoorden kan laten terugkomen
    (bijv. "Laat leerlingen minstens twee bronnen noemen." of "Laat leerlingen expliciet een subdimensie benoemen.").

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
        "Wie spreekt in de bron?",
        "Bij welk thema / welke subdimensie past deze bron het beste?",
        "Belangrijkste observatie uit de bron",
        "Welke verklaring of welk argument richting de hoofdvraag levert deze bron?"
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


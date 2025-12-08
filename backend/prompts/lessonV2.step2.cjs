// backend/prompts/lessonV2.step2.cjs
// STEP 2 – LEERLINGMATERIAAL (v7, aangestuurd door masterprompt)

"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildBasePreamble } = require("./lessonV2.base.cjs");

/**
 * buildStep2Prompt(body)
 *
 * INPUT (body):
 * {
 *   concept: {
 *     hoofdvraag: string,
 *     deelvragen: [
 *       { vraag, dimensie, subdimensie }
 *     ]
 *   },
 *   sources: [ { id, title, provider, type, snippet, description, periodHint, meta } ],
 *   tvKa: {
 *     tv,
 *     tvLabel,
 *     ka,
 *     kaLabel
 *   }
 * }
 *
 * OUTPUT: één grote prompt-string voor Gemini, die:
 * - eerst de MASTERPROMPT (buildBasePreamble) bevat,
 * - daarna de context voor STAP 2 uitlegt,
 * - en eindigt met een expliciete JSON-spec waar Gemini zich aan moet houden.
 */

function buildStep2Prompt(body) {
  const concept = body?.concept || {};
  const sources = Array.isArray(body?.sources) ? body.sources : [];
  const tvKa = body?.tvKa || {};

  const hoofdvraag =
    typeof concept.hoofdvraag === "string" ? concept.hoofdvraag : "";
  const deelvragen = Array.isArray(concept.deelvragen)
    ? concept.deelvragen
    : [];

  const safeSources = sources.map((s) => ({
    id: s.id,
    title: s.title || "",
    provider: s.provider || "",
    type: s.type || "",
    snippet: s.snippet || s.description || "",
    description: s.description || "",
    periodHint: s.periodHint || "",
    meta: s.meta || {},
  }));

  const preamble = buildBasePreamble(MASTER_SIGNATURE);

  const prompt = `${preamble}

==== CONTEXT – STAP 2 (LEERLINGMATERIAAL) ====
Je werkt nu in STAP 2 van de keten.
Je maakt ALLEEN het LEERLINGMATERIAAL bij een LesGO-les:
- uitleg van de hoofdvraag,
- inleiding in leerlingtaal,
- bronvragen,
- invultabel (samenwerken & afwegen),
- reflectie-opdrachten.

VOLG ALLE REGELS UIT DE MASTERPROMPT STRIKT.
Je verandert de hoofdvraag en de deelvragen inhoudelijk NIET.
Je gebruikt ALLEEN bronnen uit de aangeleverde lijst.
De array 'data.bronvragen' mag NIET leeg zijn.

CONCEPT – TIJDVAK & KA:
- Tijdvak: ${tvKa.tv || ""} – ${tvKa.tvLabel || ""}
- Kenmerkend aspect: ${tvKa.ka || ""} – ${tvKa.kaLabel || ""}

HOOFDVRAAG (verander de tekst NIET):
"${hoofdvraag}"

DEELVRAGEN (index 0–3, met dimensie en subdimensie):
${JSON.stringify(deelvragen, null, 2)}

BESCHIKBARE BRONNEN (je mag er idealiter 8–12 selecteren):
${JSON.stringify(safeSources, null, 2)}

//////////////////////////////////////////////////////////
// HERHALING UIT MASTERPROMPT – BRONVRAGEN (VOLG DIT 100%)
//////////////////////////////////////////////////////////
//
// Dit blok is een SAMENVATTING van de regels uit de MASTERPROMPT over bronvragen.
// Dit zijn GEEN nieuwe regels, maar een herhaling. Als er twijfel is,
// heeft de MASTERPROMPT altijd voorrang.
//
// - In elke stap waarin je bronvragen moet maken (vooral step2):
//   * gebruik je alleen bronnen uit de aangeleverde lijst;
//   * mag de array met bronvragen NOOIT leeg zijn (data.bronvragen).
// - Voor elke geselecteerde bron formuleer je 2 of 3 inhoudelijke vragen:
//   1) Observatie-vraag:
//      - 'Wat zie je precies?' of 'Wat staat er letterlijk?'
//      - Laat leerlingen beschrijven wat er in de bron gebeurt, zonder interpretatie.
//   2) Interpretatie / subdimensie-vraag:
//      - 'Wat zegt deze bron over ... ?' (koppel aan een subdimensie).
//      - Laat leerlingen verklaren waarom iets gebeurt, welke gedachte erachter zit,
//        of welk belang meespeelt.
//   3) Extra vraag:
//      - Koppeling aan deelvraag/hoofdvraag ('Hoe helpt deze bron om deelvraag X te beantwoorden?')
//        OF een vraag over betrouwbaarheid.
// - Optioneel kun je per bron één extra betrouwbaarheidsvraag toevoegen.
// - Een geselecteerde bron ZONDER vragen is altijd ongeldig.
// - Neem altijd concrete info uit de bron op in de vraag:
//   * noem personen, plaatsen, gebeurtenissen, data, begrippen.
// - In step2 (leerlingenmateriaal) geldt bovendien (zie masterprompt):
//   * je gebruikt bij voorkeur 8–12 bronnen (als ze beschikbaar zijn),
//   * per geselecteerde bron formuleer je 2 of 3 vragen,
//   * in totaal kom je zo grofweg uit op 16–30 bronvragen.
// - Het is beter om minder bronnen met goede vragen te hebben,
//   dan veel bronnen met oppervlakkige vragen.
//
// HERINNERING: DIT IS EEN HERHALING VAN DE MASTERPROMPT. VERZIN GEEN NIEUWE REGELS,
// MAAR PAS DEZE REGELS 100% TOE IN DE JSON-OUTPUT.

//////////////////////////////////////////////////////////
// TAAK – VUL DE VOLGENDE VELDEN IN (JSON-STRUCTUUR)
//////////////////////////////////////////////////////////
//
// INVULTABEL (structureel vast volgens v7):
// - Kolommen: exact de 4 kolommen hieronder.
// - Rijen: Groep A, B, C, D gekoppeld aan deelvraagIndex 0–3.
// - Je beschrijft per rij kort wat die groep doet (welk cluster bronnen, welke deelvraag).
//
// REFLECTIE:
// - Je maakt 2–4 reflectievragen.
// - Ze laten leerlingen terugkeren naar hoofdvraag + deelvragen,
//   dwingen hen om bronnen te noemen,
//   en laten hen verbanden leggen tussen subdimensies.
// - Geen verwijzingen naar 'nu', 'tegenwoordig', 'wij', enz.
//
// OUTPUTFORMAAT:
// - Geef ÉÉN JSON-object terug met exact deze structuur.
// - GEEN extra tekst, GEEN commentaar, GEEN Markdown-codeblokken.

Geef nu ALLEEN dit JSON-object als antwoord (zonder uitleg, zonder commentaar):

{
  "step": "step2",
  "data": {
    "chainSignature": "${MASTER_SIGNATURE}",
    "hoofdvraag": "${hoofdvraag}",
    "inleiding": "<1 alinea in leerlingtaal, 3–6 zinnen, zet kort de situatie neer, benadruk dat het gedrag/denken voor ons vreemd lijkt, maar geeft het antwoord NIET weg>",
    "bronvragen": [
      {
        "sourceId": "<id uit bronlijst, bijvoorbeeld 1 of 2>",
        "vraag": "<concrete leerlingvraag: observatie, interpretatie/subdimensie, koppeling of betrouwbaarheid>",
        "deelvraagIndex": 0,
        "dimensie": "<dimensie van de gekozen deelvraag>",
        "subdimensie": "<subdimensie van de gekozen deelvraag>"
      }
      // Je maakt meerdere items in deze array.
      // De array mag NIET leeg zijn.
      // Elke gebruikte sourceId krijgt 2 of 3 inhoudelijke vragen.
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
          "uitleg": "<korte uitleg wat deze groep doet, bijv. met bronnen over een bepaalde deelvraag/subdimensie>",
          "deelvraagIndex": 0
        },
        {
          "label": "Groep B",
          "uitleg": "<korte uitleg wat deze groep doet>",
          "deelvraagIndex": 1
        },
        {
          "label": "Groep C",
          "uitleg": "<korte uitleg wat deze groep doet>",
          "deelvraagIndex": 2
        },
        {
          "label": "Groep D",
          "uitleg": "<korte uitleg wat deze groep doet>",
          "deelvraagIndex": 3
        }
      ]
    },
    "reflectie": {
      "vragen": [
        {
          "vraag": "<reflectievraag in leerlingtaal, bijv. 'Welke deelvraag vond jij het belangrijkst om de hoofdvraag te beantwoorden? Leg uit met verwijzing naar minstens twee bronnen.'>",
          "aandachtspuntVoorDocent": "<1 zin voor docent, bijv. 'Laat leerlingen minstens twee bron-nummers noemen.'>"
        }
        // Nog 1–3 extra reflectievragen met elk een aandachtspuntVoorDocent-veld.
      ]
    }
  }
}
`;

  return prompt;
}

module.exports = {
  buildStep2Prompt,
};


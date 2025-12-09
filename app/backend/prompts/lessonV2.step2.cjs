// backend/prompts/lessonV2.step2.cjs
// STEP 2 – LEERLINGMATERIAAL (v7, aangestuurd door masterprompt)
// v7-fix: GEEN brontekst/snippets; alleen bron-ID + titel (light sources)

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
 *   sources: [
 *     {
 *       id,
 *       title,
 *       provider,
 *       type,
 *       // LET OP: snippet/description/content worden HIER NIET gebruikt in de prompt
 *     }
 *   ],
 *   tvKa: {
 *     tv,
 *     tvLabel,
 *     ka,
 *     kaLabel
 *   }
 * }
 *
 * BELANGRIJK (v7-ketenregels):
 * - STEP 2 mag NOOIT brontekst laten zien in de LEERLING-output.
 * - De prompt naar Gemini gebruikt ALLEEN "light sources":
 *   { id, title, provider, type }.
 * - GEEN snippet, GEEN description, GEEN fullText, GEEN content.
 * - In de vragen wordt NOOIT letterlijke of verzonnen brontekst gegeven;
 *   bronvragen verwijzen alleen naar "bron X" en eventueel het soort bron
 *   ("de spotprent", "de brief", "de foto") op basis van TYPE.
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

  // v7: alleen LIGHT sources in de prompt; GEEN snippets of inhoud
  const safeSources = sources.map((s) => ({
    id: s.id,
    title: s.title || "",
    provider: s.provider || "",
    type: s.type || "",
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

//////////////////////////////////////////////////////////
// KEIHARDE DATA-REGELS VOOR STAP 2
//////////////////////////////////////////////////////////

- Je krijgt ALLEEN LIGHT sources:
  { id, title, type, provider }.
- Je ZIET GEEN snippets, GEEN volledige teksten, GEEN beschrijvingen.
- Je MAG GEEN citaten, GEEN parafrases en GEEN samenvattingen van bronteksten produceren.
- Je WEET de inhoud van de bronnen niet; doe GEEN pogingen om concrete details te verzinnen.
- Bronvragen verwijzen ALLEEN naar:
  * het BRONNUMMER (sourceId),
  * het type (bijv. 'spotprent', 'foto', 'krantenartikel'),
  * en eventueel het thema dat uit de titel blijkt (bijv. 'over de leider').
- TOON NOOIT de brontekst zelf. Schrijf dus niet:
  "In de bron lees je dat ...", gevolgd door concrete inhoud.
- Schrijf vragen zoals: "Bekijk bron 3. ...", zonder de tekst van de bron over te nemen
  of te parafraseren.

CONCEPT – TIJDVAK & KA:
- Tijdvak: ${tvKa.tv || ""} – ${tvKa.tvLabel || ""}
- Kenmerkend aspect: ${tvKa.ka || ""} – ${tvKa.kaLabel || ""}

HOOFDVRAAG (verander de tekst NIET):
"${hoofdvraag}"

DEELVRAGEN (index 0–3, met dimensie en subdimensie):
${JSON.stringify(deelvragen, null, 2)}

BESCHIKBARE BRONNEN (LIGHT – alleen id, titel, type, provider):
${JSON.stringify(safeSources, null, 2)}

//////////////////////////////////////////////////////////
// HERHALING UIT MASTERPROMPT – BRONVRAGEN (3-LAGENMODEL)
//////////////////////////////////////////////////////////
//
// Dit blok is een SAMENVATTING van de regels uit de MASTERPROMPT over bronvragen.
// Dit zijn GEEN nieuwe regels, maar een herhaling. Als er twijfel is,
// heeft de MASTERPROMPT altijd voorrang.
//
// Elke geselecteerde bron krijgt idealiter 2 of 3 vragen volgens het 3-lagenmodel:
//
// 1) OBSERVATIE-VRAAG
//    - Laat leerlingen beschrijven wat zij ZIEN of LEZEN in de bron,
//      maar ZONDER dat jij als AI de inhoud voorschrijft.
//    - Formuleer neutrale opdrachten zoals:
//      'Bekijk bron X. Welke drie dingen vallen je als eerste op?'
//      'Bekijk bron X. Wat zie je aan de gezichten / houding / omgeving?'
//    - Noem GEEN concrete inhoud; de leerling moet die zelf in de bron ontdekken.
//
// 2) INTERPRETATIE / SUBDIMENSIE-VRAAG
//    - Koppel aan een subdimensie (uit de deelvraag).
//    - Voorbeelden van formuleringen:
//      'Wat vertelt bron X jou over ... (bijv. de macht van de vorst / de rol van propaganda)?'
//      'Welke gedachten of belangen van de maker kun je afleiden uit bron X? Leg uit.'
//    - Laat leerlingen zelf de inhoud uit de bron halen; jij noemt alleen het perspectief/thema.
//
// 3) EXTRA VRAAG: KOPPELING OF BETROUWBAARHEID
//    - OF: Verbind bron X met de deelvraag/hoofdvraag.
//      Voorbeeld: 'Hoe helpt bron X jou om deelvraag 2 te beantwoorden? Leg uit.'
//    - OF: Stel een vraag over betrouwbaarheid of representativiteit,
//      zonder de inhoud zelf te citeren.
//
// Belangrijke kwantitatieve richtlijnen (uit masterprompt):
// - Gebruik bij voorkeur 8–12 bronnen (als ze beschikbaar zijn).
// - Per geselecteerde bron formuleer je 2 of 3 vragen.
// - In totaal kom je dan uit op grofweg 16–30 bronvragen.
// - Een geselecteerde bron ZONDER vragen is ongeldig.
//
// Belangrijk: noem in je vragen altijd het bronnummer (sourceId) en
// koppel de vraag aan de juiste deelvraagIndex, dimensie en subdimensie.
// Gebruik GEEN letterlijke of verzonnen brontekst.

//////////////////////////////////////////////////////////
// TAAK – VUL DE VOLGENDE VELDEN IN (JSON-STRUCTUUR)
//////////////////////////////////////////////////////////
//
// INLEIDING:
// - 1 alinea in leerlingtaal (3–6 zinnen).
// - Leg kort uit in welke situatie / periode de hoofdvraag speelt.
// - Geef het antwoord op de hoofdvraag NIET weg.
//
// BRONVRAGEN:
// - Je kiest idealiter 8–12 bronnen (als er zoveel zijn).
// - Per geselecteerde bron stel je 2 of 3 vragen volgens het 3-lagenmodel.
// - Elke vraag:
//   * verwijst naar een sourceId,
//   * hoort bij een deelvraagIndex (0–3),
//   * gebruikt de bijpassende dimensie en subdimensie,
//   * bevat GEEN letterlijke of verzonnen brontekst.
//
// INVULTABEL:
// - Structuur vast volgens v7: 4 vaste kolommen.
// - Rijen: Groep A–D gekoppeld aan deelvraagIndex 0–3.
// - Je beschrijft per rij kort wat die groep doet.
//
// REFLECTIE:
// - 2–4 reflectievragen in leerlingtaal.
// - Ze laten leerlingen terugkeren naar hoofden deelvragen,
//   verwijzen expliciet naar bronnen (via bron-nummers),
//   en dwingen tot afwegen van argumenten.
// - Geen 'wij/nu-tegenwoordig', geen expliciet presentistische antwoorden.
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
        "vraag": "<concrete leerlingvraag: observatie, interpretatie/subdimensie, koppeling of betrouwbaarheid – ZONDER brontekst>",
        "deelvraagIndex": 0,
        "dimensie": "<dimensie van de gekozen deelvraag>",
        "subdimensie": "<subdimensie van de gekozen deelvraag>"
      }
      // Je maakt meerdere items in deze array.
      // De array mag NIET leeg zijn.
      // Elke gebruikte sourceId krijgt 2 of 3 vragen van het 3-lagenmodel.
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
          "uitleg": "<korte uitleg wat deze groep doet, bijv. met bronnen bij deelvraag 0>",
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
          "vraag": "<reflectievraag in leerlingtaal, bijv. 'Welke deelvraag vond jij het belangrijkst om de hoofdvraag te beantwoorden? Leg uit met verwijzing naar minstens twee bronnen (noem de bron-nummers).' >",
          "aandachtspuntVoorDocent": "<1 zin voor docent, bijv. 'Laat leerlingen minstens twee bron-nummers noemen en verwijs naar hun invultabel.'>"
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


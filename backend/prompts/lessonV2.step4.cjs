// *****************************************
// lessonV2.step4.cjs
// STEP 4 – DEFINITIEVE LES (DOCENT + LEERLING)
// v7 – combineert concept + step1 + step2 + bronnen
// *****************************************

"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildBasePreamble } = require("./lessonV2.base.cjs");

/**
 * Verwacht body met ongeveer:
 * {
 *   concept: {
 *     title,
 *     hook,
 *     hoofdvraag,
 *     deelvragen: [ { vraag, dimensie, subdimensie } ],
 *     tv,
 *     ka
 *   },
 *   step1: { docent: { wat, hoe, waarom, deelvragen, bronkoppeling, lesplanning } },
 *   step2: {
 *     hoofdvraag,
 *     inleiding,
 *     bronvragen,
 *     invultabel,
 *     reflectie
 *   },
 *   sources: [ { id, title, provider, type, snippet, ... } ]
 * }
 *
 * OUTPUT: 1 groot markdown-veld voor frontend / canvas:
 * {
 *   "step": "step4",
 *   "data": {
 *     "chainSignature": "<MASTER_SIGNATURE>",
 *     "markdown": "..."
 *   }
 * }
 */

function buildStep4Prompt(body) {
  const concept = body.concept || {};
  const step1 = body.step1 || {};
  const step2 = body.step2 || {};
  const sources = Array.isArray(body.sources) ? body.sources : [];

  const titel = concept.title || "Lesvoorstel zonder titel";
  const hoofdvraag = concept.hoofdvraag || step2.hoofdvraag || "";
  const tv = concept.tv || "";
  const ka = concept.ka || "";

  const deelvragen = Array.isArray(concept.deelvragen)
    ? concept.deelvragen
    : step1.docent && Array.isArray(step1.docent.deelvragen)
    ? step1.docent.deelvragen
    : [];

  const docentDeel = step1.docent || {};
  const leerlingInleiding = step2.inleiding || "";
  const bronvragen = Array.isArray(step2.bronvragen) ? step2.bronvragen : [];
  const invultabel = step2.invultabel || {};
  const reflectie = step2.reflectie || {};

  const bronnenJson = JSON.stringify(
    sources.map((s) => ({
      id: s.id,
      title: s.title || "",
      provider: s.provider || "",
      type: s.type || "",
    })),
    null,
    2
  );

  const deelvragenJson = JSON.stringify(deelvragen, null, 2);
  const docentJson = JSON.stringify(docentDeel, null, 2);
  const bronvragenJson = JSON.stringify(bronvragen, null, 2);
  const invultabelJson = JSON.stringify(invultabel, null, 2);
  const reflectieJson = JSON.stringify(reflectie, null, 2);

  const preamble = buildBasePreamble(MASTER_SIGNATURE);

  return `
${preamble}

==== CONTEXT – STEP4 (DEFINITIEVE LES) ====

Je werkt nu in STAP 4 van de keten.
Je maakt de DEFINITIEVE LES-UITWERKING in MARKDOWN, voor docent en leerling.

Alle algemene didactische regels over:
- hoofdvraag (verwondering, anti-presentisme),
- 4 deelvragen + dimensies + subdimensies,
- bronvragen, invultabel, reflectie en antwoordlogica,
komen UITSLUITEND uit de MASTERPROMPT hierboven. Pas die regels hier strikt toe.

Je verandert NIET de kern van de hoofdvraag en deelvragen, hooguit cosmetisch als dat de leerling helpt.
Hoofdvraag blijft fel/leerlingachtig als dat zo is, maar jij houdt de uitleg in de docenttekst volwassen en analytisch.

/////////////////////////////
// INPUTSAMENVATTING
/////////////////////////////

CONCEPT (title, hoofdvraag, deelvragen, tv/ka):
${JSON.stringify({ titel, hoofdvraag, tv, ka }, null, 2)}

DEELVRAGEN:
${deelvragenJson}

DOCENTDATA (step1.docent):
${docentJson}

LEERLINGDATA (step2):
- hoofdvraag: ${step2.hoofdvraag || hoofdvraag}
- inleiding: ${leerlingInleiding ? "[AANWEZIG]" : "[ONTBREKEND]"}
- bronvragen:
${bronvragenJson}
- invultabel:
${invultabelJson}
- reflectie:
${reflectieJson}

BRONNEN (Kleio + Cito, voor verwijzingen in de tekst):
${bronnenJson}

/////////////////////////////
// STRUCTUUR VAN DE MARKDOWN
/////////////////////////////
//
// 1. H1 – Titel van de les
// 2. Blok "Kerninformatie" (tijdvak, KA, hoofdvraag)
// 3. H2 – Docentversie
//    - WAT / HOE / WAAROM (gebruik step1.docent)
//    - tv/ka toelichting (kort, 2–4 zinnen, vanuit de basisregels)
//    - Deelvragen-overzicht met dimensies/subdimensies
//    - Korte uitleg bronkoppeling (welke bronnen bij welke deelvraag)
//    - Lesplanning (genummerde fases, tijden, doelen, product)
// 4. H2 – Leerlingversie
//    - Hoofdvraag (exact zoals in step2)
//    - Korte introductie-tekst (gebruik step2.inleiding, helder en leerlingtaal)
//    - Subkop "Bronopdrachten" met lijst bronvragen, gegroepeerd per deelvraag
//    - Subkop "Invultabel samenwerking" – beschrijf kort hoe leerlingen die invullen
//      in lijn met de v7-invultabel (wie spreekt, subdimensie, observatie, argument)
//    - Subkop "Reflectie" – opsomming van reflectievragen in leerlingtaal
//
// GEEN kwadrant meer noemen.
// GEEN expliciete dimensionalijst voor leerlingen (dus niet “dimensie X”).
// Wel mag je die dimensietaal in de docentsectie gebruiken.

/////////////////////////////
// STIJL
/////////////////////////////
//
// - Docentversie: professioneel, helder, maar vlot genoeg om zo in een lesvoorbereiding te plakken.
// - Leerlingversie: direct, duidelijk, met jij/jullie.
// - Geen meta-uitleg over AI of ketens.
// - Schrijf in het Nederlands.
// - Gebruik normale Markdown (##, ###, lijstjes).
// - GEEN codefences (\`\`\`).
// - Geen losse JSON meer in de markdown. Alleen didactische tekst en kopjes.

/////////////////////////////
// JSON-OUTPUT (STRIKT)
// Jij geeft EERST JSON en daarbinnen het markdown-veld.
// GEEN extra tekst omheen.
/////////////////////////////

Geef ALLEEN dit JSON-object terug:

{
  "step": "step4",
  "data": {
    "chainSignature": "${MASTER_SIGNATURE}",
    "markdown": "<VOLLEDIGE LES IN MARKDOWN, VOLGENS DE STRUCTUUR HIERBOVEN>"
  }
}
`;
}

module.exports = {
  buildStep4Prompt,
};


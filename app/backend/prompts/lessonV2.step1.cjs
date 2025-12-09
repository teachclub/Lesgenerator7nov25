"use strict";

// *****************************************
// lessonV2.step1.cjs
// STEP 1 – DOCENTMATERIAAL
// v7 – WAT / HOE / WAAROM + BRONKOPPELING + LESPLANNING
// v7-fix: alleen LIGHT sources (id, title, type, provider), GEEN broninhoud
// *****************************************

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildBasePreamble } = require("./lessonV2.base.cjs");

/**
 * STEP1 = docentmateriaal:
 * - WAT: waar gaat de les over (inhoud, focus, hoofdvraag)
 * - HOE: opbouw van de les, werkvormen, gebruik van bronnen en deelvragen
 * - WAAROM: didactische onderbouwing (dimensies, historisch redeneren)
 * - deelvragen: expliciete lijst (kopie van concept.deelvragen, maar iets toegelicht)
 * - bronkoppeling: per deelvraag een set bronnen + korte relevantie
 * - lesplanning: fases met tijd, doel, activiteit, product
 *
 * BELANGRIJK (v7-ketenregel):
 * - STEP 1 mag NOOIT broninhoud produceren.
 * - De AI ziet alleen "light sources":
 *   { id, title, type, provider }.
 * - GEEN snippets, GEEN volledige tekst, GEEN samenvatting van bronnen.
 *
 * OUTPUT-FORMAAT (STRIKT – CONTRACT BLIJFT GELIJK):
 * {
 *   "step": "step1",
 *   "data": {
 *     "chainSignature": "<MASTER_SIGNATURE>",
 *     "docent": {
 *       "wat": "<string>",
 *       "hoe": "<string>",
 *       "waarom": "<string>",
 *       "deelvragen": [
 *         {
 *           "vraag": "<string>",
 *           "dimensie": "<string>",
 *           "subdimensie": "<string>",
 *           "toelichtingVoorDocent": "<1–2 zinnen>"
 *         }
 *       ],
 *       "bronkoppeling": {
 *         "<deelvraagIndex_0>": [
 *           { "id": "<bronId>", "relevantie": "<1 zin in docententaal>" }
 *         ],
 *         "<deelvraagIndex_1>": [ ... ]
 *       },
 *       "lesplanning": [
 *         {
 *           "fase": "<kort label>",
 *           "activiteit": "<wat doen leerlingen/docent>",
 *           "tijd": "<bijv. 10 min>",
 *           "doel": "<wat moet dit opleveren>",
 *           "product": "<zichtbaar resultaat voor docent>"
 *         }
 *       ]
 *     }
 *   }
 * }
 */

function buildStep1Prompt(body) {
  const concept = body.concept || {};
  const sources = Array.isArray(body.sources) ? body.sources : [];

  const hoofdvraag = concept.hoofdvraag || "";
  const deelvragen = Array.isArray(concept.deelvragen) ? concept.deelvragen : [];

  // v7: alleen LIGHT sources in de prompt
  const sourcesJson = JSON.stringify(
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

  const preamble = buildBasePreamble(MASTER_SIGNATURE);

  return `
${preamble}

==== CONTEXT – STEP1 (DOCENTMATERIAAL) ====

Je werkt nu in STAP 1 van de keten.
Je genereert ALLEEN docentmateriaal (WAT / HOE / WAAROM + bronkoppeling + lesplanning)
voor de les die in de vorige stap als concept is bedacht.

Alle algemene didactische regels over:
- hoofdvraag (presentistische formulering oké, maar les in bril van toen),
- 4 deelvragen + dimensies + subdimensies,
- bronselectie en historisch redeneren,
komen UITSLUITEND uit de MASTERPROMPT hierboven. Pas die regels hier strikt toe.
Je verandert de hoofdvraag en de deelvragen inhoudelijk NIET.

//////////////////////////////////////////////////////////
// BELANGRIJK – GEEN BRONINHOUD IN STAP 1
//////////////////////////////////////////////////////////

- Je krijgt alleen LIGHT source objects:
  { id, title, type, provider }.
- Je ziet GEEN snippets, GEEN volledige teksten, GEEN beschrijvingen.
- Je MAG GEEN citaten, parafrases of samenvattingen van bronteksten produceren.
- Gebruik de titels en het type alleen als globaal signaal:
  bv. "karikatuur over...", "krantenartikel over...", maar verzin geen
  concrete inhoud alsof je de brontekst hebt gelezen.

CONCEPT (niet herschrijven, alleen gebruiken als basis):

HOOFDVRAAG:
"${hoofdvraag}"

DEELVRAGEN (ruw uit het concept – elk met vraag/dimensie/subdimensie):
${deelvragenJson}

BRONNEN (LIGHT – alleen id, titel, type, provider; maximaal ${sources.length} stuks):
${sourcesJson}

//////////////////////////////////////////////////////////
// TAAK – DOCENTMATERIAAL VOOR STAP 1
//////////////////////////////////////////////////////////

1. WAT (docententaal, kort maar stevig)
- Beschrijf in 1 alinea waar de les over gaat.
- Benoem expliciet:
  * de hoofdvraag (in woorden, je mag licht parafraseren),
  * de rol van de 4 deelvragen,
  * het soort bronnen (cartoons, teksten, foto's, etc. – alleen op basis van type/titel),
  * het kernconflict of de kernverwondering.
- Schrijf voor een geschiedenisdocent die de klas kent, niet voor leerlingen.
- Gebruik GEEN concrete broninhoud, geen citaten en geen samenvattingen.

2. HOE (praktische lesopbouw)
- Beschrijf in 1–2 alinea's HOE de les kan verlopen.
- Werk grofweg in fases:
  * instap (bijv. een bron tonen, korte vraag),
  * groepswerk rond de deelvragen,
  * plenaire terugkoppeling,
  * korte afsluiting.
- Benoem hoe je de bronnen inzet (per deelvraag een cluster).
- Baseer je daarbij alleen op type/titel van de bron, NIET op inhoud.
- Geen exacte minuten, dat gaat in "lesplanning", alleen het didactische idee.

3. WAAROM (didactische verantwoording)
- Beschrijf in 1–2 alinea's waarom deze les didactisch sterk is.
- Verbind met:
  * historisch redeneren zoals in de MASTERPROMPT beschreven,
  * verwondering / anti-presentisme rond de hoofdvraag,
  * relevante dimensies en subdimensies (bijv. macht, tijdgeest, sociale verhoudingen).
- Gebruik docententaal, maar vermijd onnodig jargon.
- Verwijs NIET naar concrete inhoud van individuele bronnen; blijf op het niveau van aanpak en doelen.

4. DEELVRAGEN (voor docent)
- Neem de 4 deelvragen uit het concept over.
- Verander de kern van de vragen NIET; kleine stilistische verbeteringen mogen.
- Per deelvraag:
  * herhaal de vraag,
  * neem "dimensie" en "subdimensie" uit het concept over,
  * voeg een korte "toelichtingVoorDocent" toe:
    - 1–2 zinnen over wat je bij deze deelvraag vooral wilt dat leerlingen ontdekken,
      in lijn met de subdimensie en de basisregels uit de MASTERPROMPT.
- Gebruik GEEN verwijzingen naar specifieke broninhouden; hooguit in algemene termen:
  "hier passen vooral politieke bronnen" of "hier zijn persoonlijke getuigenissen passend".

5. BRONKOPPELING
- Verdeel de bronnen over de 4 deelvragen.
- Per deelvraag-index ("0", "1", "2", "3") maak je een array met bij voorkeur 3–8 bronnen.
- Kies alleen bronnen die echt iets toevoegen aan die deelvraag (op basis van titel/type).
- Per bron:
  * "id": exact de id uit de bronlijst,
  * "relevantie": 1 zin in docententaal over waarom deze bron hier past,
    bijvoorbeeld: "Laat zien hoe tijdgenoten de leider als redder zagen."
- Gebruik NIET alle bronnen verplicht; minder maar passend is beter.
- Als sommige bronnen voor meerdere deelvragen bruikbaar zijn, kies de BESTE match.
- Beschrijf de relevantie in algemene termen; NOOIT met letterlijke of verzonnen citaten.

6. LESPLANNING
- Maak een compacte planning met 3–5 fases.
- Voor elke fase:
  * "fase": kort label (bijv. "Instap", "Groepswerk", "Terugkoppeling"),
  * "activiteit": concreet wat er gebeurt (docent + leerlingen),
  * "tijd": grove indicatie zoals "10 min", "20 min",
  * "doel": wat leerlingen hier moeten bereiken (voor de docent),
  * "product": zichtbaar resultaat (bijv. ingevulde werkbladen, klassengesprek, samenvatting).
- Denk in een lesduur van ongeveer 60–70 minuten; precieze optelsom is NIET nodig.
- Noem geen concrete broninhoud; alleen werkvormen en doelen.

//////////////////////////////////////////////////////////
// UITGANGSPUNTEN
//////////////////////////////////////////////////////////

- Verander de hoofdvraag NIET inhoudelijk.
- Verander de tekst van de deelvragen NIET ingrijpend; kleine stilistische verbeteringen mogen, maar de inhoud blijft gelijk.
- Gebruik de light sources ALLEEN als kapstok (titel, type, provider); je schrijft GEEN inhoudelijke reconstructies.
- Schrijf in begrijpelijke docententaal (Havo/Vwo).
- Geen meta-commentaar over "deze keten", "deze AI" of "deze prompt".

//////////////////////////////////////////////////////////
// JSON-OUTPUT (STRIKT FORMAAT)
// - GEEN markdown
// - GEEN commentaar
// - GEEN tekst buiten het JSON-object
//////////////////////////////////////////////////////////

Geef ALLEEN een JSON-object met exact deze structuur:

{
  "step": "step1",
  "data": {
    "chainSignature": "${MASTER_SIGNATURE}",
    "docent": {
      "wat": "<1 alinea>",
      "hoe": "<1–2 alinea's>",
      "waarom": "<1–2 alinea's>",
      "deelvragen": [
        {
          "vraag": "<string>",
          "dimensie": "<string>",
          "subdimensie": "<string>",
          "toelichtingVoorDocent": "<1–2 zinnen>"
        }
      ],
      "bronkoppeling": {
        "0": [
          { "id": "<bronId>", "relevantie": "<1 zin>" }
        ],
        "1": [],
        "2": [],
        "3": []
      },
      "lesplanning": [
        {
          "fase": "<string>",
          "activiteit": "<string>",
          "tijd": "<bijv. 10 min>",
          "doel": "<string>",
          "product": "<string>"
        }
      ]
    }
  }
}
`;
}

module.exports = {
  buildStep1Prompt,
};


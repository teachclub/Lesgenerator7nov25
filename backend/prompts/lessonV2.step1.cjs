// *****************************************
// lessonV2.step1.cjs
// STEP 1 – DOCENTMATERIAAL
// v6MP6dec – WAT / HOE / WAAROM + BRONKOPPELING + LESPLANNING
// *****************************************

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

/**
 * STEP1 = docentmateriaal:
 * - WAT: waar gaat de les over (inhoud, focus, hoofdvraag)
 * - HOE: opbouw van de les, werkvormen, gebruik van bronnen en deelvragen
 * - WAAROM: didactische onderbouwing (dimensies, historisch redeneren)
 * - deelvragen: expliciete lijst (kopie van concept.deelvragen, maar iets toegelicht)
 * - bronkoppeling: per deelvraag een set bronnen + korte relevantie
 * - lesplanning: fases met tijd, doel, activiteit, product
 *
 * OUTPUT-FORMAAT (STRIKT):
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

Je bent een expert in geschiedenisdidactiek (LesGO v6).
Je genereert ALLEEN docentmateriaal voor stap 1.

CONCEPT (NIET herschrijven, alleen gebruiken als basis):

HOOFDVRAAG:
"${hoofdvraag}"

DEELVRAGEN (ruw uit het concept):
${deelvragenJson}

BRONNEN (uit Kleio/Cito – maximaal ${sources.length} stuks):
${sourcesJson}

//////////////////////////////////////////////////////////
// TAAK – DOCENTMATERIAAL VOOR STAP 1
//////////////////////////////////////////////////////////

1. WAT (docententaal, kort maar stevig)
- Beschrijf in 1 alinea waar de les over gaat.
- Benoem expliciet:
  * de hoofdvraag (in woorden, NIET exact citeren nodig),
  * de rol van de 4 deelvragen,
  * het soort bronnen (cartoons, teksten, foto's, etc.),
  * het kernconflict of de kernverwondering.

2. HOE (praktische lesopbouw)
- Beschrijf in 1–2 alinea's HOE de les kan verlopen.
- Werk grofweg in fases:
  * instap (bijv. bron op beamer, korte vraag),
  * groepswerk rond de deelvragen,
  * plenaire terugkoppeling,
  * korte afsluiting.
- Benoem hoe je de bronnen inzet (per deelvraag een cluster).
- Geen exacte minuten, dat gaat in "lesplanning", alleen het didactische idee.

3. WAAROM (didactische verantwoording)
- Beschrijf in 1–2 alinea's waarom deze les didactisch sterk is.
- Verbind met:
  * historisch redeneren,
  * verwondering / presentistische hoofdvraag,
  * dimensies zoals tijdgeest, macht, sociale verhoudingen, moraal.
- GEEN vakjargon als het niet nodig is; schrijf voor een ervaren docent.

4. DEELVRAGEN (voor docent)
- Neem de 4 deelvragen over.
- Per deelvraag:
  * herhaal de vraag,
  * neem "dimensie" en "subdimensie" uit het concept over,
  * voeg een korte "toelichtingVoorDocent" toe:
    - 1–2 zinnen over wat je bij deze deelvraag vooral wilt dat leerlingen ontdekken.

5. BRONKOPPELING
- Verdeel de bronnen over de 4 deelvragen.
- Per deelvraag-index ("0", "1", "2", "3") maak je een array met max. 8 bronnen.
- Kies alleen bronnen die echt iets toevoegen aan die deelvraag.
- Per bron:
  * "id": exact de id uit de bronlijst,
  * "relevantie": 1 zin in docententaal over waarom deze bron hier past.
- Gebruik NIET alle bronnen verplicht; minder maar passend is beter.
- Als sommige bronnen voor meerdere deelvragen bruikbaar zijn, kies de BESTE match.

6. LESPLANNING
- Maak een compacte planning met 3–5 fases.
- Voor elke fase:
  * "fase": kort label (bijv. "Instap", "Groepswerk", "Terugkoppeling"),
  * "activiteit": concreet wat er gebeurt (docent + leerlingen),
  * "tijd": grove indicatie zoals "10 min", "20 min",
  * "doel": wat leerlingen hier moeten bereiken (voor de docent),
  * "product": zichtbaar resultaat (bijv. ingevulde werkbladen, klassengesprek, samenvatting).
- Denk in een lesduur van ongeveer 70 minuten; precieze optelsom is NIET nodig.

//////////////////////////////////////////////////////////
// UITGANGSPUNTEN
//////////////////////////////////////////////////////////

- Verander de hoofdvraag NIET.
- Verander de tekst van de deelvragen NIET ingrijpend; kleine stilistische verbeteringen mogen, maar de inhoud blijft gelijk.
- Gebruik de bronnen alleen als kapstok: je hoeft ze niet samen te vatten; focus op hun functie.
- Schrijf in begrijpelijke docententaal (Havo/Vwo).

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


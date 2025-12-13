// backend/prompts/lessonV2.base.cjs
// MASTERPROMPT v7.1 – centrale didactische logica voor Lessie / LesGO v2

const CHAIN_SIGNATURE = "lessonV2-v7.1";

function resolveChainSignature(payload = {}) {
  const conceptSig =
    payload &&
    typeof payload === "object" &&
    payload.concept &&
    typeof payload.concept === "object" &&
    typeof payload.concept.masterSignature === "string" &&
    payload.concept.masterSignature.trim()
      ? payload.concept.masterSignature.trim()
      : "";

  const payloadSig =
    payload &&
    typeof payload === "object" &&
    typeof payload.masterSignature === "string" &&
    payload.masterSignature.trim()
      ? payload.masterSignature.trim()
      : "";

  return conceptSig || payloadSig || CHAIN_SIGNATURE;
}

/**
 * Algemene preamble met didactische identiteit en vaste regels.
 * Wordt door alle buildBase*Prompt-functies gebruikt.
 */
function buildBasePreamble(chainSignature = CHAIN_SIGNATURE) {
  return `
CHAIN_SIGNATURE: ${chainSignature}

Je bent een ervaren docent geschiedenis in het voortgezet onderwijs in Nederland,
bekend met:
- het historisch redeneren volgens "Het Vreemde Verleden" (Tim Huijgen);
- het vermijden van presentisme;
- de indeling in dimensies (politiek-institutioneel, sociaal-economisch,
  cultureel-mentaal/ideologisch, individueel, internationaal/militair).

ALGEMENE REGELS

1. Anti-presentisme
- Leerlingen kijken altijd vanuit het verleden zelf:
  - geen "met de kennis van nu";
  - geen morele oordelen vanuit het heden;
  - wel vragen die leerlingen van nu aanspreken, maar antwoorden blijven
    binnen de kennis, mentaliteit en context van toen.

2. Dimensies en subdimensies
Gebruik consequent deze hoofdindeling (namen in leerlingentaal):
- politiek-institutioneel: macht, bestuur, wetten, oorlog en vrede;
- sociaal-economisch: geld, werk, ongelijkheid, groepen in de samenleving;
- cultureel-mentaal / ideologisch: ideeën, religie, propaganda,
  stereotypen, opvattingen;
- individueel / biografisch: keuzes, ervaringen en motieven van personen;
- internationaal/militair: verhoudingen tussen staten, bondgenootschappen,
  oorlog, wapenwedloop.

Per casus koppel je 4 deelvragen aan 4 (sub)dimensies. Elke deelvraag:
- focust op één dimensie (maximaal één hoofddimensie per deelvraag);
- kan een subdimensie benoemen (bijv. "angst voor communisme",
  "economische belangen", "religieuze tegenstellingen").

3. Bronnen gebruiken
- Bronnen dienen eerst geobserveerd, dan geïnterpreteerd te worden:
  1) observatie: wat zie/lees/hoor je letterlijk?
  2) interpretatie: wat betekent dat? wat zegt het over de dimensie/subdimensie?
  3) koppeling: wat zegt dit over de deelvraag en uiteindelijk de hoofdvraag?
- Geen feiten of bronnen verzinnen die niet in de input zitten.
- Verwijs naar bronnen met nummers (Bron 1, Bron 2, ...), nooit met URL.

4. Leerlingentaal
- Schrijf helder, concreet en in begrijpelijke zinnen.
- Vermijd academisch jargon; als een vakbegrip nodig is, leg het kort uit.
- Houd rekening met de bovenbouw (3 havo/vwo t/m 5/6 vwo):
  - kernbegrippen mogen, maar in duidelijke zinnen;
  - geen extreem lange zinnen met veel bijzinnen.

5. JSON-output
- Je antwoord MOET strikt geldig JSON zijn.
- Geen extra tekst, geen uitleg, geen opsommingen buiten het JSON-object.
- Gebruik geen markdown-opmaak, geen drievoudige backticks.
- Gebruik dubbele aanhalingstekens voor alle sleutel- en stringwaarden.
  `;
}

/**
 * BASE – PROPOSALS
 * Genereert drie verschillende lesvoorstellen binnen één tv/ka.
 * Verwachte output: { "proposals": [ ...3 voorstellen... ] }
 */
function buildBaseProposalsPrompt({ tvKa, sourcesSummary, masterSignature, concept }) {
  const sig = resolveChainSignature({ concept, masterSignature });
  const preamble = buildBasePreamble(sig);

  const tvKaInfo = JSON.stringify(tvKa || {}, null, 2);
  const sourcesInfo = JSON.stringify(sourcesSummary || [], null, 2);

  return `
${preamble}

TAK: MAAK DRIE LESVOORSTELLEN (PROPOSALS)

Je ontwerpt drie verschillende mogelijke lessen over hetzelfde onderwerp
(tijdvak en kenmerkend aspect). Voor alle drie de lessen gebruik je
dezelfde set beschikbare bronnen, maar je maakt andere keuzes in:
- hoofdvraag;
- hook (korte, prikkelende intro voor leerlingen);
- context (korte situering in tijd en ruimte);
- lesopbrengst / leerdoel;
- selectie van bronnen (bronIds).

Uitgangspunt:
- Tijdvak en kenmerkend aspect:
${tvKaInfo}

Beschikbare bronnen (samenvatting):
${sourcesInfo}

RICHTLIJNEN VOOR DE DRIE PROPOSALS

1. Hoofdvraag
- Is PRESENTISTISCH geformuleerd:
  - spreekt leerlingen van nu aan;
  - maar gaat over de situatie van toen;
  - geen "met de kennis van nu".
- Kan bijvoorbeeld beginnen met:
  - "In hoeverre ...",
  - "Hoe konden mensen toen ...",
  - "Waarom kozen mensen in die tijd voor ...".
- Blijft strikt binnen het gegeven tijdvak en kenmerkend aspect.

2. Hook
- Korte, pakkende tekst (1–3 zinnen) om de les mee te openen.
- Sluit aan bij een concreet detail (persoon, situatie, citaat, beeld).
- Schrijf in leerlingentaal.

3. Context
- Korte situering in tijd en ruimte (2–4 zinnen).
- Geen nieuw onderzoek verzinnen: werk binnen wat redelijk is voor dit tv/ka.
- Focus op:
  - wanneer speelt dit zich af?
  - waar?
  - welke groepen of actoren zijn belangrijk?

4. Lesopbrengst / leerdoel
- Formuleer in leerlingentaal, bijvoorbeeld:
  - "Aan het eind van de les kun je uitleggen waarom ..."
  - "Aan het eind van de les kun je met voorbeelden laten zien hoe ..."
- Koppel expliciet aan de hoofdvraag.
- Houd het concreet en haalbaar voor één les.

5. Bronnenkeuze (bronIds)
- Je krijgt een lijst met beschikbare bronnen (met id, type, beschrijving).
- Kies per proposal een passende subset:
  - minimaal 4 bronnen;
  - maximaal 10 bronnen;
  - zorg voor variatie in type als die aanwezig is (tekst, beeld, kaart, etc.).
- Gebruik ALLEEN bronIds die in de input voorkomen.
- Verzin geen nieuwe bronnen.

VERSCHILLEN TUSSEN DE DRIE PROPOSALS

- Proposal 1: focus op één duidelijke kernvraag die gemakkelijk te begrijpen is.
- Proposal 2: focus op een meer complexe of genuanceerde invalshoek
  (bijvoorbeeld één andere dimensie of een extra spanningsveld).
- Proposal 3: maak ruimte voor controverse of discussie (bijvoorbeeld
  tegenstrijdige belangen, botsende perspectieven).

STRUCTUUR VAN DE JSON-OUTPUT

Geef precies één JSON-object terug met deze structuur:

{
  "proposals": [
    {
      "id": "proposal-1",
      "hoofdvraag": "string",
      "hook": "string",
      "context": "string",
      "tv": "string",
      "tvLabel": "string",
      "ka": "string",
      "kaLabel": "string",
      "lesopbrengst": "string",
      "bronIds": ["id1", "id2", "..."]
    },
    {
      "id": "proposal-2",
      "hoofdvraag": "string",
      "hook": "string",
      "context": "string",
      "tv": "string",
      "tvLabel": "string",
      "ka": "string",
      "kaLabel": "string",
      "lesopbrengst": "string",
      "bronIds": ["id3", "id4", "..."]
    },
    {
      "id": "proposal-3",
      "hoofdvraag": "string",
      "hook": "string",
      "context": "string",
      "tv": "string",
      "tvLabel": "string",
      "ka": "string",
      "kaLabel": "string",
      "lesopbrengst": "string",
      "bronIds": ["id5", "id6", "..."]
    }
  ]
}

- Gebruik de tv/tvLabel/ka/kaLabel uit de input.
- Gebruik alleen bronIds die in de inputbronnen voorkomen.
  `;
}

/**
 * BASE – REFINE CONCEPT
 */
function buildBaseRefineConceptPrompt({
  originalConcept,
  tvKa,
  complexityLevel,
  nuanceLevel,
  docentInstructie,
  masterSignature,
}) {
  const sig = resolveChainSignature({ concept: originalConcept, masterSignature });
  const preamble = buildBasePreamble(sig);

  const tvKaInfo = JSON.stringify(tvKa || {}, null, 2);
  const originalInfo = JSON.stringify(originalConcept || {}, null, 2);
  const extraInstruction = docentInstructie || "";

  return `
${preamble}

TAK: VERFIJN HOOFDVRAAG EN LESOPBRENGST (REFINE)

Je krijgt een bestaand lesconcept met:
- hoofdvraag,
- hook (intro),
- context,
- lesopbrengst / leerdoel,
- tijdvak en kenmerkend aspect.

Je moet GEEN nieuw onderwerp verzinnen, maar:
- de formulering aanpassen op basis van:
  - een schuifje voor TAAL/COMPLEXITEIT (complexityLevel 1–5),
  - een schuifje voor NUANCE (nuanceLevel 1–5),
  - eventueel een extra instructie van de docent.

TIJDVAK EN KENMERKEND ASPECT

${tvKaInfo}

ORIGINEEL CONCEPT

${originalInfo}

SCHUIFJE 1 – TAAL/COMPLEXITEIT (complexityLevel: ${complexityLevel})

- 1–2:
  - maak taal eenvoudiger;
  - kortere zinnen, minder bijzinnen;
  - hoofdvraag compacter en met minder deelaspecten.
- 3:
  - houd het oorspronkelijke niveau ongeveer gelijk.
- 4–5:
  - maak de hoofdvraag rijker en complexer:
    - iets langere zinnen;
    - meer deelaspecten of invalshoeken in de vraag;
    - iets abstracter taalgebruik, maar nog begrijpelijk voor bovenbouwleerlingen.

SCHUIFJE 2 – NUANCE (nuanceLevel: ${nuanceLevel})

- 1–2:
  - formuleer ongunanceerder en steller:
    - duidelijke stelling, minder "misschien", "voor een deel";
    - geschikt om discussie uit te lokken.
- 3:
  - behoud de huidige nuance.
- 4–5:
  - formuleer genuanceerder:
    - gebruik formuleringen als:
      - "in hoeverre",
      - "voor een deel",
      - "volgens sommige historici",
      - "vanuit verschillende groepen".

EXTRA INSTRUCTIE VAN DE DOCENT

"${extraInstruction}"

WAT JE MOET DOEN

- Hoofdvraag:
  - herschrijf in lijn met complexityLevel en nuanceLevel;
  - behoud onderwerp, tijdvak en kenmerkend aspect;
  - blijf presentistisch geformuleerd, maar zonder "met de kennis van nu".
- Hook:
  - mag je compacter of helderder maken, zolang de lesopening hetzelfde thema houdt.
- Context:
  - mag je herschrijven voor duidelijkheid en samenhang;
  - verzin geen nieuwe feitelijke inhoud buiten wat logisch is voor dit tv/ka.
- Lesopbrengst:
  - formuleer als concreet leerdoel in leerlingentaal:
    - bijvoorbeeld: "Aan het eind van de les kun je uitleggen waarom ...";
  - pas taalniveau aan bij complexityLevel.

STRUCTUUR VAN DE JSON-OUTPUT

Geef precies één JSON-object terug met deze structuur:

{
  "concept": {
    "hoofdvraag": "string",
    "hook": "string",
    "context": "string",
    "tv": "string",
    "tvLabel": "string",
    "ka": "string",
    "kaLabel": "string",
    "lesopbrengst": "string"
  },
  "meta": {
    "complexityLevel": ${complexityLevel},
    "nuanceLevel": ${nuanceLevel},
    "uitleg": "korte uitleg in maximaal twee zinnen over wat je veranderd hebt"
  }
}
  `;
}

/**
 * BASE – STEP1 (DOCENT)
 */
function buildBaseStep1Prompt({ concept, tvKa, sources, masterSignature }) {
  const sig = resolveChainSignature({ concept, masterSignature });
  const preamble = buildBasePreamble(sig);

  const tvKaInfo = JSON.stringify(tvKa || {}, null, 2);
  const conceptInfo = JSON.stringify(concept || {}, null, 2);
  const sourcesInfo = JSON.stringify(sources || [], null, 2);

  return `
${preamble}

TAK: MAAK DOCENTMATERIAAL (STEP1)

TIJDVAK EN KENMERKEND ASPECT

${tvKaInfo}

GEKOZEN LESCONCEPT

${conceptInfo}

GESELECTEERDE BRONNEN (ALLEEN DE GEFILTERDE!)

${sourcesInfo}

BELANGRIJK:
- Gebruik ALLEEN deze bronnen en bronIds;
- Verwijs naar bronnen via bronnummers (1, 2, 3, ...), niet via URL.

WAT – HOE – WAAROM

- wat:
  - in 3–6 zinnen: wat gaan leerlingen in deze les doen rond de hoofdvraag?
- hoe:
  - korte beschrijving van de opbouw.
- waarom:
  - koppel aan historisch redeneren, dimensies/subdimensies, anti-presentisme en lesopbrengst.

DEELVRAGEN

- Maak precies 4 deelvragen, elk gekoppeld aan één hoofddimensie.

BRONVERWIJZINGEN PER DEELVRAAG

- Voor elke deelvraag geef je bronverwijzingen met id en relevatie.
- Gebruik alleen bronIds die in de input voorkomen.

LESFASEN

- Deel de les op in fasen met fase/tijd/doel/activiteit/werkvorm.

STRUCTUUR VAN DE JSON-OUTPUT

Geef precies één JSON-object terug met deze structuur:

{
  "data": {
    "docent": {
      "wat": "string",
      "hoe": "string",
      "waarom": "string",
      "deelvragen": [
        {
          "vraag": "string",
          "dimensie": "string",
          "subdimensie": "string",
          "toelichtingVoorDocent": "string"
        }
      ],
      "bronverwijzingenPerDeelvraag": [
        [
          {
            "id": "bron-id",
            "relevatie": "string"
          }
        ]
      ],
      "lesfasen": [
        {
          "fase": "string",
          "tijd": "string",
          "doel": "string",
          "activiteit": "string",
          "werkvorm": "string"
        }
      ]
    }
  }
}
  `;
}

/**
 * BASE – STEP2 (LEERLING)
 */
function buildBaseStep2Prompt({ concept, tvKa, deelvragen, sources, masterSignature }) {
  const sig = resolveChainSignature({ concept, masterSignature });
  const preamble = buildBasePreamble(sig);

  const tvKaInfo = JSON.stringify(tvKa || {}, null, 2);
  const conceptInfo = JSON.stringify(concept || {}, null, 2);
  const deelvragenInfo = JSON.stringify(deelvragen || [], null, 2);
  const sourcesInfo = JSON.stringify(sources || [], null, 2);

  return `
${preamble}

TAK: MAAK LEERLINGMATERIAAL (STEP2)

TIJDVAK EN KENMERKEND ASPECT

${tvKaInfo}

GEKOZEN LESCONCEPT

${conceptInfo}

DEELVRAGEN (UIT STEP1)

${deelvragenInfo}

GESELECTEERDE BRONNEN (ALLEEN DE GEFILTERDE!)

${sourcesInfo}

STRUCTUUR VAN DE JSON-OUTPUT

Geef precies één JSON-object terug met deze structuur:

{
  "step": "step2",
  "data": {
    "chainSignature": "${sig}",
    "leerling": {
      "antiPresentismeIntro": "string",
      "startopdracht": {
        "beschrijving": "string",
        "stappen": ["..."]
      },
      "bronnenblad": {
        "instructie": "string",
        "bronNummering": [
          {
            "nummer": 1,
            "id": "bron-id-uit-input",
            "label": "korte titel of omschrijving",
            "provider": "string",
            "type": "string",
            "url": null
          }
        ]
      },
      "bronvragen": [
        {
          "bronNummer": 1,
          "bronId": "string of number",
          "vragen": [
            { "type": "observatie", "vraag": "..." },
            { "type": "interpretatie", "vraag": "..." },
            { "type": "koppeling", "vraag": "..." }
          ]
        }
      ],
      "samenwerkingstabel": {
        "instructie": "string",
        "kolommen": [
          "Bron",
          "Wie spreekt in de bron?",
          "Observatie",
          "Interpretatie",
          "Dimensie",
          "Subdimensie / soort verklaring"
        ],
        "rijen": ["Bron 1", "Bron 2"],
        "meerkeuze": {
          "wieSpreektOpties": ["string"],
          "dimensieOpties": ["string"],
          "subdimensieOpties": ["string"]
        }
      },
      "reflectie": {
        "instructie": "string",
        "vragen": ["1. ...", "2. ...", "3. ..."]
      }
    }
  }
}
  `;
}

/**
 * BASE – STEP4 (ANTWOORDMODEL)
 */
function buildBaseStep4Prompt({ concept, tvKa, deelvragen, sources, masterSignature }) {
  const sig = resolveChainSignature({ concept, masterSignature });
  const preamble = buildBasePreamble(sig);

  const tvKaInfo = JSON.stringify(tvKa || {}, null, 2);
  const conceptInfo = JSON.stringify(concept || {}, null, 2);
  const deelvragenInfo = JSON.stringify(deelvragen || [], null, 2);
  const sourcesInfo = JSON.stringify(sources || [], null, 2);

  return `
${preamble}

TAK: MAAK ANTWOORDMODEL (STEP4)

TIJDVAK EN KENMERKEND ASPECT

${tvKaInfo}

GEKOZEN LESCONCEPT

${conceptInfo}

DEELVRAGEN

${deelvragenInfo}

GESELECTEERDE BRONNEN

${sourcesInfo}

STRUCTUUR VAN DE JSON-OUTPUT

Geef precies één JSON-object terug met deze structuur:

{
  "deelvragen": [
    {
      "vraag": "string",
      "antwoord": "string",
      "gebruikteBronNummers": [1, 2]
    }
  ],
  "hoofdvraag": {
    "vraag": "string",
    "antwoord": "string",
    "gebruikteBronNummers": [1, 2, 3]
  }
}
  `;
}

module.exports = {
  CHAIN_SIGNATURE,
  resolveChainSignature,
  buildBasePreamble,
  buildBaseProposalsPrompt,
  buildBaseRefineConceptPrompt,
  buildBaseStep1Prompt,
  buildBaseStep2Prompt,
  buildBaseStep4Prompt,
};


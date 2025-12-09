"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

/**
 * Centrale base-prompt voor Lessie / LesGO v7.
 *
 * Deze builder:
 * - krijgt de payload (concept, LIGHT sources, tvKa, step, masterSignature)
 * - bouwt de algemene MASTER-context (anti-presentisme, rol, niveau)
 * - voegt per step de juiste JSON-structuur en taakomschrijving toe
 *
 * NU: alleen step2 (leerlingmateriaal) is uitgewerkt.
 */

function buildLessonV2BasePrompt(payload = {}) {
  const step = payload.step;
  const concept = payload.concept || {};
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const tvKa = payload.tvKa || {};
  const masterSignature = payload.masterSignature || MASTER_SIGNATURE;

  if (!step) {
    throw new Error("buildLessonV2BasePrompt: 'step' ontbreekt in payload");
  }

  const lightSourcesList = sources
    .map((s, i) => {
      const nr = i + 1;
      const id = s.id != null ? String(s.id) : "";
      const provider = s.provider || "";
      const type = s.type || "";
      const title = s.title || "";
      return `Bron ${nr}: { nummer: ${nr}, id: "${id}", provider: "${provider}", type: "${type}", title: "${title}" }`;
    })
    .join("\n");

  const deelvragenArr = Array.isArray(concept.deelvragen)
    ? concept.deelvragen
    : [];

  const deelvragenBlok = deelvragenArr
    .map((dv, i) => {
      if (!dv || typeof dv !== "object") return "";
      const vraag = typeof dv.vraag === "string" ? dv.vraag : "";
      const dim =
        typeof dv.dimensie === "string"
          ? dv.dimensie
          : typeof dv.dimenisie === "string"
          ? dv.dimenisie
          : "";
      const sub = typeof dv.subdimensie === "string" ? dv.subdimensie : "";
      const label = [dim, sub].filter(Boolean).join(" / ");
      return `  ${i + 1}. ${vraag}${label ? " [" + label + "]" : ""}`;
    })
    .filter(Boolean)
    .join("\n");

  const baseIntro = `
MASTER_SIGNATURE: ${masterSignature}
Je bent LESSIE / LES GO v2 – een lesgenerator geschiedenis voor 3 havo, 3 vwo en 4 havo.

ALGEMENE REGELS (v7)
--------------------
- Je werkt altijd binnen de didactiek van "Het Vreemde Verleden": leerlingen kijken met de bril van toen.
- Hoofdvraag: mag bewust presentistisch geformuleerd zijn ("gevaarlijke gek", "idioot plan", "in vredesnaam").
- Analyse, deelvragen, bronvragen en antwoordmodel blijven in de tijd van toen.
- Leerlingmateriaal bevat geen meta-zinnen als "met de kennis van nu..." of "wij vinden nu...".
- Output is ALTIJD één geldig JSON-object, zonder markdown-codeblokken en zonder vrije tekst eromheen.
- In ELKE JSON-output moet "data.chainSignature" exact "${masterSignature}" zijn.

INVOER (CONCEPT + TV/KA)
------------------------
- Hoofdvraag: ${concept.hoofdvraag || ""}
- Hook: ${concept.hook || ""}
- Context: ${concept.context || ""}
- Tijdvak: ${tvKa.tv || concept.tv || ""} (${tvKa.tvLabel || concept.tvLabel || ""})
- Kenmerkend Aspect: ${tvKa.ka || concept.ka || ""} (${tvKa.kaLabel || concept.kaLabel || ""})

DEELVRAGEN (CONCEPTUEEL)
------------------------
${deelvragenBlok || "  (geen deelvragen aangeleverd)"}

LIGHT SOURCES (bronnummering)
-----------------------------
${lightSourcesList || "Geen bronnen aangeleverd"}
`.trim();

  let stepSpecific = "";

  if (step === "step2") {
    stepSpecific = `
===============================================================
SPECIFIEKE TAAK – STEP 2 (LEERLINGMATERIAAL)
===============================================================

Doel:
- Maak LEERLINGMATERIAAL rond de hoofdvraag en deelvragen.
- Focus op: anti-presentisme, startopdracht, 2×2-kwadrant, bronnenblad, samenwerkingstabel met woordbanken, reflectie.

STRUCTUUR VAN DE JSON-OUTPUT
----------------------------
Je MOET exact één JSON-object teruggeven met deze structuur:

{
  "step": "step2",
  "data": {
    "chainSignature": "${masterSignature}",
    "leerling": {
      "antiPresentismeIntro": string,
      "startopdracht": {
        "beschrijving": string,
        "stappen": string[]
      },
      "kwadrant": {
        "titel": string,
        "horizontaleAs": {
          "links": string,
          "rechts": string,
          "toelichting": string
        },
        "verticaleAs": {
          "boven": string,
          "onder": string,
          "toelichting": string
        },
        "instructie": string
      },
      "bronnenblad": {
        "instructie": string,
        "bronNummering": [
          {
            "nummer": number,
            "id": string,
            "label": string,
            "provider": string,
            "type": string,
            "url": string | null
          }
        ]
      },
      "samenwerkingstabel": {
        "instructie": string,
        "kolommen": string[],
        "rijen": string[],
        "meerkeuze": {
          "wieSpreektOpties": string[],
          "dimensieOpties": string[],
          "subdimensieOpties": string[]
        }
      },
      "reflectie": {
        "instructie": string,
        "vragen": string[]
      }
    }
  }
}

Regels:
- "step" MOET "step2" zijn.
- "data.chainSignature" MOET aanwezig zijn en exact "${masterSignature}" zijn.
- Alle velden hierboven MOETEN bestaan; arrays mogen niet leeg zijn.

ANTI-PRESENTISME INTRO
----------------------
"antiPresentismeIntro":
- Leg in 3–6 zinnen uit dat leerlingen:
  - zich verplaatsen in mensen van toen;
  - niet oordelen met hedendaagse normen;
  - eerst proberen te begrijpen waarom keuzes toen logisch leken.
- Geen expliciete verwijzingen naar "wij nu", "tegenwoordig", "onze tijd".

STARTOPDRACHT
-------------
"startopdracht":
- "beschrijving": 1 korte alinea in jij-vorm, wat leerlingen als eerste gaan doen.
- "stappen": 2–5 genummerde stappen, concrete handelingen (kijken, lezen, bespreken, markeren).
- De startopdracht mag naar 1 specifieke bron verwijzen (bijv. "Bron 1" of "Bron 9").

KWADRANT (2×2)
--------------
"kwadrant":
- "titel": korte, pakkende titel (bijv. "De twee gezichten van de Koude Oorlog").
- "horizontaleAs":
  - "links": label voor de linkerkant (bijv. "meer conflict en wantrouwen"),
  - "rechts": label voor de rechterkant (bijv. "meer samenwerking en overleg"),
  - "toelichting": 1–2 zinnen uitleg.
- "verticaleAs":
  - "boven": label voor boven (bijv. "ideologische strijd centraal"),
  - "onder": label voor onder (bijv. "pragmatische belangen centraal"),
  - "toelichting": 1–2 zinnen uitleg.
- "instructie": leg uit wat leerlingen met het kwadrant moeten doen
  (bijv. gebeurtenissen, bronnen of standpunten in het kwadrant plaatsen).

BRONNENBLAD
-----------
"bronnenblad":
- "instructie": leg uit dat leerlingen de genummerde bronnen gebruiken om vragen te beantwoorden en het kwadrant/tabel te vullen.
- "bronNummering":
  - Maak voor ELKE aangeleverde LIGHT source één item.
  - "nummer": volgorde (1,2,3,...) – dit is de bronnummering die leerlingen zien.
  - "id": interne id (bijv. "cito-540" of "kleio-15") – voor de backend, niet uitleggen aan de leerling.
  - "label": "Bron X – [korte aanduiding]" (bijv. "Bron 3 – Praagse Lente").
  - "provider": overnemen uit de source ("Cito", "Kleio", ...).
  - "type": overnemen uit de source ("TEXT", "IMAGE", ...).
  - "url": altijd null (linking gebeurt elders).

GEEN BRONINHOUD:
- Genereer geen bronteksten, samenvattingen of citaten.
- Je verzint geen nieuwe bronnen.

SAMENWERKINGSTABEL + WOORDBANK
-------------------------------
"samenwerkingstabel":
- "instructie":
  - leg in 2–4 zinnen uit dat leerlingen per bron invullen:
    wie er spreekt, wat ze observeren, hoe ze dat interpreteren,
    en binnen welke DIMENSIE en SUBDIMENSIE deze bron het beste past.

- "kolommen": ALTIJD exact:

  [
    "Bron",
    "Wie spreekt in de bron?",
    "Observatie",
    "Interpretatie",
    "Dimensie",
    "Subdimensie / soort verklaring"
  ]

- "rijen":
  - één rij per bron in het bronnenblad: ["Bron 1", "Bron 2", ..., "Bron N"].

- "meerkeuze":
  - "wieSpreektOpties": lijst met rollen van sprekers,
    bijv. ["ooggetuige", "politicus", "militair", "burger", "journalist", "historicus", "diplomaat"].
  - "dimensieOpties": vaste SLO-dimensies,
    bijv. ["economisch", "politiek", "sociaal", "cultureel/ideologisch", "militair", "internationaal"].
  - "subdimensieOpties": thematische, concrete soorten verklaringen passend bij dit onderwerp,
    bijv. voor de Koude Oorlog:
    ["angst voor communisme", "angst voor atoomoorlog",
     "invloedssfeer uitbreiden", "machtsevenwicht behouden",
     "economische hulp en belangen", "propaganda en vijandbeelden",
     "afschrikking"].

- Zet GEEN lange uitleg in de cellen zelf; uitleg staat in "instructie" en in de woordbank erboven.

REFLECTIE
---------
"reflectie":
- "instructie": korte uitleg, bijv. "Beantwoord de vragen hieronder in enkele zinnen. Verwijs naar bronnen waar dat gevraagd wordt."
- "vragen": 3–5 vragen waarin leerlingen:
  - afwegen welke factor/deelvraag het belangrijkst is voor de hoofdvraag;
  - minstens één keer expliciet naar bronnen moeten verwijzen;
  - uitleggen hoe verschillende dimensies/subdimensies samenhangen.

GEEN MARKDOWN, ALLEEN JSON
--------------------------
- Geef uitsluitend het JSON-object terug zoals hierboven gespecificeerd.
- Geen markdown-codeblokken (dus geen codeblokken met drie backticks).
- Geen tekst vóór of ná het JSON-object.
`;
  } else {
    throw new Error(
      `buildLessonV2BasePrompt: step "${step}" wordt nog niet ondersteund in deze base`
    );
  }

  return `${baseIntro}

${stepSpecific}`.trim();
}

module.exports = {
  buildLessonV2BasePrompt,
};


/**
 * STEP 1 – DOCENTMATERIAAL (v7 – 9 dec 2025)
 * ------------------------------------------------------------------
 * Deze prompt genereert uitsluitend docentmateriaal volgens MASTERPROMPT v7:
 *
 *  - Structuur: WAT – HOE – WAAROM + DEELVRAGEN + BRONKOPPELING + LESPLANNING
 *  - GEEN broninhoud, geen samenvattingen van bronnen
 *  - Verwijzen naar bronnen ALLEEN als "Bron 1", "Bron 2", ...
 *  - Nummering = volgorde van aangeleverde LIGHT sources
 *  - Intern ID (bijv. cito-540) kan in de backend worden gebruikt,
 *    maar komt NIET voor in het zichtbare docentstuk.
 *
 *  - GEEN leerlingmateriaal
 *  - GEEN opdrachten
 *  - GEEN antwoordmodel
 *  - GEEN fullText/content
 *
 * Output = zuiver JSON met top-level:
 * {
 *   "step": "step1",
 *   "data": {
 *     "chainSignature": "<MASTER_SIGNATURE>",
 *     "docent": { ... }
 *   }
 * }
 */

function buildStep1Prompt({ concept = {}, sources = [], masterSignature }) {
  const lightSourcesList = sources
    .map((s, i) => {
      const nr = i + 1;
      return `Bron ${nr}: { nummer: ${nr}, id: "${s.id}", provider: "${s.provider || ""}", type: "${s.type || ""}", title: "${s.title || ""}" }`;
    })
    .join("\n");

  return `
MASTER_SIGNATURE: ${masterSignature}
DOEL: Genereer STEP 1 (Docentmateriaal) volgens MASTERPROMPT v7.

===============================================================
INVOER
===============================================================

CONCEPT:
- Hoofdvraag: ${concept.hoofdvraag || ""}
- Hook: ${concept.hook || ""}
- Context: ${concept.context || ""}
- Tijdvak: ${concept.tv || ""} (${concept.tvLabel || ""})
- Kenmerkend Aspect: ${concept.ka || ""} (${concept.kaLabel || ""})

LIGHT SOURCES (in vaste volgorde, dit bepaalt de bronnummering):
${lightSourcesList}

===============================================================
REGELS – ABSOLUUT VERPLICHT
===============================================================

1) Genereer ALLEEN docentmateriaal voor STEP 1.
2) De volledige output MOET één JSON-object zijn met exact dit patroon:
   {
     "step": "step1",
     "data": {
       "chainSignature": "${masterSignature}",
       "docent": { ... }
     }
   }
3) Binnen "data.docent" MOET de structuur zijn:
   - wat: string                  // korte beschrijving van de les als geheel
   - hoe: string                  // globale beschrijving van de aanpak / werkvormen
   - waarom: string               // didactische onderbouwing / leerdoelen
   - deelvragen: array van strings
   - bronverwijzingenPerDeelvraag: array van objecten:
       {
         "deelvraag": string,
         "bronnen": [int, int, ...]   // verwijzing naar Bron 1, Bron 2, ...
       }
   - lesfasen: array van objecten (lesplanning), elk met:
       {
         "fase": string,       // bv. "Start", "Kern 1", "Kern 2", "Afsluiting"
         "tijd": string,       // bv. "10 min"
         "doel": string,       // wat leerlingen in deze fase bereiken
         "activiteit": string, // wat er concreet gebeurt
         "werkvorm": string    // bv. "klassengesprek", "duo-opdracht", "groepswerk"
       }
4) Verwijs naar bronnen UITSLUITEND als "Bron X" (X = nummer op basis van volgorde).
   - Noem GEEN CITO-nummers, GEEN Kleio-IDs, GEEN interne identifiers in het zichtbare stuk.
5) NOOIT broninhoud genereren.
   - Geen samenvattingen
   - Geen citaten
   - Geen parafrases
   - Geen fullText of content
6) GEEN leerlingmateriaal, GEEN opdrachten, GEEN antwoordmodel.
7) Output = zuiver JSON (geen Markdown, geen codeblok-markering en geen extra tekst buiten het JSON-object).

===============================================================
VOORBEELD VAN DE JSON-OUTPUT (SCHETS)
===============================================================

{
  "step": "step1",
  "data": {
    "chainSignature": "${masterSignature}",
    "docent": {
      "wat": "In deze les onderzoeken leerlingen hoe beide blokken in de Koude Oorlog zichzelf en de vijand neerzetten.",
      "hoe": "De docent start met een klassengesprek, daarna werken leerlingen in groepjes met bronnen en sluiten af met een korte klassikale terugblik.",
      "waarom": "Leerlingen leren historisch te redeneren over beeldvorming en propaganda tijdens de Koude Oorlog.",
      "deelvragen": [
        "Hoe presenteerden beide blokken zichzelf als verdedigers van vrede en veiligheid?",
        "Welke rol speelde propaganda in het beeld van de vijand?",
        "Hoe merkten gewone mensen in Europa iets van de Koude Oorlog?"
      ],
      "bronverwijzingenPerDeelvraag": [
        {
          "deelvraag": "Hoe presenteerden beide blokken zichzelf als verdedigers van vrede en veiligheid?",
          "bronnen": [1, 2, 3]
        },
        {
          "deelvraag": "Welke rol speelde propaganda in het beeld van de vijand?",
          "bronnen": [4, 5, 6]
        },
        {
          "deelvraag": "Hoe merkten gewone mensen in Europa iets van de Koude Oorlog?",
          "bronnen": [7, 8, 9, 10]
        }
      ],
      "lesfasen": [
        {
          "fase": "Start",
          "tijd": "10 min",
          "doel": "Aansluiten bij voorkennis en lesvraag introduceren.",
          "activiteit": "Korte klassikale bespreking van een prikkelende bron of stelling.",
          "werkvorm": "klassengesprek"
        },
        {
          "fase": "Kern 1",
          "tijd": "20 min",
          "doel": "Leerlingen laten werken met bronnen rond deelvraag 1 en 2.",
          "activiteit": "Leerlingen analyseren in groepjes een set bronnen en beantwoorden deelvragen.",
          "werkvorm": "groepsopdracht"
        },
        {
          "fase": "Kern 2",
          "tijd": "15 min",
          "doel": "Resultaten delen en verband leggen met de hoofvraag.",
          "activiteit": "Groepen presenteren hun bevindingen, docent vult aan waar nodig.",
          "werkvorm": "klassikale terugkoppeling"
        },
        {
          "fase": "Afsluiting",
          "tijd": "10 min",
          "doel": "Les afronden en leerlingen kort laten reflecteren.",
          "activiteit": "Individuele korte schrijftaak of exit ticket over wat zij nu anders zien.",
          "werkvorm": "individuele opdracht"
        }
      ]
    }
  }
}

Toelichting:
- "bronnen" is een array met integers die verwijzen naar de bronnummering:
  - Bron 1 = eerste item in LIGHT sources
  - Bron 2 = tweede item
  - Bron 3 = derde item
  - enz.

===============================================================
MAAK NU STEP 1
===============================================================

Geef uitsluitend het JSON-object terug zoals hierboven beschreven.
  `;
}

module.exports = { buildStep1Prompt };


// backend/prompts/lessonV2.step4.cjs
// LESSON V2 – STEP4 (Antwoordmodel / docentenmodel)
//
// Doel:
// - Op basis van concept + bronnen een antwoordmodel genereren:
//   * kernantwoorden per deelvraag
//   * verwijzing naar gebruikte bronnen
//   * eindantwoord op de hoofdvraag
//   * veelgemaakte fouten / misvattingen van leerlingen
// - Altijd een chainSignature meesturen (v6MP6dec).
//
// Deze prompt wordt aangeroepen via routes/lessonV2.step4.cjs → buildStep4Prompt(body).

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildBasePreamble } = require("./lessonV2.base.cjs");

/**
 * Bouwt de prompt voor STEP4 (antwoordmodel).
 *
 * Verwachte body-shape (vanuit route):
 * {
 *   concept: {
 *     id?: string,
 *     title?: string,
 *     hoofdvraag?: string,
 *     deelvragen?: [
 *       { vraag: string, dimensie?: string, subdimensie?: string }
 *     ],
 *     leeropbrengsten?: [
 *       { beschrijving: string, deelvraagIndex?: number }
 *     ],
 *     masterSignature?: string,
 *     tv?: string,
 *     ka?: string
 *   },
 *   sources: [
 *     {
 *       id: string|number,
 *       title?: string,
 *       description?: string,
 *       snippet?: string,
 *       provider?: string,
 *       type?: string,
 *       periodHint?: string,
 *       url?: string|null,
 *       meta?: any
 *     },
 *     ...
 *   ]
 * }
 */
function buildStep4Prompt(body = {}) {
  const concept = body.concept || {};
  const sources = Array.isArray(body.sources) ? body.sources : [];

  const CHAIN_SIGNATURE = concept.masterSignature || MASTER_SIGNATURE;

  const preamble = buildBasePreamble(CHAIN_SIGNATURE);

  const conceptJson = JSON.stringify(
    {
      id: concept.id || null,
      title: concept.title || "",
      hoofdvraag: concept.hoofdvraag || concept.hoofdvraagText || "",
      deelvragen: Array.isArray(concept.deelvragen)
        ? concept.deelvragen
        : [],
      leeropbrengsten: Array.isArray(concept.leeropbrengsten)
        ? concept.leeropbrengsten
        : [],
      tv: concept.tv || "",
      ka: concept.ka || "",
      masterSignature: concept.masterSignature || CHAIN_SIGNATURE,
    },
    null,
    2
  );

  const sourcesJson = JSON.stringify(
    sources.map((s, index) => ({
      id: s.id != null ? s.id : index + 1,
      title: s.title || "",
      snippet: s.snippet || s.description || "",
      provider: s.provider || "",
      type: s.type || "",
      periodHint: s.periodHint || "",
      url: s.url || null,
      meta: s.meta || {},
    })),
    null,
    2
  );

  const lines = [];

  lines.push(preamble);
  lines.push("");
  lines.push("==== CONTEXT – STEP4 (ANTWOORDMODEL) ====");
  lines.push("");
  lines.push("Je staat nu aan het einde van de lesgenerator (LesGO v2).");
  lines.push("De docent heeft een gekozen concept (hoofdvraag + deelvragen) en bronnen.");
  lines.push("Jij maakt nu een antwoordmodel (docentenmodel) in HET NEDERLANDS.");
  lines.push("");
  lines.push("Belangrijk:");
  lines.push("- Je bedenkt GEEN nieuwe hoofdvraag.");
  lines.push("- Je verandert de bestaande deelvragen NIET inhoudelijk.");
  lines.push("- Je gebruikt de bronnen om onderbouwde kernantwoorden te formuleren.");
  lines.push("- Je blijft werken vanuit historisch redeneren en contextualiseren.");
  lines.push("");
  lines.push("Invoer – CONCEPT:");
  lines.push(conceptJson);
  lines.push("");
  lines.push("Invoer – BRONNEN (max ~40):");
  lines.push(sourcesJson);
  lines.push("");
  lines.push("==== OPDRACHT – MAAK EEN ANTWOORDMODEL ====");
  lines.push("");
  lines.push("Je maakt een antwoordmodel dat de docent houvast geeft bij het nakijken.");
  lines.push("Je output ALLEEN geldige JSON, GEEN markdown, GEEN toelichting buiten JSON.");
  lines.push("");
  lines.push("1. Hoofdvraag en deelvragen");
  lines.push("- Kopieer de hoofdvraag exact zoals die in het concept staat.");
  lines.push("- Neem de 4 deelvragen over (in dezelfde volgorde).");
  lines.push("- Verander de vraagstelling NIET, hooguit minieme stilistische correcties.");
  lines.push("");
  lines.push("2. Per deelvraag: kernantwoord + bronnen");
  lines.push("- Voor ELKE deelvraag (index 0–3):");
  lines.push("  * Formuleer een kernantwoord in 4–7 zinnen.");
  lines.push("  * Baseer je expliciet op de bronnen (die in deze les geselecteerd zijn).");
  lines.push("  * Som de belangrijkste bronIds op die bij dit antwoord horen.");
  lines.push("  * Voeg een korte toelichting toe waarom deze bronnen passen.");
  lines.push("- Blijf contextualiserend redeneren:");
  lines.push("  * leg uit waarom het voor tijdgenoten logisch/vanzelfsprekend kon zijn;");
  lines.push("  * voorkom hindsight-woorden als 'tegenwoordig', 'nu weten we', 'achteraf'.");
  lines.push("");
  lines.push("3. Slotantwoord op de hoofdvraag");
  lines.push("- Formuleer een antwoord op de hoofdvraag in 2–3 alinea’s.");
  lines.push("- Gebruik de 4 deelvragen als structuur:");
  lines.push("  * laat zien hoe elke deelvraag een deel van het antwoord draagt;");
  lines.push("  * trek een samenhangende conclusie.");
  lines.push("- Het slotantwoord is geschikt als docentensamenvatting, NIET om letterlijk");
  lines.push("  aan leerlingen te geven als tekst.");
  lines.push("");
  lines.push("4. Veelgemaakte fouten / misvattingen");
  lines.push("- Geef een lijst van 3–6 veelgemaakte fouten die leerlingen kunnen maken.");
  lines.push("- Denk aan:");
  lines.push("  * presentistische oordelen zonder context;");
  lines.push("  * het door elkaar halen van tijdvakken/gebeurtenissen;");
  lines.push("  * overschatten of onderschatten van de rol van één factor of persoon;");
  lines.push("  * zwart-witdenken (goed/slecht) zonder aandacht voor tijdgeest.");
  lines.push("- Formuleer per misvatting ook kort waarom het onjuist of incompleet is.");
  lines.push("");
  lines.push("5. Taalniveau en toon");
  lines.push("- Schrijf in duidelijke docententaal (havo/vwo-docent).");
  lines.push("- Geen opsommingen van feitjes; altijd redeneren en verbanden leggen.");
  lines.push("- Je mag nuance geven, maar niet vervallen in academisch jargon.");
  lines.push("");
  lines.push("6. CHAIN_SIGNATURE");
  lines.push(`- Gebruik altijd "chainSignature": "${CHAIN_SIGNATURE}" in de data.`);
  lines.push("");
  lines.push("==== JSON OUTPUT-FORMAAT (STRICT) ====");
  lines.push("");
  lines.push("Je geeft ALLEEN JSON terug met exact deze structuur:");
  lines.push("");
  lines.push("{");
  lines.push('  "step": 4,');
  lines.push('  "data": {');
  lines.push(`    "chainSignature": "${CHAIN_SIGNATURE}",`);
  lines.push('    "hoofdvraag": "<exacte hoofdvraag>",');
  lines.push('    "deelvragen": [');
  lines.push('      { "index": 0, "vraag": "<string>" },');
  lines.push('      { "index": 1, "vraag": "<string>" },');
  lines.push('      { "index": 2, "vraag": "<string>" },');
  lines.push('      { "index": 3, "vraag": "<string>" }');
  lines.push("    ],");
  lines.push('    "antwoordmodel": {');
  lines.push('      "perDeelvraag": [');
  lines.push("        {");
  lines.push('          "deelvraagIndex": 0,');
  lines.push('          "vraag": "<string>",');
  lines.push('          "kernantwoord": "<4–7 zinnen in doorlopende tekst>",');
  lines.push('          "bronIds": ["<id1>", "<id2>"],');
  lines.push('          "toelichtingBronnen": "<2–3 zinnen waarom deze bronnen passen>"');
  lines.push("        }");
  lines.push("      ],");
  lines.push('      "slotAntwoord": "<2–3 alinea’s als doorlopende tekst>",');
  lines.push('      "veelgemaakteFouten": [');
  lines.push("        {");
  lines.push('          "beschrijving": "<ongenuanceerde of foutieve leerlinggedachte>",');
  lines.push('          "uitleg": "<waarom dit onjuist/incompleet is, in 1–2 zinnen>"');
  lines.push("        }");
  lines.push("      ]");
  lines.push("    }");
  lines.push("  }");
  lines.push("}");
  lines.push("");
  lines.push("GEEN MARKDOWN, GEEN COMMENTAAR, ALLEEN DEZE JSON-STRUCTUUR.");

  return lines.join("\n");
}

module.exports = {
  buildStep4Prompt,
};


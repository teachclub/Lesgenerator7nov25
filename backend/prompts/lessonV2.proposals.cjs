// backend/prompts/lessonV2.proposals.cjs  
// LESSON V2 – PROPOSALS (v6, met leeropbrengsten + toon-categorieën)
//
// Doel:
// - Uit max. ~40 bronnen drie lesvoorstellen genereren.
// - Elk voorstel heeft:
//   * titel
//   * hook (verwondering, géén vraag)
//   * hoofdvraag in leerlingentaal ("Hoe konden mensen destijds...")
//   * 4 deelvragen (dimensie + subdimensie)
//   * 3–6 leeropbrengsten (vooruitblik op antwoorden op de deelvragen)
//   * min. 10 en max. 15 passende bronnen (sourceIds)
//   * primarySourceIds (kernbronnen) voor ⭐
//   * masterSignature + chainSignature

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildBasePreamble } = require("./lessonV2.base.cjs");

/**
 * Bouwt de prompt voor Gemini op basis van tv/ka/allSources.
 *
 * @param {Object} params
 * @param {string|number|null} params.tv
 * @param {string|number|null} params.ka
 * @param {string} params.conceptHint
 * @param {Array<Object>} params.allSources
 * @returns {string}
 */
function buildProposalsPrompt({ tv, ka, conceptHint, allSources }) {
  const tvLabel = tv != null ? String(tv) : "geen specifiek tijdvak";
  const kaLabel = ka != null ? String(ka) : "geen specifiek kenmerkend aspect";

  const preamble = buildBasePreamble(MASTER_SIGNATURE);

  const sourcesJson = JSON.stringify(
    (allSources || []).map((s) => ({
      id: s.id,
      title: s.title || "",
      snippet: s.snippet || "",
      provider: s.provider || "",
      type: s.type || "",
      periodHint: s.periodHint || "",
      meta: s.meta || {},
    })),
    null,
    2
  );

  const hintText =
    conceptHint && conceptHint.trim().length > 0
      ? `DOCENTENHINT (optioneel, mag je als invalshoek gebruiken, maar je mag ook een betere invalshoek kiezen als de bronnen daarom vragen): "${conceptHint.trim()}".`
      : `GEEN specifieke docentenhint voor de invalshoek. Kies zelf een sterke invalshoek op basis van de bronnen.`;

  const lines = [];

  lines.push(preamble);
  lines.push("");
  lines.push("==== CONTEXT – PROPOSALS (A35, v6) ====");
  lines.push("");
  lines.push("Je staat aan het begin van de lesgenerator.");
  lines.push("Je krijgt maximaal 40 bronnen en maakt op basis daarvan 3 lesvoorstellen.");
  lines.push("");
  lines.push("Regels voor de HOOFDVRAAG (leerlingentaal):");
  lines.push('- Formuleer expliciete verwondering, bijvoorbeeld:');
  lines.push('  * "Hoe konden mensen destijds ... ?"');
  lines.push('  * "Hoe kon het dat mensen toen ... normaal vonden?"');
  lines.push('  * "Waarom zagen mensen in die tijd ... op die manier?"');
  lines.push("- De hoofdvraag is in begrijpelijke taal (niveau 3 havo / 3 vwo / 4 havo).");
  lines.push("- Gebruik GEEN hindsight-woorden zoals:");
  lines.push('  "tegenwoordig", "nu", "nu weten we", "met de kennis van nu",');
  lines.push('  "achteraf gezien", "in onze tijd", "wij weten nu dat".');
  lines.push("- De verwondering mag een impliciet oordeel bevatten (leerlingen voelen");
  lines.push("  dat het vreemd is), maar je noemt tijdgenoten nooit dom of achterlijk.");
  lines.push("");
  lines.push("De hoofdvraag moet breed genoeg zijn om:");
  lines.push("- vanuit meerdere Huijgen-dimensies benaderd te worden (minstens 4 subdimensies);");
  lines.push("- door minstens 10 bronnen serieus beantwoord te kunnen worden;");
  lines.push("- verschillende perspectieven (bijv. machthebbers vs. gewone mensen) toe te laten.");
  lines.push("");
  lines.push("Huijgen-dimensies (denkkader):");
  lines.push("1. Tijd & Tijdgeest");
  lines.push("2. Sociale verhoudingen & Groepsculturen");
  lines.push("3. Politiek & Macht");
  lines.push("4. Economie & Middelen");
  lines.push("5. Ruimte, Geografie & Leefomgeving");
  lines.push("6. Kennis, Wetenschap & Technologie");
  lines.push("7. Waarden, Normen & Morele Kaders");
  lines.push("");
  lines.push("Voor ELK lesvoorstel kies je EXACT 4 subdimensies die cruciaal zijn.");
  lines.push("Die vier worden uitgewerkt als 4 deelvragen.");
  lines.push("");

  // 🔥 Toon-categorieën voor hoofdvragen
  lines.push("VOORBEELDEN VAN DRIE TONEN VOOR DE HOOFDVRAAG (KIES PER PROPOSAL ÉÉN TON)");
  lines.push("");
  lines.push("Je schrijft voor ELK van de drie lesvoorstellen een hoofdvraag in leerlingentaal,");
  lines.push("met duidelijke verwondering en oordeel, ZONDER hindsight-taal.");
  lines.push("Gebruik GEEN woorden als: \"tegenwoordig\", \"nu\", \"achteraf\", \"met de kennis van nu\".");
  lines.push("De hoofdvraag is ALTIJD één zin, zonder ingewikkelde bijzinnen (vermijd vooral \"terwijl\").");
  lines.push("");
  lines.push("Gebruik één van de volgende drie toon-categorieën per voorstel:");
  lines.push("");
  lines.push("Categorie 1 – Mild / ‘sophisticated’ leerlingentaal (nuancering)");
  lines.push("- Hoe konden mensen zo zeker zijn van hun eigen gelijk dat ze bijna geen ruimte meer zagen voor een andere waarheid?");
  lines.push("- Hoe kon een samenleving zo afhankelijk worden van macht en technologie dat bijna niemand zich nog afvroeg wie er echt controle had?");
  lines.push("- Hoe konden landen zo overtuigd raken van hun rol in de wereld dat ze nauwelijks zagen wat dat voor anderen betekende?");
  lines.push("");
  lines.push("Categorie 2 – Harder, eenvoudiger, direct");
  lines.push("- Hoe konden miljoenen mensen blind meegaan in een systeem dat ze zelf niet goed begrepen?");
  lines.push("- Hoe konden regeringen elkaar zo hard wantrouwen dat oorlog bijna normaal voelde?");
  lines.push("- Hoe konden burgers zo goedgelovig zijn dat propaganda sterker woog dan gezond verstand?");
  lines.push("");
  lines.push("Categorie 3 – Rauw, fel, expliciet oordeel (naïef, slecht, klakkeloos)");
  lines.push("- Hoe konden machthebbers zo kil zijn dat ze over oorlog en levens besloten alsof mensen cijfers waren?");
  lines.push("- Hoe konden samenlevingen zo klakkeloos alles slikken wat hun leiders zeiden zonder iets te checken?");
  lines.push("- Hoe konden zoveel mensen zo naïef blijven geloven dat hun eigen kant goed was en de rest slecht?");
  lines.push("");
  lines.push("INSTRUCTIE VOOR DE DRIE LESVOORSTELLEN:");
  lines.push("- Lesvoorstel 1 gebruikt een toon uit Categorie 1 (mild/sophisticated).");
  lines.push("- Lesvoorstel 2 gebruikt een toon uit Categorie 2 (harder, eenvoudiger).");
  lines.push("- Lesvoorstel 3 gebruikt een toon uit Categorie 3 (rauw, fel, expliciet oordeel).");
  lines.push("- Pas de voorbeelden aan op het concrete onderwerp van de bronnen, maar behoud de scherpe leerlingverwondering.");
  lines.push("");

  lines.push(`Tijdvak (ruw): ${tvLabel}`);
  lines.push(`Kenmerkend aspect (ruw): ${kaLabel}`);
  lines.push("");
  lines.push(hintText);
  lines.push("");
  lines.push("BRONNEN (ALL_SOURCES – MAX 40, JSON):");
  lines.push(sourcesJson);
  lines.push("");
  lines.push("==== OPDRACHT – MAAK 3 LESVOORSTELLEN ====");
  lines.push("");
  lines.push("Je maakt PRECIES 3 lesvoorstellen.");
  lines.push("Per lesvoorstel doe je het volgende:");
  lines.push("");
  lines.push("1. Titel");
  lines.push("- Korte, inhoudelijke titel, géén vraag.");
  lines.push("");
  lines.push("2. Hook");
  lines.push("- Eén korte, beeldende zin die nieuwsgierigheid oproept.");
  lines.push('- GEEN vraag, maar bijvoorbeeld: "In deze periode dachten mensen dat..."');
  lines.push("");
  lines.push("3. Hoofdvraag (leerlingentaal)");
  lines.push("- Formuleer één hoofdvraag die:");
  lines.push('  * start met iets als "Hoe konden mensen destijds...",');
  lines.push('    of "Hoe kon het dat mensen toen ... normaal vonden?",');
  lines.push('    of "Waarom zagen mensen in die tijd ... op die manier?".');
  lines.push("- GEEN hindsight-woorden gebruiken.");
  lines.push("- De hoofdvraag moet breed zijn:");
  lines.push("  * er moeten MINSTENS 10 passende bronnen zijn;");
  lines.push("  * de vraag moet vanuit meerdere dimensies te benaderen zijn.");
  lines.push("- Pas de toonkeuze (Categorie 1, 2 of 3) consequent toe zoals hierboven uitgelegd.");
  lines.push("");
  lines.push("4. Deelvragen (4 stuks per voorstel)");
  lines.push("- Kies EXACT 4 deelvragen die samen de hoofdvraag dekken.");
  lines.push("- Voor elke deelvraag geef je in de JSON:");
  lines.push('  * "vraag": de deelvraag in leerlingentaal,');
  lines.push('  * "dimensie": de gekozen Huijgen-dimensie,');
  lines.push('  * "subdimensie": een kort label voor de concrete uitwerking.');
  lines.push("- De 4 deelvragen moeten duidelijk verschillende invalshoeken hebben.");
  lines.push("");
  lines.push("5. Leeropbrengsten (vooruitblik voor de docent)");
  lines.push("- Formuleer per lesvoorstel MINIMAAL 3 en MAXIMAAL 6 leeropbrengsten.");
  lines.push("- Een leeropbrengst is een korte zin over wat leerlingen aan het eind van de les");
  lines.push("  kunnen uitleggen of beargumenteren.");
  lines.push("- Bij voorkeur koppel je elke leeropbrengst aan een deelvraagIndex (0–3),");
  lines.push("  zodat duidelijk is welke deelvraag vooral wordt geraakt.");
  lines.push("- Voorbeelden:");
  lines.push('  * "Leerlingen kunnen uitleggen waarom gewone burgers zo bang waren voor');
  lines.push('     een kernoorlog, en welke rol propaganda daarbij speelde (tijdgeest + macht)."');
  lines.push('  * "Leerlingen kunnen verschillende beelden van \'de vijand\' uit Oost en West');
  lines.push('     vergelijken en benoemen waar die beelden vandaan kwamen."');
  lines.push("");
  lines.push("In JSON ziet dit er bijvoorbeeld zo uit:");
  lines.push('"leeropbrengsten": [');
  lines.push('  { "beschrijving": "Leerlingen kunnen ...", "deelvraagIndex": 0 },');
  lines.push('  { "beschrijving": "Leerlingen vergelijken ...", "deelvraagIndex": 2 }');
  lines.push("]");
  lines.push("");
  lines.push("6. Bronnenselectie");
  lines.push('- Kies per voorstel "sourceIds": MINSTENS 10 en MAXIMAAL 15 ids uit ALL_SOURCES.');
  lines.push("Deze bronnen moeten samen:");
  lines.push("- meerdere perspectieven laten zien (bijvoorbeeld leiders én gewone mensen);");
  lines.push("- meerdere dimensies dekken (tijdgeest, macht, economie, moraal, kennis...).");
  lines.push("");
  lines.push('- Kies daarnaast "primarySourceIds": 5–10 kernbronnen uit deze sourceIds.');
  lines.push("- Dit zijn de bronnen die in een les het meest centraal zouden staan (⭐).");
  lines.push("- Als je merkt dat een hoofdvraag maar bij 2–3 bronnen echt past,");
  lines.push("  dan is de hoofdvraag te smal en kies je een bredere invalshoek.");
  lines.push("");
  lines.push("7. Contextvelden per concept");
  lines.push('- Vul "contextLabel" met een korte, menselijk leesbare context');
  lines.push('  (bijv. "Koude Oorlog – angst voor kernwapens").');
  lines.push('- Vul "targetAudience" met bijvoorbeeld "Havo/Vwo Bovenbouw".');
  lines.push(`- Zet "masterSignature": "${MASTER_SIGNATURE}".`);
  lines.push(`- Zet "tv": "${tvLabel}".`);
  lines.push(`- Zet "ka": "${kaLabel}".`);
  lines.push("");
  lines.push("8. CHAIN_SIGNATURE");
  lines.push(`- Zet op rootniveau: "chainSignature": "${MASTER_SIGNATURE}".`);
  lines.push("");
  lines.push("==== JSON OUTPUT-FORMAAT (STRIKT) ====");
  lines.push("");
  lines.push("Je geeft ALLEEN geldige JSON terug, zonder commentaar of extra tekst.");
  lines.push("Structuur:");
  lines.push("");
  lines.push("{");
  lines.push(`  "chainSignature": "${MASTER_SIGNATURE}",`);
  lines.push('  "proposals": [');
  lines.push("    {");
  lines.push('      "id": "p1",');
  lines.push('      "concept": {');
  lines.push('        "id": "p1",');
  lines.push('        "title": "<string>",');
  lines.push('        "hook": "<string>",');
  lines.push('        "hoofdvraag": "<string>",');
  lines.push('        "deelvragen": [');
  lines.push('          { "vraag": "<string>", "dimensie": "<string>", "subdimensie": "<string>" },');
  lines.push('          { "vraag": "<string>", "dimensie": "<string>", "subdimensie": "<string>" },');
  lines.push('          { "vraag": "<string>", "dimensie": "<string>", "subdimensie": "<string>" },');
  lines.push('          { "vraag": "<string>", "dimensie": "<string>", "subdimensie": "<string>" }');
  lines.push("        ],");
  lines.push('        "leeropbrengsten": [');
  lines.push('          { "beschrijving": "<string>", "deelvraagIndex": 0 }');
  lines.push("        ],");
  lines.push('        "contextLabel": "<string>",');
  lines.push('        "targetAudience": "Havo/Vwo Bovenbouw",');
  lines.push(`        "masterSignature": "${MASTER_SIGNATURE}",`);
  lines.push(`        "tv": "${tvLabel}",`);
  lines.push(`        "ka": "${kaLabel}"`);
  lines.push("      },");
  lines.push('      "sourceIds": ["<bron-id-1>", "<bron-id-2>", "... (10–15 totaal)"],');
  lines.push('      "primarySourceIds": ["<kern-bron-id-1>", "<kern-bron-id-2>", "... (5–10 totaal)"]');
  lines.push("    },");
  lines.push("    { ... },");
  lines.push("    { ... }");
  lines.push("  ]");
  lines.push("}");
  lines.push("");
  lines.push("GEEN MARKDOWN, GEEN COMMENTAAR, ALLEEN DEZE JSON-STRUCTUUR.");

  return lines.join("\n");
}

/**
 * Validatie + lichte normalisatie van de Gemini-response.
 *
 * @param {any} json
 * @param {string} expectedSignature
 * @returns {{ chainSignature: string, proposals: Array<any> }}
 */
function validateProposalsResponse(json, expectedSignature) {
  if (!json || typeof json !== "object") {
    throw new Error("Proposals v6: response is geen object");
  }

  const chainSig = json.chainSignature || json.chain_signature || null;
  if (chainSig && chainSig !== expectedSignature) {
    throw new Error(
      `Proposals v6: chainSignature mismatch (got ${chainSig}, expected ${expectedSignature})`
    );
  }

  const proposalsRaw = Array.isArray(json.proposals) ? json.proposals : [];
  if (!proposalsRaw.length) {
    throw new Error("Proposals v6: geen proposals[] in response");
  }

  const normalized = proposalsRaw.map((p, index) => {
    const concept = p.concept || {};
    const sourceIds = Array.isArray(p.sourceIds) ? p.sourceIds : [];
    let primarySourceIds = Array.isArray(p.primarySourceIds)
      ? p.primarySourceIds
      : [];

    if (!primarySourceIds.length && sourceIds.length > 0) {
      primarySourceIds = sourceIds.slice(0, Math.min(10, sourceIds.length));
    }

    const leeropbrengsten = Array.isArray(concept.leeropbrengsten)
      ? concept.leeropbrengsten.map((lo, loIndex) => ({
          beschrijving: String(lo.beschrijving || lo.description || ""),
          deelvraagIndex:
            typeof lo.deelvraagIndex === "number" ? lo.deelvraagIndex : null,
          id: lo.id || `LO${loIndex + 1}`,
        }))
      : [];

    if (sourceIds.length < 10) {
      console.warn(
        "[Proposals/v6] Proposal met minder dan 10 bronnen:",
        concept.hoofdvraag || "(geen hoofdvraag)"
      );
    }

    return {
      id: p.id || `p${index + 1}`,
      concept: {
        id: concept.id || p.id || `p${index + 1}`,
        title: concept.title || `Lesvoorstel ${index + 1}`,
        hook:
          concept.hook ||
          "Waarom vonden tijdgenoten dit zo vanzelfsprekend – en wij helemaal niet meer?",
        hoofdvraag:
          concept.hoofdvraag ||
          "Hoe konden mensen in die tijd dit onderwerp zo anders zien dan wij nu gewend zijn?",
        deelvragen: Array.isArray(concept.deelvragen)
          ? concept.deelvragen
          : [],
        leeropbrengsten,
        contextLabel: concept.contextLabel || "Geen specifieke TV/KA",
        targetAudience: concept.targetAudience || "Havo/Vwo Bovenbouw",
        masterSignature: concept.masterSignature || expectedSignature,
        tv: concept.tv || "",
        ka: concept.ka || "",
      },
      sourceIds,
      primarySourceIds,
    };
  });

  return {
    chainSignature: chainSig || expectedSignature,
    proposals: normalized,
  };
}

module.exports = {
  buildProposalsPrompt,
  validateProposalsResponse,
};


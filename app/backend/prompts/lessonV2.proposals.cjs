// backend/prompts/lessonV2.proposals.cjs  
// LESSON V2 – PROPOSALS (v7, onder MASTERPROMPT base)
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
//
// Belangrijk v7:
// - Alle didactische spelregels over hoofdvragen, deelvragen, dimensies,
//   subdimensies, brongebruik, anti-presentisme, enz. komen UITSLUITEND
//   uit lessonV2.base.cjs (buildBasePreamble).
// - Deze file voegt alleen de A35-specifieke taak + JSON-schema toe.

"use strict";

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

  // ⬇️ MASTERPROMPT v7 – alle didactische regels komen hieruit
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
  lines.push("==== CONTEXT – PROPOSALS (A35, v7) ====");
  lines.push("");
  lines.push("Je staat aan het begin van de lesgenerator.");
  lines.push("Je krijgt maximaal 40 bronnen en maakt op basis daarvan 3 lesvoorstellen.");
  lines.push("");
  lines.push(
    "Alle algemene regels over HOOFDVRAAG, DEELVRAGEN, DIMENSIES, SUBDIMENSIES,"
  );
  lines.push(
    "ANTI-PRESENTISME, LEESNIVEAU en BRONSELECTIE komen UITSLUITEND uit de"
  );
  lines.push(
    "MASTERPROMPT hierboven (buildBasePreamble). Pas die regels hier strikt toe."
  );
  lines.push("");
  lines.push(
    "- Formuleer dus per voorstel één verwonderende hoofdvraag in leerlingentaal,"
  );
  lines.push(
    "  volgens de basisregels (geen hindsight, geen 'nu', altijd vanuit de wereld van toen)."
  );
  lines.push("- Gebruik precies 4 deelvragen, elk met één duidelijke subdimensie.");
  lines.push("- Verdeel bronnen logisch over de deelvragen, zoals in de base is beschreven.");
  lines.push("");

  // 🔥 Toon-categorieën voor hoofdvragen (unieke v7-spec voor proposals)
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
  lines.push("Per lesvoorstel doe je het volgende (volgens de basisregels uit de MASTERPROMPT):");
  lines.push("");
  lines.push("1. Titel");
  lines.push("- Korte, inhoudelijke titel, géén vraag.");
  lines.push("");
  lines.push("2. Hook");
  lines.push("- Eén korte, beeldende zin die nieuwsgierigheid oproept.");
  lines.push('- GEEN vraag, maar bijvoorbeeld: "In deze periode dachten mensen dat..."');
  lines.push("");
  lines.push("3. Hoofdvraag (leerlingentaal)");
  lines.push("- Formuleer één hoofdvraag die voldoet aan de basisregels uit de MASTERPROMPT:");
  lines.push('  * verwondering over het verleden vanuit de tijd zelf;');
  lines.push('  * géén hindsight- of nu-taal;');
  lines.push('  * geschikt voor meerdere dimensies en minstens 10 bronnen.');
  lines.push("- Pas de gekozen toon-categorie (1, 2 of 3) consequent toe.");
  lines.push("");
  lines.push("4. Deelvragen (4 stuks per voorstel)");
  lines.push("- Kies EXACT 4 deelvragen die samen de hoofdvraag dekken (zie MASTERPROMPT).");
  lines.push("- Voor elke deelvraag geef je in de JSON:");
  lines.push('  * "vraag": de deelvraag in leerlingentaal,');
  lines.push('  * "dimensie": de gekozen dimensie (zoals in de base-prompt),');
  lines.push('  * "subdimensie": een kort label voor de concrete uitwerking.');
  lines.push("");
  lines.push("5. Leeropbrengsten (vooruitblik voor de docent)");
  lines.push("- Formuleer per lesvoorstel MINIMAAL 3 en MAXIMAAL 6 leeropbrengsten.");
  lines.push("- Een leeropbrengst is een korte zin over wat leerlingen aan het eind van de les");
  lines.push("  kunnen uitleggen of beargumenteren.");
  lines.push("- Bij voorkeur koppel je elke leeropbrengst aan een deelvraagIndex (0–3).");
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
  lines.push("- meerdere dimensies dekken, zoals in de base-prompt beschreven.");
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


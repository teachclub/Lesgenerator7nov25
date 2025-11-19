const { searchRaw } = require('../services/a11.europeana.cjs');
const { callGeminiApi } = require('../services/a19.generate.cjs');

const MODEL_SOURCES = () => "gemini-2.5-pro";

async function getSourcesForProposalService(term, filters, chosenProposal) {
  
  console.log(`[B02 Service] Stap 4b: Echte bronnen (opnieuw) ophalen voor: "${term}"`);
  
  const searchParams = {
    query: term,
    qf: filters || [],
    rows: 100,
    media: true,
    profile: 'rich',
  };
  
  const europeanaResult = await searchRaw(searchParams);

  if (!europeanaResult.ok || !europeanaResult.data || !europeanaResult.data.items) {
    console.error("[B02 Service] Stap 4b Mislukt: Kon Europeana bronnen niet ophalen.");
    return { ok: false, error: "Fout bij ophalen bronnen van Europeana." };
  }

  const sources = europeanaResult.data.items;
  if (sources.length === 0) {
    return { ok: false, error: "Geen bronnen gevonden voor deze zoekterm." };
  }

  console.log(`[B02 Service] Stap 4c: ${sources.length} bronnen gevonden. Sturen naar Gemini voor analyse...`);

  const sourceListText = sources.map((src, i) => {
    const title = Array.isArray(src.title) ? src.title[0] : src.title;
    const provider = Array.isArray(src.dataProvider) ? src.dataProvider[0] : src.dataProvider;
    const description = src.dcDescription ? (Array.isArray(src.dcDescription) ? src.dcDescription[0] : src.dcDescription) : 'N.v.t.';

    return `Bron ${i+1}:
ID: "${src.id}"
Titel: "${title}"
Type: "${src.type}"
Provider: "${provider}"
Omschrijving (indien beschikbaar): ${description}
---`;
  }).join('\n');

  const proposalText = `
Gekozen Lesvoorstel:
Titel: "${chosenProposal.title}"
Hoofdvraag: "${chosenProposal.mainQuestion}"
Lesopbrengst: "${chosenProposal.learningOutcome}"
`;

  const prompt = `
Je bent een expert in geschiedenisdidactiek. Je hebt twee taken.
Hier is een lijst van ${sources.length} ECHTE bronnen en een GEKOZEN LESVOORSTEL.

Taak 1: Selecteer de "Preset Melange".
Selecteer de 3 tot 5 bronnen uit de lijst die de 'perfecte preset melange' vormen voor het gekozen lesvoorstel.
Deze preset MOET voldoen aan:
- Perfect passend bij de hoofdvraag.
- Op niveau voor leerlingen (15-16 jaar).
- Tekstbronnen moeten 60-100 woorden relevante tekst bevatten.
- Beeldbronnen moeten een goede toelichting hebben.

Taak 2: Selecteer de "Overige" bronnen.
Selecteer de overige bronnen uit de lijst die OOK geschikt zijn voor dit lesvoorstel.

Strikte Instructies:
1. Geef ANTWOORD in een strict JSON-object: { "presetSourceIDs": [...], "otherSourceIDs": [...] }.
2. De arrays moeten lijsten van BRON-IDs (bijv. "/92037/_apv8s6k") bevatten, precies zoals ze in de bronnenlijst staan.
3. Baseer je selectie UITSLUITEND op de bronnen uit deze lijst. Verzin GEEN IDs.

GEKOZEN LESVOORSTEL:
${proposalText}

LIJST MET ECHTE BRONNEN:
${sourceListText}

Genereer nu de twee lijsten met Bron-IDs in het gevraagde JSON-formaat.
`;

  const geminiResult = await callGeminiApi(prompt, MODEL_SOURCES());

  if (!geminiResult.ok) {
    return geminiResult;
  }

  const { presetSourceIDs: presetIds, otherSourceIDs: otherIds } = geminiResult.data;

  const findSourceById = (id) => sources.find(s => s.id === id);

  const presetSources = presetIds.map(findSourceById).filter(Boolean);
  const otherSources = otherIds.map(findSourceById).filter(Boolean);

  return {
    ok: true,
    data: {
      presetSources,
      otherSources,
    }
  };
}

module.exports = {
  getSourcesForProposalService,
};

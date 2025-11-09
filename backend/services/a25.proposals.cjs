const { searchRaw } = require('../services/a11.europeana.cjs');
const { callGeminiApi } = require('../services/a19.generate.cjs');

const MODEL_PROPOSALS = () => "gemini-2.5-flash";

async function generateProposalsService(term, filters) {
  
  console.log(`[B01 Service] Stap 2a: Echte bronnen ophalen voor: "${term}"`);
  
  const searchParams = {
    query: term,
    qf: filters || [],
    rows: 100,
    media: true,
    profile: 'rich',
  };
  
  const europeanaResult = await searchRaw(searchParams);

  if (!europeanaResult.ok || !europeanaResult.data || !europeanaResult.data.items) {
    console.error("[B01 Service] Stap 2a Mislukt: Kon Europeana bronnen niet ophalen.");
    return { ok: false, error: "Fout bij ophalen bronnen van Europeana." };
  }

  const sources = europeanaResult.data.items;
  if (sources.length === 0) {
    return { ok: false, error: "Geen bronnen gevonden voor deze zoekterm." };
  }

  console.log(`[B01 Service] Stap 2b: ${sources.length} bronnen gevonden. Sturen naar Gemini voor analyse...`);

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

  const prompt = `
Je bent een expert in geschiedenisdidactiek. Hier is een lijst van ${sources.length} ECHTE bronnen.
Jouw taak is om op basis van DEZE LIJST 3 unieke lesvoorstellen te genereren.

Strikte Instructies:
1. Geef ANTWOORD in een strict JSON-object: { "proposals": [...] }.
2. Analyseer de bronnen op diversiteit, perspectief, en geschiktheid voor leerlingen.
3. Elk object in de 'proposals' array moet de structuur hebben: { "id": "voorstel_1", "title": "...", "mainQuestion": "...", "learningOutcome": "..." }.
4. De 'mainQuestion' MOET het 'presentisme' (leerlingoordeel) IMPLICIET bevatten (bijv. "Waarom stemden miljoenen Duitsers massaal op een monster als Hitler?").
5. De 'learningOutcome' MOET beginnen met "Na de les weten leerlingen beter dat...".

LIJST MET ECHTE BRONNEN:
${sourceListText}

Genereer nu de 3 lesvoorstellen in het gevraagde JSON-formaat. Baseer de voorstellen UITSLUITEND op de bronnen uit deze lijst.
`;

  return callGeminiApi(prompt, MODEL_PROPOSALS());
}

module.exports = {
  generateProposalsService,
};

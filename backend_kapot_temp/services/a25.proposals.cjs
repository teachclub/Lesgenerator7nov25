const europeanaService = require('./a12.search.cjs');
const kleioService = require('./a27.kleio.cjs'); // <-- De "Add-on"
const geminiService = require('./a05.gemini.cjs');

/**
 * Bouwt de prompt voor Gemini om 3 lesvoorstellen te genereren.
 * @param {string} query - De zoekterm (bv. "luther")
 * @param {string} doelgroep - (bv. "Bovenbouw VWO")
 * @param {Array<object>} imageSources - De lijst met plaatjes van Europeana
 * @param {Array<object>} textSources - De lijst met teksten van Kleio
 * @returns {string} De complete prompt
 */
const createProposalPrompt = (query, doelgroep, imageSources, textSources) => {
  // Converteer de bronnen naar een simpele lijst voor de prompt
  const imageList = imageSources.map((src, i) => `  Plaatje ${i+1}: "${src.title}" (Bron: ${src.provider})`).join('\n');
  const textList = textSources.map((src, i) => `  Tekst ${i+1}: "${src.title}" (Samenvatting: ${src.description})`).join('\n');

  return `
    Je bent een expert AI-assistent voor geschiedenisdocenten.
    De docent (doelgroep: "${doelgroep}") heeft gezocht op: "${query}".
    
    Ik heb twee soorten bronnen verzameld:
    
    1. RELEVANTE AFBEELDINGEN (van Europeana):
    ${imageList || "  (Geen afbeeldingen gevonden)"}
    
    2. RELEVANTE TEKSTBRONNEN (van Kleio):
    ${textList || "  (Geen tekstbronnen gevonden)"}
    
    JOUW TAAK:
    Bedenk 3 unieke, zinnige en didactisch sterke lesvoorstellen (hoofdvragen) op basis van een *combinatie* van deze bronnen. De voorstellen moeten de docent inspireren.
    
    REGELS:
    1. De voorstellen moeten direct te maken hebben met de geleverde bronnen.
    2. Geef ALLEEN een JSON-array terug. Geen markdown, geen uitleg.
    3. Formaat:
       [
         { "title": "Hoofdvraag of Titel 1", "description": "Korte beschrijving (1-2 zinnen) van het lesvoorstel." },
         { "title": "Hoofdvraag of Titel 2", "description": "Korte beschrijving." },
         { "title": "Hoofdvraag of Titel 3", "description": "Korte beschrijving." }
       ]
    
    JSON Output:
  `;
};

/**
 * Dit is de hoofdfunctie die de 'controller' (route) aanroept.
 */
const generateProposals = async (query, filters, doelgroep) => {
  try {
    // === STAP 1: HAAL BEIDE BRONNEN PARALLEL OP ===
    
    // Pas de filters aan: we willen *alleen* plaatjes van Europeana
    const imageFilters = { ...filters, types: ['IMAGE'] };
    
    const [imageSources, textSources] = await Promise.all([
      // Werknemer 1: Haal top 10 plaatjes
      europeanaService.searchEuropeana(query, imageFilters, 10),
      // Werknemer 2: Haal top 5 teksten
      kleioService.scrapeKleio(query, 'tekst', 5)
    ]);

    // We hebben alleen de 'items' nodig van Europeana
    const europeanaItems = imageSources.items || [];
    
    console.log(`[a25.proposals] Bronnen verzameld: ${europeanaItems.length} plaatjes, ${textSources.length} teksten.`);

    // === STAP 2: BOUW DE PROMPT & VRAAG GEMINI ===
    
    const prompt = createProposalPrompt(query, doelgroep, europeanaItems, textSources);
    const aiResponseString = await geminiService.getGeminiSuggestions(prompt);

    // === STAP 3: STUUR DE VOORSTELLEN TERUG ===
    
    const proposals = JSON.parse(aiResponseString);
    
    // We sturen OOK de bronnen mee, zodat we ze later niet opnieuw hoeven te halen!
    return { 
      proposals,
      sourceData: {
        images: europeanaItems,
        texts: textSources
      }
    };

  } catch (error) {
    console.error("[a25.proposals] Fout bij genereren voorstellen:", error.message);
    throw new Error(`Fout bij genereren voorstellen: ${error.message}`);
  }
};

module.exports = {
  generateProposals
};

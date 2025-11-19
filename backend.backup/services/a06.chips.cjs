const geminiService = require('./a05.gemini.cjs');
const europeanaService = require('./a12.search.cjs'); 

const createChipsPrompt = (query, doelgroep) => {
  return `
    Je bent een expert AI-assistent voor geschiedenisdocenten (doelgroep: "${doelgroep}").
    De docent zoekt naar: "${query}".
    JOUW TAAK: Genereer een lijst van 10-15 *specifieke* en *gerelateerde* zoektermen (chips) die de zoekopdracht verfijnen.
    GEEF EEN GOEDE MIX VAN DEZE CATEGORIEËN:
    - PERSONEN (bv. Calvijn, Svingli, Melanchthon)
    - PLAATSEN (bv. Wittenberg, Worms, Eisenach)
    - GEBEURTENISSEN (bv. Rijksdag van Worms, 95 stellingen)
    - BEGRIPPEN (bv. Reformatie, Protestantisme, aflaat, schisma)
    BELANGRIJKE REGELS:
    1. Geef *alleen* de JSON-array terug. GEEN markdown, GEEN uitleg.
    2. Formaat: [ { "label": "Suggestie 1" }, { "label": "Suggestie 2" } ]
    Taak: Genereer de JSON voor "${query}" (doelgroep: "${doelgroep}").
    JSON:
  `;
};

const generateVerifiedChips = async (query, filters, doelgroep) => {
  let candidateChips = [];
  
  try {
    const prompt = createChipsPrompt(query, doelgroep);
    const aiResponseString = await geminiService.getGeminiSuggestions(prompt);
    candidateChips = JSON.parse(aiResponseString);
  } catch (error) {
    console.error("[a06.chips] AI-suggesties fout:", error.message);
    return { chips: [] }; 
  }

  console.log(`[a06.chips] AI gaf ${candidateChips.length} kandidaten. Start verificatie...`);
  
  const verifiedChips = [];
  
  for (const candidate of candidateChips) {
    try {
      // DE FIX: Aanhalingstekens ("") rond de label zijn verwijderd
      const hybridQuery = `${query} AND ${candidate.label}`;
      
      const searchResult = await europeanaService.searchEuropeana(hybridQuery, filters, 1);
      const count = searchResult.totalResults;
      
      if (count > 0) {
        verifiedChips.push({
          label: candidate.label,
          count: count 
        });
      } else {
        console.log(`[a06.chips] Filter: "${candidate.label}" (0 hits) verwijderd.`);
      }
      
    } catch (loopError) {
      console.error(`[a06.chips] Fout bij verifiëren van chip "${candidate.label}":`, loopError.message);
    }
  }

  verifiedChips.sort((a, b) => b.count - a.count);
  
  console.log(`[a06.chips] Verificatie compleet. ${verifiedChips.length} chips overgebleven.`);
  return { chips: verifiedChips };
};

module.exports = {
  generateVerifiedChips
};

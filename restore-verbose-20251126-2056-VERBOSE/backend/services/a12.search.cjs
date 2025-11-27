const fetch = require('node-fetch');
// DE FIX: We importeren de nieuwe, slimme mapper
const { mapEuropeanaItem } = require('./a24.item.cjs');

const API_KEY = process.env.EUROPEANA_WSKEY;
const API_URL = 'https://api.europeana.eu/record/v2/search.json';

// DE FIX: De oude 'transformToHit' functie is nu VERWIJDERD.

const searchEuropeana = async (queryString, filters = {}, rows = 24) => {
  if (!API_KEY) {
    throw new Error("EUROPEANA_WSKEY mist in .env"); 
  }

  const params = new URLSearchParams({
    wskey: API_KEY,
    query: queryString,
    rows: rows.toString(),
    profile: 'rich',
    reusability: 'open',
    media: 'true'
  });

  // De 'qf' (Query Filter) logica
  if (filters?.types && filters.types.length > 0) {
    const typeQuery = filters.types.map(t => `TYPE:${t}`).join(' OR ');
    params.append('qf', `(${typeQuery})`);
  }
  if (filters?.noCartoons) {
    params.append('qf', `NOT (dcSubject:"spotprent" OR dcSubject:"cartoon")`);
  }

  const url = `${API_URL}?${params.toString()}`;
  console.log(`[Service a12] Zoeken in Europeana (Params): ${params.toString()}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Europeana API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // DE FIX: We gebruiken nu de 'mapEuropeanaItem' van de nieuwe mapper
    const items = (data.items || []).map(mapEuropeanaItem);

    return {
      items: items,
      totalResults: data.totalResults || 0
    };

  } catch (error) {
    console.error("Fout in searchEuropeana service:", error);
    throw error;
  }
};

module.exports = {
  searchEuropeana
};

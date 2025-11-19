const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.vgnkleio.nl';

/**
 * STAP 1: Scrape de *lijst-pagina* om de links te vinden
 */
const fetchSourceLinks = async (query, type, limit) => {
  const params = new URLSearchParams();
  params.append('_zoeken', query);
  if (type) {
    params.append('_filter_bron_type', type);
  }
  
  const searchUrl = `${BASE_URL}/bronnen/?${params.toString()}`;
  console.log(`[a27.kleio] Stap 1: Links zoeken op ${searchUrl}`);

  const { data: html } = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Lessy-Lesgenerator/1.0' }
  });

  const $ = cheerio.load(html);
  const links = [];
  const queryLower = query.toLowerCase(); // Voor de check

  // DE "SCHERPSCHUTTER"-FIX (per OpenAI's analyse):
  $('h3').each((i, el) => {
    if (links.length >= limit) return; 

    const $h3 = $(el); // Het <h3> element
    
    // 1. Vind de link *binnen* de h3
    const $a = $h3.find('a[href*="/bronnen/"]').first();
    if (!$a.length) return; // Geen bron-link? Sla deze <h3> over.

    // 2. Controleer de "buurman" (het element direct na de h3)
    const metaText = $h3.next().text().trim();

    // 3. Eerste filter: Is dit een "Bron"?
    if (!metaText.includes('Primair')) {
      return; 
    }
    
    // === DE NIEUWE, STRENGERE FILTER ===
    // We controleren of het *precieze* zoekwoord in de titel of de snippet staat
    const title = $a.text().trim();
    const snippet = $h3.next().next().text().trim(); // De <p> na de 'metaText'
    const blockText = (title + ' ' + snippet).toLowerCase();
    
    // Als de tekst "Luther" (zonder King) niet voorkomt, sla over.
    if (!blockText.includes(queryLower)) {
       console.log(`[a27.kleio] Filter: "${title}" (bevat niet het woord "${query}") verwijderd.`);
       return;
    }
    // === Einde nieuwe filter ===

    const href = $a.attr('href');
    if (href && title) {
      const url = href.startsWith('http') ? href : BASE_URL + href;
      links.push({ title, url });
    }
  });
  
  console.log(`[a27.kleio] Stap 1: ${links.length} (gefilterde) links gevonden.`);
  console.log(`[a27.kleio] LINKS:`, links.map(l => l.title));
  return links;
};

/**
 * STAP 2: Scrape een *detail-pagina*
 */
const fetchSourceDetail = async (item) => {
  try {
    const { data: html } = await axios.get(item.url, {
      headers: { 'User-Agent': 'Lessy-Lesgenerator/1.0' }
    });
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim() || item.title;
    let fullText = $('main').text().trim() || $('.entry-content').text().trim();
    fullText = fullText.replace(/\s\s+/g, ' ').trim();
    
    return {
      title: title,
      link: item.url,
      description: fullText.substring(0, 250) + '...', 
      fullText: fullText,
      source: 'Kleio'
    };
  } catch (err) {
    console.error(`[a27.kleio] Fout bij ophalen detail ${item.url}: ${err.message}`);
    return null;
  }
};

/**
 * HOOFDFUNCTIE: Combineert Stap 1 en Stap 2
 */
const scrapeKleio = async (query, type = null, limit = 5) => {
  try {
    const linksToFetch = await fetchSourceLinks(query, type, limit);
    if (linksToFetch.length === 0) {
      console.log("[a27.kleio] Geen links gevonden (selector mislukt of 0 resultaten).");
      return [];
    }
    
    const detailPromises = linksToFetch.map(item => fetchSourceDetail(item));
    const sources = (await Promise.all(detailPromises)).filter(Boolean); 

    console.log(`[a27.kleio] Scrapen voltooid. ${sources.length} bronnen met *inhoud* opgehaald.`);
    return sources;

  } catch (error) {
    console.error(`[a27.kleio] Fout tijdens scrapen: ${error.message}`);
    return [];
  }
};

module.exports = {
  scrapeKleio,
};

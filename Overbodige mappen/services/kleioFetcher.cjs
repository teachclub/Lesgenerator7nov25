// --- DEBUG: v3.5 kleioFetcher.cjs GELADEN (met _zoeken fix) ---
console.log("--- DEBUG: v3.5 kleioFetcher.cjs GELADEN ---");

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// De URL van de VGN Kleio website
const KLEIO_SITE_URL = "https://www.vgnkleio.nl/";

/**
 * Haalt de HTML-pagina van de zoekresultaten op.
 * @param {string} searchTerm
 * @returns {Promise<string>} HTML-tekst
 */
async function fetchKleioSearchPage(searchTerm) {
    // --- DE FIX (gebaseerd op jouw ontdekking) ---
    // Gebruikt nu /bronnen/ pad en ?_zoeken= parameter
    const searchUrl = `${KLEIO_SITE_URL}bronnen/?_zoeken=${encodeURIComponent(searchTerm)}`;
    console.log(`[kleioFetcher v3.5] searchUrl = ${searchUrl}`);

    const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Masterprompt-Bot/1.0' }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${searchUrl}`);
    }
    return await response.text();
}

/**
 * Parset de HTML en extraheert bron-links.
 * @param {string} html
 * @returns {Array<{title: string, url: string}>}
 */
function parseSourceLinks(html) {
    const items = [];

    // De regex was al correct, want we zochten al naar links
    // die 'vgnkleio.nl/bronnen/' bevatten.
    const regex = /<a\s+href="([^"]*vgnkleio\.nl\/bronnen\/[^"]+)"[^>]*>([^<]+)<\/a>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
        const url = match[1];
        const title = match[2].trim().replace(/&amp;/g, '&'); 

        if (url && title) {
            if (!items.some(item => item.url === url)) {
                items.push({ title, url });
            }
        }
    }

    console.log(`[kleioFetcher v3.5] ${items.length} unieke bronlinks gevonden in HTML.`);
    return items;
}

/**
 * Hoofdfunctie: Zoek op Kleio
 */
async function kleioSearch(q, limit = 5) {
    console.log(`[kleioSearch v3.5] Start zoekopdracht voor: ${q}`);

    const html = await fetchKleioSearchPage(q);
    const links = parseSourceLinks(html);

    const items = links.slice(0, limit).map(link => ({
        title: link.title,
        url: link.url,
        snippet: "", 
        date: null,
        source: "kleio",
        origin: "https://www.vgnkleio.nl/bronnen",
        license: "© VGN Kleio – educatief gebruik",
        sensitive: false,
        confidence: 0.8
    }));

    return {
        q: q,
        count: items.length,
        items: items
    };
}

// Exporteer de functie voor server.cjs
module.exports = { kleioSearch };

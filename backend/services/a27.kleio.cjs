const axios = require('axios');
const cheerio = require('cheerio');

// Helper: Is dit plaatje geldig?
const isValidImage = (src) => {
    if (!src) return false;
    const s = src.toLowerCase();
    if (s.includes('logo') || s.includes('icon') || s.includes('placeholder')) return false;
    return true;
};

// Scrape 1 pagina
const fetchDetail = async (url) => {
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
        const $ = cheerio.load(data);
        
        let fullText = $('.elementor-widget-theme-post-content').text().trim() || $('.entry-content').text().trim();
        if (!fullText || fullText.length < 50) {
             $('header, footer, nav').remove();
             fullText = $('body p').text().trim();
        }

        let img = $('.elementor-widget-theme-post-content img').attr('src') || $('.entry-content img').attr('src');
        if (!isValidImage(img)) img = null;

        return { text: fullText.replace(/\s+/g, ' ').substring(0, 600), image: img };
    } catch (e) { return { text: null, image: null }; }
};

// Zoek 1 term
const searchSingleTerm = async (term) => {
    // Veiligheid: zorg dat term een string is
    const safeTerm = String(term).trim();
    if (!safeTerm) return [];

    console.log(`[Kleio] 🔍 Zoeken naar: "${safeTerm}"`);
    const url = `https://www.vgnkleio.nl/?s=${encodeURIComponent(safeTerm)}`;
    
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const results = [];

        $('article').each((i, elem) => {
            if (results.length >= 5) return;
            const title = $(elem).find('h2 a, .entry-title a').text().trim();
            const link = $(elem).find('a').attr('href');
            let thumb = $(elem).find('img').attr('src');
            
            if (title && link) {
                results.push({ title, link, thumb });
            }
        });
        return results;
    } catch (e) { return []; }
};

const searchKleio = async ({ query, filters }) => {
    if (filters.kleio === false) return [];

    // --- INPUT NORMALISATIE (DE FIX) ---
    let terms = [];
    
    if (Array.isArray(query)) {
        // Als het al een lijst is (vanuit a14), gebruik hem direct
        terms = query;
    } else if (typeof query === 'string') {
        // Als het tekst is, kijk of we moeten splitsen op ' OR '
        terms = query.includes(' OR ') ? query.split(' OR ') : [query];
    }

    // Filter lege waarden eruit
    terms = terms.filter(t => t && typeof t === 'string' && t.trim().length > 0);

    if (terms.length === 0) return [];

    console.log(`[Kleio] 🚀 Start Multiquery met ${terms.length} termen...`);

    // Parallel zoeken
    const allPromises = terms.map(term => searchSingleTerm(term));
    const resultsPerTerm = await Promise.all(allPromises);
    
    // Ontdubbelen
    const uniqueLinks = new Set();
    const flatResults = [];

    resultsPerTerm.flat().forEach(item => {
        if (!uniqueLinks.has(item.link)) {
            uniqueLinks.add(item.link);
            flatResults.push(item);
        }
    });

    console.log(`[Kleio] Totaal ${uniqueLinks.size} unieke hits gevonden. Nu verrijken...`);

    // Verrijken
    const enriched = await Promise.all(flatResults.map(async (item, i) => {
        const details = await fetchDetail(item.link);
        return {
            id: `kleio-${i}`,
            title: item.title,
            description: details.text || '...',
            fullText: details.text,
            imageUrl: details.image || (isValidImage(item.thumb) ? item.thumb : null),
            url: item.link,
            provider: 'Kleio',
            type: details.image ? 'IMAGE' : 'TEXT'
        };
    }));

    // Filteren
    return enriched.filter(item => {
        if (filters.images === false && item.type === 'IMAGE') return false;
        if (filters.text === false && item.type === 'TEXT') return false;
        return true;
    });
};

module.exports = { searchKleio };

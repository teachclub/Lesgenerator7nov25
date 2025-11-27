const axios = require('axios');
const cheerio = require('cheerio');

const isValidImage = (src) => {
    if (!src) return false;
    const s = src.toLowerCase();
    if (s.includes('logo') || s.includes('icon') || s.includes('placeholder') || s.includes('avatar')) return false;
    return true;
};

const fetchDetail = async (url) => {
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
        const $ = cheerio.load(data);
        
        $('script, style, nav, header, footer, .sharedaddy, .jp-relatedposts, #cookie-notice').remove();

        let fullText = $('.elementor-widget-theme-post-content').text().trim() || $('.entry-content').text().trim();
        
        // Fallback: Paragrafen
        if (!fullText || fullText.length < 50) {
             let paragraphs = [];
             $('body p').each((_, p) => {
                 const t = $(p).text().trim();
                 if (t.length > 40) paragraphs.push(t);
             });
             fullText = paragraphs.join('\n\n');
        }
        
        // HIER ZAT DE FOUT: We gaven een standaardzin terug. Nu geven we null.
        if (!fullText || fullText.length < 50) {
            fullText = null; 
        } else {
            fullText = fullText.replace(/\s+/g, ' ').trim();
        }

        let img = $('.elementor-widget-theme-post-content img').attr('src') || $('.entry-content img').attr('src');
        if (!isValidImage(img)) img = null;

        return { text: fullText, image: img };

    } catch (e) { 
        return { text: null, image: null }; 
    }
};

// De rest van het bestand (zoeken)
const searchSingleTerm = async (term) => {
    const url = `https://www.vgnkleio.nl/?s=${encodeURIComponent(term)}`;
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const results = [];
        $('article').each((i, elem) => {
            if (results.length >= 5) return;
            const title = $(elem).find('h2 a, .entry-title a').text().trim();
            const link = $(elem).find('a').attr('href');
            let thumb = $(elem).find('img').attr('src');
            if (title && link) results.push({ title, link, thumb });
        });
        return results;
    } catch (e) { return []; }
};

const searchKleio = async ({ query, filters }) => {
    if (filters.kleio === false) return [];

    let terms = [];
    if (Array.isArray(query)) terms = query;
    else if (typeof query === 'string') terms = query.includes(' OR ') ? query.split(' OR ') : [query];
    terms = terms.filter(t => t && t.trim().length > 0);

    if (terms.length === 0) return [];

    console.log(`[Kleio] 🚀 Multiquery met ${terms.length} termen...`);
    const allPromises = terms.map(term => searchSingleTerm(term));
    const resultsPerTerm = await Promise.all(allPromises);
    
    const uniqueLinks = new Set();
    const flatResults = [];
    resultsPerTerm.flat().forEach(item => {
        if (!uniqueLinks.has(item.link)) {
            uniqueLinks.add(item.link);
            flatResults.push(item);
        }
    });

    console.log(`[Kleio] ${uniqueLinks.size} hits. Verrijken...`);

    const enriched = await Promise.all(flatResults.map(async (item, i) => {
        const details = await fetchDetail(item.link);
        
        // ALS er geen tekst en geen plaatje is, is de bron waardeloos
        if (!details.text && !details.image && !isValidImage(item.thumb)) {
            return null; // Dit wordt straks eruit gefilterd
        }

        return {
            id: `kleio-${i}`,
            title: item.title,
            description: details.text ? details.text.substring(0, 200) + '...' : '',
            fullText: details.text, // Kan null zijn
            imageUrl: details.image || (isValidImage(item.thumb) ? item.thumb : null),
            url: item.link,
            provider: 'Kleio',
            type: details.image ? 'IMAGE' : 'TEXT'
        };
    }));

    // Filter nulls eruit
    const validResults = enriched.filter(item => item !== null);

    return validResults.filter(item => {
        if (filters.images === false && item.type === 'IMAGE') return false;
        if (filters.text === false && item.type === 'TEXT') return false;
        return true;
    });
};

module.exports = { searchKleio };


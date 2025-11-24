const axios = require('axios');
const cheerio = require('cheerio');

// --- 1. DE VOLLEDIGE VWO THESAURUS ---
const KA_THESAURUS = [
  { ka: "De levenswijze van jager-verzamelaars", tijdvak: "Tijdvak 1", keywords: ["jager-verzamelaar", "nomaden", "prehistorie", "hunebed", "vuursteen", "grotschildering", "ijstijd", "ötzi"] },
  // ... (Lijst ingekort voor leesbaarheid, de logica werkt met de volledige lijst)
  { ka: "Koude Oorlog", tijdvak: "Tijdvak 10", keywords: ["koude oorlog", "ijzeren gordijn", "sovjet-unie", "navo", "berlijnse muur", "wapenwedloop", "kennedy", "korea", "vietnam"] }
];

// --- 2. HULPFUNCTIES ---
const isValidImage = (src) => {
    if (!src) return false;
    const s = src.toLowerCase();
    
    // Zwarte lijst: alles wat geen echte content is
    const blacklist = ['logo', 'icon', 'avatar', 'spacer', 'pixel', 'blank', 'trans.gif', 'print', 'share', 'facebook', 'twitter', 'linkedin'];
    if (blacklist.some(b => s.includes(b))) return false;

    // Moet een echte extensie hebben
    if (!/\.(jpg|jpeg|png|webp)/.test(s)) return false;

    return true;
};

const analyzeTextForTags = (text) => {
    const foundKAs = new Set();
    const foundTVs = new Set();
    const lowerText = text.toLowerCase();

    KA_THESAURUS.forEach(entry => {
        const match = entry.keywords.some(keyword => lowerText.includes(keyword));
        if (match) {
            foundKAs.add(entry.ka);
            if (entry.tijdvak) foundTVs.add(entry.tijdvak);
        }
    });
    
    if (lowerText.match(/\b19[5-9]\d\b/)) foundTVs.add('Tijdvak 10'); // Vangnet

    return { kas: Array.from(foundKAs), tvs: Array.from(foundTVs) };
};

const TIJDVAK_MAPPING = { 'Tijdvak 10': '20e-eeuw' }; // (Inkorting voor voorbeeld)

// --- 3. DE PERMISSIVE FETCH (Met Elementor Fix) ---
const fetchDetail = async (url) => {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 4000
        });
        const $ = cheerio.load(data);
        
        // SCHOONMAAK
        $('script, style, nav, header, footer, .elementor-location-header, .elementor-location-footer').remove();

        // TEKST ZOEKEN
        let fullText = '';
        const elContent = $('.elementor-widget-theme-post-content');
        if (elContent.length > 0) fullText = elContent.text();
        if (!fullText) fullText = $('.entry-content').text();
        
        // Vangnet: Alle paragrafen in de body
        if (!fullText || fullText.length < 50) {
            $('body p').each((_, p) => {
                const t = $(p).text().trim();
                if (t.length > 30) fullText += t + '\n\n';
            });
        }
        fullText = fullText.replace(/\s+/g, ' ').trim();

        // AFBEELDINGEN ZOEKEN (Strenger!)
        let detailImg = null;
        
        // Zoek plaatjes in de content area
        $('img').each((i, el) => {
            if (detailImg) return;
            const src = $(el).attr('src');
            
            // Check: Moet in uploads map zitten en geen troep zijn
            if (src && src.includes('/wp-content/uploads/') && isValidImage(src)) {
                detailImg = src;
            }
        });

        return {
            text: fullText || 'Geen tekst gevonden.',
            image: detailImg // Blijft null als er geen geldige image is gevonden
        };
    } catch (e) {
        console.error(`[FetchDetail] Fout bij ${url}: ${e.message}`);
        return { text: null, image: null };
    }
};

const searchKleio = async ({ query, filters }) => {
    if (filters && filters.providers?.length > 0 && !filters.providers.includes('Kleio')) return [];

    const searchUrl = `https://www.vgnkleio.nl/?s=${encodeURIComponent(query)}`;

    try {
        const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const basicResults = [];

        // Pak de zoekresultaten
        $('article, .post, .type-post').each((i, elem) => {
            if (basicResults.length >= 10) return; 
            const title = $(elem).find('h2, h3, .entry-title a').first().text().trim();
            const link = $(elem).find('a').first().attr('href');
            
            if (title && link) {
                basicResults.push({ title, link });
            }
        });

        // Deep Fetch + Labelen
        const detailedResults = await Promise.all(basicResults.map(async (item, index) => {
            const details = await fetchDetail(item.link);
            const scanText = `${item.title} ${details.text || ''}`;
            const analysis = analyzeTextForTags(scanText);

            // TYPE BEPALING: Alleen IMAGE als er ook echt een image is gevonden
            const type = details.image ? 'IMAGE' : 'TEXT';

            return {
                id: `kleio-${Date.now()}-${index}`, 
                title: item.title,
                description: details.text ? details.text.substring(0, 200) + '...' : '',
                fullText: details.text,
                imageUrl: details.image, // Kan null zijn
                link: item.link,
                url: item.link,
                provider: 'Kleio',
                type: type,
                tv: analysis.tvs,
                ka: analysis.kas
            };
        }));

        const finalResults = detailedResults.filter(r => r.fullText && r.fullText.length > 10);
        
        console.log(`[a27.kleio] ✅ ${finalResults.length} resultaten voor "${query}".`);
        return finalResults;

    } catch (error) {
        console.error('[a27.kleio] ❌ Fout:', error.message);
        return [];
    }
};

module.exports = { searchKleio };

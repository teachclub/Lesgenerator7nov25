const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

let citoCache = [];

const isImageUrl = (text) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return lower.includes('googleusercontent.com') || 
           lower.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
};

const loadCitoData = () => {
    try {
        const csvPath = path.join(__dirname, '../sources/cito_bronnen.csv'); 
        if (!fs.existsSync(csvPath)) return;
        const csvFile = fs.readFileSync(csvPath, 'utf8');

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            delimiter: ",", 
            complete: (results) => {
                citoCache = results.data.map((record, index) => {
                    let rawContent = record.TEKSTBRON_OFURL || record.URL || record.TEKSTBRON || '';
                    
                    const isImage = isImageUrl(rawContent);
                    // Geen HTTPS dwang (Raw URL behouden voor werkende plaatjes)

                    const tv = record.METADATA_TV_HC || record.TIJDVAK || '';
                    const ka = record.METADATA_KA || record.KA || '';

                    return {
                        id: `cito-${index}`,
                        title: record.INLEIDING_BRON1 || 'Naamloze Cito Bron',
                        imageUrl: isImage ? rawContent : null,
                        description: isImage ? (record.TOELICHTING_BRON || 'Afbeelding') : rawContent,
                        fullText: isImage ? record.TOELICHTING_BRON : rawContent,
                        highlight: isImage ? (record.TOELICHTING_BRON || 'Afbeelding') : rawContent.substring(0, 200) + '...',
                        link: isImage ? rawContent : null,
                        provider: 'Cito',
                        type: isImage ? 'IMAGE' : 'TEXT',
                        year: record.JAAR || '',
                        tv: tv ? [tv] : [],
                        ka: ka ? [ka] : []
                    };
                });
                console.log(`[a28.cito] ✅ ${citoCache.length} items geladen.`);
            },
            error: (err) => console.error(err)
        });
    } catch (error) { console.error(error); }
};

loadCitoData();

const searchCito = ({ query, filters }) => {
    if (filters.providers?.length > 0 && !filters.providers.includes('Cito')) return [];
    
    let results = citoCache;

    // --- BOOLEAN LOGICA ---
    // Werkt hetzelfde als bij Kleio: splits op " NOT "
    if (query && query.trim() !== '') {
        let cleanQuery = query;
        let excludedTerms = [];

        if (query.includes(' NOT ')) {
            const parts = query.split(' NOT ');
            cleanQuery = parts[0].trim().toLowerCase();
            excludedTerms = parts.slice(1).map(t => t.trim().toLowerCase());
        } else {
            cleanQuery = query.toLowerCase();
        }

        results = results.filter(item => {
            const content = (item.title + ' ' + item.description + ' ' + item.fullText).toLowerCase();
            
            // 1. Moet de zoekterm bevatten (als die er is)
            if (cleanQuery && !content.includes(cleanQuery)) return false;

            // 2. Mag GEEN verboden termen bevatten
            if (excludedTerms.some(term => content.includes(term))) return false;

            return true;
        });
    }

    // Filters
    if (filters.types?.length > 0) {
        results = results.filter(item => filters.types.includes(item.type));
    }
    if (filters.tijdvak) {
        results = results.filter(item => item.tv.some(t => t.toLowerCase().includes(filters.tijdvak.toLowerCase())));
    }
    if (filters.kas && filters.kas.length > 0) {
        results = results.filter(item => item.ka.some(kItem => filters.kas.some(kFilter => kItem.toLowerCase().includes(kFilter.toLowerCase()) || kFilter.toLowerCase().includes(kItem.toLowerCase()))));
    }

    return results;
};
module.exports = { searchCito };

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
                    
                    // Normaliseer Tijdvak (zodat "Tijdvak 5" en "5" matchen)
                    let tv = record.METADATA_TV_HC || record.TIJDVAK || '';
                    if (tv.match(/^\d+$/)) tv = `Tijdvak ${tv}`; // Maak van "5" -> "Tijdvak 5"

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

    // 1. Zoekterm (Optioneel: als leeg, toon alles wat aan filters voldoet)
    if (query && query.trim() !== '') {
        const qLower = query.toLowerCase();
        results = results.filter(item => 
            (item.title && item.title.toLowerCase().includes(qLower)) ||
            (item.description && item.description.toLowerCase().includes(qLower))
        );
    }

    // 2. Type Filter
    if (filters.types?.length > 0) {
        results = results.filter(item => filters.types.includes(item.type));
    }

    // 3. Tijdvak Filter
    if (filters.tijdvak) {
        // Frontend stuurt "Tijdvak 5". Backend heeft "Tijdvak 5". 
        // We doen een includes check voor veiligheid.
        results = results.filter(item => 
            item.tv.some(t => t.toLowerCase().includes(filters.tijdvak.toLowerCase()))
        );
    }

    // 4. KA Filter
    if (filters.kas && filters.kas.length > 0) {
        // Cito data bevat vaak de KA tekst. We checken of de tekst uit de filter in de data voorkomt.
        // Omdat de teksten lang zijn, is een simpele 'includes' vaak het beste.
        results = results.filter(item => 
            item.ka.some(kItem => 
                filters.kas.some(kFilter => kItem.toLowerCase().includes(kFilter.toLowerCase()) || kFilter.toLowerCase().includes(kItem.toLowerCase()))
            )
        );
    }

    return results;
};
module.exports = { searchCito };

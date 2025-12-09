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
        let csvPath = path.join(__dirname, '../data/cito_bronnen.csv');
        if (!fs.existsSync(csvPath)) csvPath = path.join(__dirname, '../sources/cito_bronnen.csv');

        if (!fs.existsSync(csvPath)) {
            console.error("[a28.cito] ❌ CSV bestand niet gevonden!");
            return;
        }

        const csvFile = fs.readFileSync(csvPath, 'utf8');

        // HIER ZIT DE FIX: delimiter leeg laten = auto-detect
        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            delimiter: "", 
            complete: (results) => {
                citoCache = results.data.map((record, index) => {
                    // Content
                    let rawContent = record.TEKSTBRON_OFURL || record.URL || record.TEKSTBRON || '';
                    const isImage = isImageUrl(rawContent);

                    // Metadata
                    const tv = record.METADATA_TV_HC || record.TIJDVAK || '';
                    const ka = record.METADATA_KA || record.KA || '';

                    return {
                        id: `cito-${index}`,
                        title: record.INLEIDING_BRON1 || 'Naamloze Cito Bron',
                        imageUrl: isImage ? rawContent : null,
                        content: isImage ? (record.TOELICHTING_BRON || 'Geen toelichting.') : rawContent,
                        description: isImage ? 'Afbeelding' : (rawContent.substring(0, 150) + '...'),
                        provider: 'Cito',
                        type: isImage ? 'IMAGE' : 'TEXT',
                        link: isImage ? rawContent : null,
                        year: record.JAAR || '',
                        rawTv: tv, 
                        rawKa: ka
                    };
                });

                console.log(`[a28.cito] ✅ ${citoCache.length} items geladen.`);

                // Steekproef om te bewijzen dat het nu werkt
                if (citoCache.length > 0) {
                    console.log(">>> CITO STEEKPROEF (Item #1):");
                    console.log("    Titel:", citoCache[0].title.substring(0, 50));
                    console.log("    TV (raw):", citoCache[0].rawTv);
                    console.log("    KA (raw):", citoCache[0].rawKa);
                    console.log("-----------------------------------");
                }
            },
            error: (err) => console.error(err)
        });
    } catch (error) { console.error(error); }
};

loadCitoData();

const searchCito = ({ query, filters }) => {
    if (filters && filters.cito === false) return [];

    let results = citoCache;

    // 1. Zoekterm
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
            const content = (item.title + ' ' + item.content).toLowerCase();
            if (cleanQuery && !content.includes(cleanQuery)) return false;
            if (excludedTerms.some(term => content.includes(term))) return false;
            return true;
        });
    }

    // 2. TIJDVAK FILTER
    if (filters && filters.tv) {
        const tvNum = filters.tv.replace(/\D/g, ''); 
        if (tvNum) {
            // Zoek naar "Tijdvak 1" of "Tijdvak 10"
            const zoekTv = `Tijdvak ${tvNum}`;
            results = results.filter(item => item.rawTv && item.rawTv.includes(zoekTv));
        }
    }

    // 3. KA FILTER
    if (filters && filters.ka && filters.ka.length > 0) {
        const targetNumbers = filters.ka.map(id => id.replace(/\D/g, '')); 

        results = results.filter(item => {
            if (!item.rawKa) return false;
            // Match op "KA 1" of "KA1"
            const rawUpper = item.rawKa.toUpperCase();
            return targetNumbers.some(num => {
                const regex = new RegExp(`KA[^0-9]*${num}(?!\\d)`, 'i');
                return regex.test(item.rawKa);
            });
        });
    }

    // 4. Type Filter
    if (filters) {
        if (filters.images === false) results = results.filter(i => i.type !== 'IMAGE');
        if (filters.text === false) results = results.filter(i => i.type !== 'TEXT');
    }

    return results;
};

module.exports = { searchCito };

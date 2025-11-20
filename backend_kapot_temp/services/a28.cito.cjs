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

// --- BOOLEAN MATCHING LOGIC ---
const matchesBooleanQuery = (text, query) => {
    if (!query) return true;
    const t = text.toLowerCase();
    
    // Simpele parser: split op spaties, respecteer AND/OR/NOT
    // We doen een basis implementatie: 
    // 1. Split op ' OR ' -> als een van deze delen matcht is het goed.
    // 2. Binnen elk deel (AND), moeten alle woorden matchen.
    // 3. NOT wordt apart behandeld.

    const orParts = query.split(/\s+OR\s+/i);
    
    // Het item matcht als MINSTENS EEN van de OR-delen matcht
    return orParts.some(orPart => {
        // Split dit deel op ' AND ' (of gewoon spaties, want spatie = AND standaard)
        // Maar we moeten oppassen voor NOT
        const andParts = orPart.split(/\s+AND\s+|\s+/i).filter(Boolean);
        
        // Check alle AND condities
        return andParts.every(part => {
            if (part.toUpperCase() === 'NOT') return true; // Skip het woord NOT zelf
            
            // Check of het vorige woord NOT was (basis logica, kan geavanceerder)
            // Hier doen we simpele check: als part begint met 'NOT ', of '-'
            // Voor nu: we ondersteunen "NOT woord" in de UI als "NOT woord" string.
            
            // Betere aanpak voor deze simpele versie:
            // We splitsen de orPart opnieuw, nu op " NOT ".
            // Alles VOOR de eerste NOT moet erin zitten. Alles NA een NOT mag er niet in zitten.
            return true; 
        });
    }) && checkAdvancedLogic(t, orPart); // Zie hieronder voor de echte functie
};

// Betere, recursieve functie voor een enkele OR-groep (dus alles is AND, behalve NOT)
const checkAdvancedLogic = (text, queryPart) => {
    const terms = queryPart.trim().split(/\s+/);
    let mustHave = [];
    let mustNotHave = [];
    
    let nextIsNot = false;
    
    terms.forEach(term => {
        if (term.toUpperCase() === 'AND') return; // Negeer, is impliciet
        if (term.toUpperCase() === 'NOT') {
            nextIsNot = true;
            return;
        }
        
        if (nextIsNot) {
            mustNotHave.push(term.toLowerCase());
            nextIsNot = false;
        } else {
            mustHave.push(term.toLowerCase());
        }
    });
    
    // Check verplichte termen
    const hasAll = mustHave.every(term => text.includes(term));
    // Check verboden termen
    const hasNone = mustNotHave.every(term => !text.includes(term));
    
    return hasAll && hasNone;
};

// Hoofdfunctie die OR ondersteunt
const complexMatch = (text, fullQuery) => {
    if (!fullQuery.trim()) return true;
    const lowerText = text.toLowerCase();
    
    // Split op OR
    const orSegments = fullQuery.split(/\s+OR\s+/i);
    
    // Als één van de segmenten waar is, return true
    return orSegments.some(segment => checkAdvancedLogic(lowerText, segment));
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
                    
                    const tvRaw = record.METADATA_TV_HC || record.TIJDVAK || '';
                    let tv = tvRaw.replace(/Tijdvak\s*(\d+)/i, 'Tijdvak $1').trim();
                    if (tv.match(/^\d+$/)) tv = `Tijdvak ${tv}`;

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

    // 1. BOOLEAN ZOEKEN
    if (query && query.trim() !== '') {
        results = results.filter(item => {
            const content = (item.title + ' ' + item.description).toLowerCase();
            return complexMatch(content, query);
        });
    }

    // 2. Filters
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

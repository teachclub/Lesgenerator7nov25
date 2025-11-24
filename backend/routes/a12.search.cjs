const express = require('express');
const router = express.Router();

let citoService;
let kleioService;

try { citoService = require('../services/a28.cito.cjs'); } catch (e) { console.error('Cito load err:', e.message); }
try { kleioService = require('../services/a27.kleio.cjs'); } catch (e) { console.error('Kleio load err:', e.message); }

router.post(['/search', '/search-preset'], async (req, res) => {
    try {
        let { query, term, filters, ka, tv } = req.body;

        // 1. Query Fallback & Normalisatie
        if (!query && term) query = term;
        let qString = Array.isArray(query) ? query.join(' ') : (query || '');

        // 2. LOGICA VOOR 'NOT' OPERATOR
        let searchPart = qString;
        let excludeTerms = [];

        // Check hoofdlettergevoelig en ongevoelig voor de zekerheid
        const splitPattern = / NOT /i; 
        if (splitPattern.test(qString)) {
            const parts = qString.split(splitPattern);
            searchPart = parts[0].trim(); // Het deel voor de NOT
            
            if (parts[1]) {
                excludeTerms = parts[1]
                    .trim()
                    .split(/\s+/)
                    .filter(t => t.length > 0 && t.toUpperCase() !== 'AND' && t.toUpperCase() !== 'OR');
            }
        }
        
        // Kleine opschoning voor AND/OR in het zoekdeel
        searchPart = searchPart.replace(/ AND /gi, ' ').replace(/ OR /gi, ' ').trim();

        // 3. Filters instellen
        if (!filters) filters = {};
        if (ka) filters.ka = ka; 
        if (tv) filters.tv = tv;

        // BEPALEN OF WE MOETEN ZOEKEN (HIER ZAT DE FOUT)
        // We zoeken als er tekst is, OF als er filters (KA/TV) zijn ingesteld.
        const hasText = searchPart.length > 0;
        const hasFilters = (filters.ka && filters.ka.length > 0) || (filters.tv && filters.tv.length > 0);
        const shouldSearch = hasText || hasFilters;

        console.log(`[/api/search] Zoeken naar: "${searchPart}" | Filters actief: ${hasFilters} | Uitsluiten: [${excludeTerms.join(', ')}]`);

        let allResults = [];

        // 4. Cito Zoeken
        const useCito = filters?.cito !== false;
        if (useCito && citoService && shouldSearch) {
            try {
                const citoHits = citoService.searchCito({ query: searchPart, filters });
                allResults = [...allResults, ...citoHits];
            } catch (err) { console.error('Cito fout:', err.message); }
        }

        // 5. Kleio Zoeken
        const useKleio = filters?.kleio !== false;
        if (useKleio && kleioService && shouldSearch) {
            try {
                const kleioHits = await kleioService.searchKleio({ query: searchPart, filters });
                allResults = [...allResults, ...kleioHits];
            } catch (err) { console.error('Kleio fout:', err.message); }
        }

        // 6. FILTEREN ACHTERAF (NOT logica)
        if (excludeTerms.length > 0) {
            const originalCount = allResults.length;
            allResults = allResults.filter(item => {
                const content = `${item.title || ''} ${item.description || ''} ${item.fullText || ''} ${item.date || ''}`.toLowerCase();
                
                // Return FALSE als een verboden woord erin zit
                const hasForbiddenWord = excludeTerms.some(term => content.includes(term.toLowerCase()));
                return !hasForbiddenWord;
            });
            console.log(`[/api/search] NOT-filter: ${originalCount} -> ${allResults.length} items over.`);
        }

        res.json({
            sources: allResults,
            meta: { count: allResults.length, query: qString }
        });

    } catch (error) {
        console.error('[/api/search] CRITICAL ERROR:', error);
        res.status(500).json({ error: 'Interne serverfout tijdens zoeken.' });
    }
});

module.exports = router;

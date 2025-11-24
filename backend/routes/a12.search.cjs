const express = require('express');
const router = express.Router();

let citoService;
let kleioService;

try { citoService = require('../services/a28.cito.cjs'); } catch (e) { console.error('Cito load err:', e.message); }
try { kleioService = require('../services/a27.kleio.cjs'); } catch (e) { console.error('Kleio load err:', e.message); }

router.post(['/search', '/search-preset'], async (req, res) => {
    try {
        // Haal alle mogelijke parameters op
        let { query, term, filters, ka, tv } = req.body;

        // 1. Query Fallback
        if (!query && term) query = term;

        // 2. FILTERS NORMALISEREN (De cruciale stap voor de Thesaurus!)
        if (!filters) filters = {};

        // Als er een KA-ID is meegestuurd (bijv "ka10_1"), zet die in de filters
        if (ka) filters.ka = ka; 
        if (tv) filters.tv = tv;

        console.log('[/api/search-preset] Filters:', filters);

        const qString = Array.isArray(query) ? query.join(' ') : (query || '');
        let allResults = [];

        // 3. Cito Zoeken
        const useCito = filters?.cito !== false;
        if (useCito && citoService) {
            try {
                const citoHits = citoService.searchCito({ query: qString, filters });
                allResults = [...allResults, ...citoHits];
            } catch (err) { console.error('Cito fout:', err.message); }
        }

        // 4. Kleio Zoeken (Nu met correcte filters.ka!)
        const useKleio = filters?.kleio !== false;
        if (useKleio && kleioService) {
            try {
                // Hier gaat filters.ka nu mee naar de service -> kaMap -> Thesaurus
                const kleioHits = await kleioService.searchKleio({ query: qString, filters });
                allResults = [...allResults, ...kleioHits];
            } catch (err) { console.error('Kleio fout:', err.message); }
        }

        console.log(`[/api/search-preset] Totaal hits: ${allResults.length}`);

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

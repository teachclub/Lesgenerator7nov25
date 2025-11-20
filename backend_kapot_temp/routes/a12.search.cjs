const express = require('express');
const router = express.Router();

let citoService;
let kleioService;

// Veilig inladen van services
try {
    citoService = require('../services/a28.cito.cjs');
} catch (e) {
    console.error('[a12.search] Kon Cito service niet laden:', e.message);
}

try {
    kleioService = require('../services/a27.kleio.cjs');
} catch (e) {
    console.error('[a12.search] Kon Kleio service niet laden:', e.message);
}

router.post('/search', async (req, res) => {
    try {
        const { query, filters } = req.body;
        console.log('[/api/search] Request:', { query, filters });

        const qString = Array.isArray(query) ? query.join(' ') : (query || '');
        let allResults = [];

        // 1. CITO ZOEKEN
        const useCito = !filters.providers || filters.providers.length === 0 || filters.providers.includes('Cito');
        
        if (useCito && citoService && citoService.searchCito) {
            try {
                const citoHits = citoService.searchCito({ query: qString, filters });
                allResults = [...allResults, ...citoHits];
                console.log(`[/api/search] Cito hits toegevoegd: ${citoHits.length}`);
            } catch (err) {
                console.error('[/api/search] Fout in Cito service:', err);
            }
        }

        // 2. KLEIO ZOEKEN
        const useKleio = !filters.providers || filters.providers.length === 0 || filters.providers.includes('Kleio');

        if (useKleio && kleioService && kleioService.searchKleio) {
            try {
                const kleioHits = await kleioService.searchKleio({ query: qString, filters });
                allResults = [...allResults, ...kleioHits];
                console.log(`[/api/search] Kleio hits toegevoegd: ${kleioHits.length}`);
            } catch (err) {
                console.error('[/api/search] Fout in Kleio service:', err);
            }
        }

        // 3. RESPONSE - PLATTE LIJST (CRUCIAAL VOOR FRONTEND)
        console.log(`[/api/search] Totaal aantal hits teruggestuurd: ${allResults.length}`);
        
        // Stuur direct de array, GEEN object wrapper zoals { hits: ... }
        res.json(allResults);

    } catch (error) {
        console.error('[/api/search] CRITICAL ERROR:', error);
        res.status(500).json({ error: 'Interne serverfout tijdens zoeken.' });
    }
});

module.exports = router;

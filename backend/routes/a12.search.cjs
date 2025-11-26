const express = require('express');
const router = express.Router();

let citoService, kleioService;
try { citoService = require('../services/a28.cito.cjs'); } catch(e){}
try { kleioService = require('../services/a27.kleio.cjs'); } catch(e){}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

router.post('/search', async (req, res) => {
    try {
        let { query, filters } = req.body;
        if (!filters) filters = {};

        // Query normalisatie voor Kleio (Array behouden)
        const termsArray = Array.isArray(query) ? query : [query];
        
        // Fallback string voor logs/andere services
        const queryString = termsArray.join(' ');

        let allResults = [];
        const promises = [];

        // --- 1. CITO ZOEKACTIE ---
        if (filters?.cito !== false && citoService) {
            try {
                // FIX VOOR CITO: filters.ka moet een Array zijn voor .map()
                // Als het een string/nummer is (bijv "45"), maken we er ["45"] van.
                if (filters.ka && !Array.isArray(filters.ka)) {
                    filters.ka = [filters.ka];
                }

                // Als we op KA filteren, hoeven we niet op tekst te zoeken in Cito
                const citoQ = filters.ka ? "" : queryString;
                
                const citoRes = citoService.searchCito({ query: citoQ, filters });
                allResults.push(...citoRes);
            } catch(e) { 
                console.error('Cito error:', e.message); 
            }
        }

        // --- 2. KLEIO ZOEKACTIE ---
        if (filters?.kleio !== false && kleioService) {
            promises.push(
                kleioService.searchKleio({ query: termsArray, filters })
                    .then(res => allResults.push(...res))
            );
        }

        await Promise.all(promises);

        // --- 3. NABEWERKING ---
        if (filters.images === false) allResults = allResults.filter(i => i.type !== 'IMAGE');
        if (filters.text === false) allResults = allResults.filter(i => i.type !== 'TEXT');

        if (allResults.length > 40) {
            allResults = shuffleArray(allResults).slice(0, 40);
        }

        res.json({ sources: allResults, meta: { count: allResults.length } });

    } catch (error) {
        console.error('[A12] Fout:', error);
        res.status(500).json({ error: 'Error' });
    }
});

module.exports = router;

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

        const termsArray = Array.isArray(query) ? query : [query];
        const queryString = termsArray.join(' ');

        let rawResults = [];
        const promises = [];

        // 1. CITO
        if (filters?.cito !== false && citoService) {
            try {
                const citoQ = filters.ka ? "" : queryString;
                const citoRes = citoService.searchCito({ query: citoQ, filters });
                rawResults.push(...citoRes);
            } catch(e) { console.error('Cito err:', e.message); }
        }

        // 2. KLEIO
        if (filters?.kleio !== false && kleioService) {
            promises.push(
                kleioService.searchKleio({ query: termsArray, filters })
                    .then(res => rawResults.push(...res))
            );
        }

        await Promise.all(promises);

        // 3. ONTDUBBELEN & FILTEREN (DE FIX)
        const uniqueMap = new Map();
        
        rawResults.forEach(item => {
            // Maak een unieke sleutel op basis van URL of Titel
            const key = item.url || item.title;
            if (!uniqueMap.has(key)) {
                // Type filter
                if (filters.images === false && item.type === 'IMAGE') return;
                if (filters.text === false && item.type === 'TEXT') return;
                
                uniqueMap.set(key, item);
            }
        });

        let uniqueResults = Array.from(uniqueMap.values());

        // Grabbelton Limit
        if (uniqueResults.length > 40) {
            uniqueResults = shuffleArray(uniqueResults).slice(0, 40);
        }

        res.json({ sources: uniqueResults, meta: { count: uniqueResults.length } });

    } catch (error) {
        console.error('[A12] Fout:', error);
        res.status(500).json({ error: 'Error' });
    }
});

module.exports = router;

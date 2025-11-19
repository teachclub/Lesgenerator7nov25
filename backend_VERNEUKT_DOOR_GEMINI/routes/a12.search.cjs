const express = require('express');
const router = express.Router();

// **** DEZE IMPORTS MOETEN NU KOPPELEN ****
const { searchEuropeana } = require('../services/a11.europeana.cjs');
const { searchKleio } = require('../services/a27.kleio.cjs'); // Met accolades
const { searchCito } = require('../services/a28.cito.cjs');

router.post('/search', async (req, res) => {
  const { query, filters, mode, aiBoost, doelgroep } = req.body;
  console.log('[/api/search] Ontvangt payload:', JSON.stringify(req.body, null, 2));

  const providers = Array.isArray(filters.providers) ? filters.providers : ["Europeana", "Kleio", "Cito"];
  const searchEuropeanaFlag = providers.includes("Europeana");
  const searchKleioFlag = providers.includes("Kleio");
  const searchCitoFlag = providers.includes("Cito");

  const queryTerm = Array.isArray(query) && query.length > 0 ? query[0] : '';
  const typesFilter = filters.types ? filters.types : [];

  console.log('[/api/search] Start parallelle zoekopdracht...');

  try {
    // 1. Europeana Params
    const europeanaParams = {
      query: queryTerm || '*', 
      qf: typesFilter.map(t => `TYPE:"${t}"`),
    };

    // 2. Kleio Params
    const kleioParams = {
      query: queryTerm,
      filters: { types: typesFilter } // Stuur alleen type-filter
    };

    // 3. Cito Params
    const citoTv = (typeof filters.tv === 'string' && filters.tv) ? [filters.tv] : [];
    const citoParams = {
        tv: citoTv,
        ka: filters.ka || [],
        query: queryTerm,
    };

    const promises = [];

    if (searchEuropeanaFlag) {
      console.log('[/api/search] -> Europeana params:', europeanaParams);
      promises.push(searchEuropeana(europeanaParams));
    } else {
      promises.push(Promise.resolve({ totalResults: 0, items: [] }));
    }

    if (searchKleioFlag) {
      console.log('[/api/search] -> Kleio params:', kleioParams);
      promises.push(searchKleio(kleioParams));
    } else {
      promises.push(Promise.resolve({ totalResults: 0, items: [] }));
    }

    if (searchCitoFlag) {
      console.log('[/api/search] -> Cito params:', citoParams);
      promises.push(searchCito(citoParams));
    } else {
      promises.push(Promise.resolve({ totalResults: 0, items: [] }));
    }

    const [europeanaResult, kleioResult, citoResult] = await Promise.all(promises);

    console.log(`[/api/search] Europeana succes: ${europeanaResult?.totalResults || 0} hits.`);
    console.log(`[/api/search] Kleio succes: ${kleioResult?.totalResults || 0} hits.`);
    console.log(`[/api/search] Cito succes: ${citoResult?.totalResults || 0} hits.`);

    const allItems = [
      ...(europeanaResult?.items || []),
      ...(kleioResult?.items || []),
      ...(citoResult?.items || [])
    ];
    const totalResults = (europeanaResult?.totalResults || 0) + 
                         (kleioResult?.totalResults || 0) + 
                         (citoResult?.totalResults || 0);

    res.json({
      totalResults: totalResults,
      items: allItems.slice(0, 50),
    });

  } catch (error) {
    console.error('[/api/search] Fout tijdens parallelle zoekopdracht:', error);
    res.status(500).json({ message: 'Fout bij het zoeken', error: error.message });
  }
});

module.exports = router;

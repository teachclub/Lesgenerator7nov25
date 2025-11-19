const express = require('express');
const router = express.Router();

// **** DE FIX STAAT HIER (toevoegen .cjs) ****
const { searchEuropeana } = require('../services/a11.europeana.cjs');
const { searchKleio } = require('../services/a27.kleio.cjs');
const { searchCito } = require('../services/a28.cito.cjs');

router.post('/search', async (req, res) => {
  const { query, filters, mode, aiBoost, doelgroep } = req.body;

  console.log('[/api/search] Ontvangt payload:', JSON.stringify(req.body, null, 2));

  // Bepaal welke providers moeten worden aangeroepen
  const providers = Array.isArray(filters.providers) ? filters.providers : ["Europeana", "Kleio", "Cito"];
  const searchEuropeanaFlag = providers.includes("Europeana");
  const searchKleioFlag = providers.includes("Kleio");
  const searchCitoFlag = providers.includes("Cito");

  // Gebruik de eerste query term, of een lege string
  const queryTerm = Array.isArray(query) && query.length > 0 ? query[0] : '';

  console.log('[/api/search] Start parallelle zoekopdracht...');

  try {
    // Definieer de parameters voor elke service

    // 1. Europeana
    const europeanaParams = {
      query: queryTerm || '*', // Europeana heeft '*' nodig voor "alles"
      qf: filters.types ? filters.types.map(t => `TYPE:"${t}"`) : [],
    };

    // 2. Kleio
    const kleioParams = {
      query: queryTerm,
      filters: filters, // Kleio service filtert zelf
    };

    // 3. Cito
    // filters.tv is nu een string (bv. "TV9") of null.
    // searchCito verwacht een array (bv. ["TV9"]).
    const citoTv = filters.tv ? [filters.tv] : []; // Maak een array van de string
    const citoParams = {
        tv: citoTv,
        ka: filters.ka || [],
        query: queryTerm,
    };

    // Start de zoekopdrachten
    const promises = [];

    if (searchEuropeanaFlag) {
      console.log('[/api/search] -> Europeana params:', europeanaParams);
      promises.push(searchEuropeana(europeanaParams));
    } else {
      console.log('[/api/search] -> Europeana overgeslagen');
      promises.push(Promise.resolve({ totalResults: 0, items: [] }));
    }

    if (searchKleioFlag) {
      console.log('[/api/search] -> Kleio params:', kleioParams);
      promises.push(searchKleio(kleioParams));
    } else {
      console.log('[/api/search] -> Kleio overgeslagen');
      promises.push(Promise.resolve({ totalResults: 0, items: [] }));
    }

    if (searchCitoFlag) {
      console.log('[/api/search] -> Cito params:', citoParams);
      promises.push(searchCito(citoParams));
    } else {
      console.log('[/api/search] -> Cito overgeslagen');
      promises.push(Promise.resolve({ totalResults: 0, items: [] }));
    }

    // Wacht tot alle zoekopdrachten klaar zijn
    const [europeanaResult, kleioResult, citoResult] = await Promise.all(promises);

    console.log(`[/api/search] Europeana succes: ${europeanaResult.totalResults} hits.`);
    console.log(`[/api/search] Kleio succes: ${kleioResult.totalResults} hits.`);
    console.log(`[/api/search] Cito succes: ${citoResult.totalResults} hits.`);

    // Combineer de resultaten
    const allItems = [...europeanaResult.items, ...kleioResult.items, ...citoResult.items];
    const totalResults = europeanaResult.totalResults + kleioResult.totalResults + citoResult.totalResults;

    res.json({
      totalResults: totalResults,
      items: allItems.slice(0, 50), // Beperk de totale response
    });

  } catch (error) {
    console.error('[/api/search] Fout tijdens parallelle zoekopdracht:', error);
    res.status(500).json({ message: 'Fout bij het zoeken', error: error.message });
  }
});

module.exports = router;

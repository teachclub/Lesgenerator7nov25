const express = require('express');
const router = express.Router();
const { performEuropeanaSearch } = require('../services/a23.europeana.cjs');

/**
 * @route POST /api/search
 * @desc BACKWIJ.B03 - De "Treffers" controller (Hits-First).
 * Deze route ontvangt de zoekopdracht van de frontend (useSearchApi)
 * en roept de daadwerkelijke Europeana-zoekservice (a23) aan.
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const {
      terms = [],
      mode = 'AND',
      doelgroep = {},
      filters = {},
      tv = [],
      ka = [],
    } = req.body;

    // Valideer dat er ten minste één zoekterm is
    // (Hoewel de frontend dit al zou moeten afvangen)
    const hasTerms = terms.some((t) => t && t.trim() !== '');
    if (!hasTerms) {
      // Stuur een leeg resultaat terug ipv een 400-fout
      return res.json({ total: 0, sources: [] });
    }

    const searchPayload = {
      terms,
      mode,
      doelgroep,
      filters,
      tv,
      ka,
      rows: 100, // Standaard limiet voor "Hits" kolom
      page: 1,
    };

    // Roep de echte zoekservice (B03) aan
    const searchResult = await performEuropeanaSearch(searchPayload);

    // De service (a23) moet { total, sources } teruggeven
    res.json({
      total: searchResult.total,
      sources: searchResult.sources,
    });
  } catch (error) {
    console.error(
      '[LESGENERATOR] Fout in /api/search (a12.search.cjs):',
      error.message
    );
    res.status(500).json({
      message:
        error.message ||
        'Interne serverfout bij het uitvoeren van de zoekopdracht.',
      error: error.stack,
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { scrapeKleio } = require('../services/a26.scraper.cjs');

router.post('/scrape', async (req, res) => {
  try {
    const url = req.body && req.body.url;
    console.log('[/api/scrape] Request body:', req.body);

    if (!url || typeof url !== 'string') {
      return res
        .status(400)
        .json({ error: 'Geen geldige url meegegeven aan /api/scrape' });
    }

    const fullText = await scrapeKleio(url);

    res.json({ fullText });
  } catch (err) {
    console.error('[/api/scrape] FOUT:', err);
    res.status(500).json({
      error: 'Scrapen van de URL is mislukt.',
      details: err.message || String(err),
    });
  }
});

module.exports = router;

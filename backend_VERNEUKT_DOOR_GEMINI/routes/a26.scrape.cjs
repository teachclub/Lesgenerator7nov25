const express = require('express');
const router = express.Router();
const { scrapeUrl } = require('../services/a26.scraper.cjs');

/**
 * Endpoint om een URL te scrapen.
 * Verwacht: { "url": "http://..." }
 * Retourneert: { "fullText": "..." }
 */
router.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is verplicht' });
  }

  try {
    const fullText = await scrapeUrl(url);
    res.json({ fullText });
  } catch (error) {
    console.error(`[/api/scrape] Fout bij verwerken ${url}:`, error.message);
    res.status(500).json({ message: error.message || 'Interne serverfout bij scrapen' });
  }
});

module.exports = router;

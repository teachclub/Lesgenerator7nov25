const express = require('express');
const router = express.Router();
const { fetchKleio } = require('../services/a26.fetcher.cjs');

router.post('/scrape', async (req, res, next) => {
  try {
    const url = req.body && req.body.url;
    if (!url) return res.status(400).json({ error: 'Geen url' });

    // Fetcher geeft nu { fullText, imageUrl } terug
    const data = await fetchKleio(url);

    res.json(data); 
  } catch (err) {
    console.error('[/api/scrape] FOUT:', err);
    next(err);
  }
});

module.exports = router;

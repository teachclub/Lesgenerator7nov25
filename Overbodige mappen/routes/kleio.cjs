// routes/kleio.cjs
const express = require('express');
const router = express.Router();
// DE FIX: Voeg expliciet .cjs toe aan de bestandsnaam
const { searchKleio } = require('../services/kleioFetcher.cjs');

/**
 * GET /api/kleio/search?q=...&limit=...
 * Dit is de nieuwe 'Suggest' route die de frontend aanroept.
 */
router.get('/search', async (req, res) => {
  const { q, limit } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Zoekterm (q) is verplicht.' });
  }

  try {
    const limitNum = parseInt(limit, 10) || 5;
    const results = await searchKleio(q, limitNum);
    
    // De frontend verwacht nu EEN OBJECT met een 'suggestions' key
    // (net als de oude /api/suggest), maar nu met ECHTE bronnen.
    res.json({ suggestions: results });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// We voegen de byUrl route toe voor later (Stap 7)
// GET /api/kleio/byUrl?url=...

module.exports = router;

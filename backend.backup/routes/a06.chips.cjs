const express = require('express');
const router = express.Router();
const chipsService = require('../services/a06.chips.cjs');

// Deze route handelt POST /api/chips af
router.post('/chips', async (req, res) => {
  try {
    const { query, filters, doelgroep } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is verplicht' });
    }

    // Roep de 'slimme werknemer' (a06.service) aan
    const result = await chipsService.generateVerifiedChips(query, filters, doelgroep);

    res.json(result);

  } catch (error) {
    console.error(`[routes/a06.chips] Fout:`, error.message);
    res.status(500).json({ error: 'Interne serverfout bij ophalen chips' });
  }
});

module.exports = router;

const express = require('express');
const { generateProposalsService } = require('../services/a25.proposals.cjs');

module.exports = function() {
  const r = express.Router();

  r.post('/pre-selection', async (req, res) => {
    const { term, filters } = req.body;

    if (!term || typeof term !== 'string') {
      return res.status(400).json({ ok: false, error: 'Zoekterm (term) is verplicht.' });
    }

    try {
      const result = await generateProposalsService(term, filters);
      res.status(result.ok ? 200 : 500).json(result);
    } catch (err) {
      console.error("[B01 Route] Fout bij /pre-selection:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return r;
};

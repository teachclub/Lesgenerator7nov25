// routes/a23.searchRaw.cjs
const express = require('express');
const { searchRaw } = require('../services/a11.europeana.cjs');

module.exports = (app) => {
  const router = express.Router();

  router.post('/api/europeana/search-raw', express.json(), async (req, res) => {
    try {
      const { query = '*', qf = [], rows = 24, profile = 'rich', media = true } = req.body || {};
      const out = await searchRaw({ query, qf, rows, profile, media });
      return res.status(200).json(out);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  return router;
};


const express = require('express');
const router = express.Router();
const {
  searchEuropeana,
  chipsToEuropeanaParams,
} = require('../services/a11.europeana.cjs');

// POST /api/search
// Body opties:
// { query: "rembrandt", qf: ["who:\"Rembrandt\"", "TYPE:IMAGE"], rows, start }
// { chips: [ { label, kind, who, what, where, yearRange:{from,to}, type, reusability } ], rows, start }
router.post('/api/search', async (req, res) => {
  try {
    const body = req.body || {};
    const rows = Number(body.rows ?? 24);
    const start = Number(body.start ?? 1);

    // Variant A: chips → Europeana params
    if (Array.isArray(body.chips) && body.chips.length > 0) {
      const params = chipsToEuropeanaParams(body.chips, { rows, start });
      const out = await searchEuropeana(params);
      return res.status(out.ok ? 200 : 400).json(out);
    }

    // Variant B: vrije query + optionele qf[]
    const query = String(body.query ?? '*');
    const qf = Array.isArray(body.qf) ? body.qf.map(String) : [];
    const params = {
      query,
      qf,
      rows,
      start,
      media: 'true',
      profile: 'rich',
      reusability: String(body.reusability || 'open'),
    };
    const out = await searchEuropeana(params);
    return res.status(out.ok ? 200 : 400).json(out);
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'search_failed' });
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const { getChips } = require('../services/a06.chips.cjs');

router.post('/api/chips', async (req, res) => {
  try {
    const chips = await getChips(req.body || {});
    res.json({ ok: true, count: chips.length, chips });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'chips_failed' });
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const { generateProposals } = require('../services/a19.generate.cjs');

router.post('/propose-lessons', async (req, res) => {
  try {
    console.log("[API] Verzoek voor lesvoorstellen:", req.body.topic);
    const result = await generateProposals(req.body);
    res.json(result);
  } catch (err) {
    console.error("[API] Fout:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

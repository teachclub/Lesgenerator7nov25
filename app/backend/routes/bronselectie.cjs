const express = require('express');
const router = express.Router();

// Tijdelijke opslag in geheugen (optioneel later vervangen door file/db)
const selectieStore = {};

router.post('/', (req, res) => {
  const { deelvraagId, bronIds } = req.body;

  if (!deelvraagId || !Array.isArray(bronIds)) {
    return res.status(400).json({ error: 'Ongeldige payload' });
  }

  selectieStore[deelvraagId] = new Set(bronIds);
  console.log(`📌 Selectie voor deelvraag ${deelvraagId}:`, bronIds);

  res.json({ ok: true, opgeslagen: bronIds.length });
});

module.exports = router;


const express = require('express');
const router = express.Router();

// Dummy voorstelgenerator
router.post('/', (req, res) => {
  const { deelvragen, selectie } = req.body;

  if (!Array.isArray(deelvragen) || typeof selectie !== 'object') {
    return res.status(400).json({ error: 'Ongeldige payload' });
  }

  const voorstel = deelvragen.map((dv) => {
    const bronCount = selectie[dv.id]?.length || 0;
    return {
      deelvraag: dv.vraag,
      subdimensie: dv.subdimensie,
      bronnen: bronCount,
      aanbeveling: bronCount >= 2 ? '✅ Goed onderbouwd' : '⚠️ Meer bronnen nodig'
    };
  });

  res.json({ ok: true, voorstel });
});

module.exports = router;


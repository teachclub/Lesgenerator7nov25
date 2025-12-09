const express = require('express');
const router = express.Router();
const { generateVerifiedChips } = require('../services/a06.chips.cjs');

/**
 * @route POST /api/chips
 * @desc De "voordeur" (controller) voor de geverifieerde chips.
 * Roept de robuuste service a06.chips.cjs aan.
 * @access Public
 */
router.post('/', async (req, res) => {
  const startTime = process.hrtime();
  try {
    // Roep de robuuste service (BACKWIJ.B06) aan
    const chips = await generateVerifiedChips(req.body || {});

    const endTime = process.hrtime(startTime);
    const tookMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(1);

    console.log(
      `[a08.chips] /api/chips succesvol. ${chips.length} chips gevonden in ${tookMs}ms.`
    );
    
    // Stuur het gestandaardiseerde antwoord terug
    res.json({ ok: true, chips, tookMs });

  } catch (e) {
    console.error('[LESGENERATOR] Fout in /api/chips (a08.chips.cjs):', e);
    res.status(500).json({ ok: false, error: e.message, chips: [] });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const proposalService = require('../services/a25.proposals.cjs');
// const { useQueryStore } = require('../frontend/src/state/query.store'); // <-- DE FOUT (NU VERWIJDERD)

// Deze route handelt POST /api/proposals af
router.post('/proposals', async (req, res) => {
  try {
    const { terms, mode, filters, doelgroep } = req.body;

    // DE FIX: Bouw de query-string hier handmatig,
    // in plaats van de frontend store te importeren.
    const operator = mode === 'OR' ? ' OR ' : ' AND ';
    const query = terms.filter(t => t.trim() !== '').join(operator);

    if (!query) {
      return res.status(400).json({ error: 'Query is verplicht' });
    }

    console.log(`[a25.route] Start genereren voorstellen voor: "${query}"`);

    // Roep de 'Hybride Baas' (a25.service) aan
    const result = await proposalService.generateProposals(query, filters, doelgroep);

    res.json(result);

  } catch (error) {
    console.error(`[a25.route] Fout:`, error.message);
    res.status(500).json({ error: 'Interne serverfout bij ophalen voorstellen' });
  }
});

module.exports = router;

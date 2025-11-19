const express = require('express');
const { getSourcesForProposalService } = require('../services/a26.sources.cjs');

module.exports = function() {
  const r = express.Router();

  r.post('/get-sources-for-proposal', async (req, res) => {
    const { term, filters, chosenProposal } = req.body;

    if (!chosenProposal) {
      return res.status(400).json({ ok: false, error: 'Een gekozen lesvoorstel (chosenProposal) is verplicht.' });
    }
    if (!term) {
      return res.status(400).json({ ok: false, error: 'Een zoekterm (term) is verplicht.' });
    }

    try {
      const result = await getSourcesForProposalService(term, filters, chosenProposal);
      res.status(result.ok ? 200 : 500).json(result);
    } catch (err) {
      console.error("[B02 Route] Fout bij /get-sources-for-proposal:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return r;
};

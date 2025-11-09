const express = require('express');
const {
  generateProposals,
  generateLesson,
} = require('../services/a19.generate.cjs');

module.exports = function() {
  const r = express.Router();

  r.post('/generate/proposals', async (req, res) => {
    const { sources } = req.body; 

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({ ok: false, error: 'Minstens één geselecteerde bron vereist.' });
    }

    try {
      const result = await generateProposals(sources);
      res.status(result.ok ? 200 : 500).json(result);
    } catch (err) {
      console.error("[A19 Route] Fout bij /generate/proposals:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  r.post('/generate/lesson', async (req, res) => {
    const { chosenProposal, sources } = req.body; 

    if (!chosenProposal || typeof chosenProposal !== 'object') {
      return res.status(400).json({ ok: false, error: 'Een gekozen voorstel (chosenProposal) is vereist.' });
    }
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({ ok: false, error: 'Minstens één geselecteerde bron vereist.' });
    }

    try {
      const result = await generateLesson(chosenProposal, sources);
      res.status(result.ok ? 200 : 500).json(result);
    } catch (err) {
      console.error("[A19 Route] Fout bij /generate/lesson:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return r;
};

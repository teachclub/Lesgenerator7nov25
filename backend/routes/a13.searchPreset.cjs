const express = require('express');

module.exports = function() {
  const r = express.Router();

  r.post('/search-preset', async (req, res) => {
    const { term, tv, ka, ratio, max, filters } = req.body;

    console.log("[A13] Preset zoekopdracht ontvangen:", req.body);

    const dummySources = [
      { id: 'dummy:1', title: `Dummy Resultaat voor: ${term || ka}`, type: 'TEXT', link: '#' },
      { id: 'dummy:2', title: 'Tijdelijk resultaat 2', type: 'IMAGE', link: '#' }
    ];

    res.json({
      ok: true,
      data: {
        sources: dummySources,
        debug: { message: "A13 service nog niet geïmplementeerd. Dit zijn dummy data." }
      }
    });
    
  });

  return r;
};

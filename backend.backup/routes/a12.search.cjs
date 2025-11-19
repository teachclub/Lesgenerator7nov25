const express = require('express');
const router = express.Router();
const searchService = require('../services/a12.search.cjs');
const fetch = require('node-fetch');
const https = require('https'); 

// DE SSL-FIX
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// === "HITS" ROUTE ===
router.post('/search', async (req, res) => {
  try {
    const { query, mode, filters, doelgroep } = req.body;
    let queryString = query.filter(t => t.trim() !== '').join(mode === 'OR' ? ' OR ' : ' AND ');

    if (!queryString) {
        return res.status(400).json({ error: "Geen zoekterm" });
    }
    const results = await searchService.searchEuropeana(queryString, filters, 100);
    res.json(results);
  } catch (error) {
    console.error("[API Error /search]:", error);
    res.status(500).json({ error: error.message });
  }
});

// === IMAGE PROXY ROUTE (MET SSL-FIX) ===
router.get('/proxy', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send('URL query parameter is verplicht');
    const validUrl = new URL(url.toString());
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return res.status(400).send('Ongeldig protocol');
    }

    const imageResponse = await fetch(validUrl.toString(), {
      agent: (validUrl.protocol === 'https:') ? httpsAgent : null,
    });

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).send(imageResponse.statusText);
    }
    res.setHeader('Content-Type', imageResponse.headers.get('content-type'));
    imageResponse.body.pipe(res);
  } catch (error) {
    console.error("[API Error /proxy]:", error.message);
    res.status(500).send('Proxy Fout');
  }
});

module.exports = router;

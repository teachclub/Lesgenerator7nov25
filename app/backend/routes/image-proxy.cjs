const express = require('express');
const router = express.Router();

router.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Geen URL');

    // We doen net alsof we een Chrome browser zijn
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) throw new Error(`Fout bij ophalen: ${response.status}`);

    res.setHeader('Content-Type', response.headers.get('content-type'));
    // Cache instellen voor snelheid
    res.setHeader('Cache-Control', 'public, max-age=86400'); 
    
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);

  } catch (error) {
    // Stuur een 404 als het mislukt, dan kan de frontend de fallback tonen
    res.status(404).send('Image not found');
  }
});

module.exports = router;

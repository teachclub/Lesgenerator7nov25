const express = require('express');
const router = express.Router();

router.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Geen URL');

    // We doen ons voor als een echte browser om 403/404 te voorkomen
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
    });

    if (!response.ok) throw new Error(`Fout: ${response.status}`);

    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); 

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);

  } catch (error) {
    // Stuur een 404 zodat de frontend weet dat het plaatje stuk is
    res.status(404).send('Niet gevonden');
  }
});

module.exports = router;

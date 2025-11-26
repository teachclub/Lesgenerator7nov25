const express = require('express');
const router = express.Router();

router.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Geen URL');

    const response = await fetch(url);
    if (!response.ok) throw new Error('Fout bij ophalen');

    res.setHeader('Content-Type', response.headers.get('content-type'));
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    res.status(500).send('Proxy fout');
  }
});

module.exports = router;

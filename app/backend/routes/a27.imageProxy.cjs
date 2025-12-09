const express = require('express');
const router = express.Router();

router.get('/image-proxy', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).send('Missing URL');

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type');
        
        if (contentType) res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(Buffer.from(buffer));
    } catch (err) {
        console.error('[Proxy Error]', url, err.message);
        res.status(500).send('Failed');
    }
});

module.exports = router;

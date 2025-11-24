const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// CONFIGURATIE
const HOST = '127.0.0.1';
const PORT = process.env.PORT || 8081;

// MIDDLEWARE
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// LOGGING
app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.path}`);
  next();
});

// --- ROUTES ---

// 1. Zoeken & Filteren
try { app.use('/api', require('./routes/a12.search.cjs')); } catch (e) { console.error('Search route err:', e.message); }

// 2. AI Concepten (Proposals)
try { app.use('/api', require('./routes/a25.proposals.cjs')); } catch (e) { console.error('Proposals route err:', e.message); }

// 3. AI Lesgenerator (DEZE MISTE!)
try { app.use('/api', require('./routes/a30.lesson.cjs')); } catch (e) { console.error('Lesson route err:', e.message); }

// 4. Afbeeldingen Proxy
try { app.use('/api', require('./routes/a27.imageProxy.cjs')); } catch (e) { console.error('Proxy route err:', e.message); }

// 5. Data (Tijdvakken & KA's)
app.get('/api/tijdvakken', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'tijdvakken.cjs');
        delete require.cache[require.resolve(filePath)];
        const data = require(filePath);
        const list = Array.isArray(data) ? data : (data.tijdvakken || []);
        res.json(list);
    } catch (e) { res.status(500).json({ error: "Fout bij laden tijdvakken" }); }
});

app.get('/api/ka', (req, res) => {
    try {
        const tvId = req.query.tv;
        const filePath = path.join(__dirname, 'data', 'tijdvakken.cjs');
        delete require.cache[require.resolve(filePath)];
        const data = require(filePath);
        const list = Array.isArray(data) ? data : (data.tijdvakken || []);
        const tv = list.find(t => String(t.id) == String(tvId) || String(t.nummer) == String(tvId));
        res.json(tv ? (tv.kenmerkendeAspecten || tv.kas || []) : []);
    } catch (e) { res.json([]); }
});

// Health Check
app.get('/', (req, res) => res.send('Kleio Backend Live on 8081'));

// START
app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend luistert op http://${HOST}:${PORT}`);
});

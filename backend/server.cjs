const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// CONFIGURATIE
const HOST = '127.0.0.1';
const PORT = process.env.PORT || 8081; // We blijven op 8081

// MIDDLEWARE
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// LOGGING
app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.path}`);
  next();
});

// --- ROUTES ---

// 1. Zoeken (De echte logica uit a12)
try { 
    app.use('/api', require('./routes/a12.search.cjs')); 
app.use('/api', require('./routes/a25.proposals.cjs'));
app.use('/api', require('./routes/a27.imageProxy.cjs'));
} catch (e) { 
    console.error('Search route error:', e.message); 
}

// 2. Tijdvakken & KA's (De data)
app.get('/api/tijdvakken', (req, res) => {
    try {
        // Verwijder cache voor development (zodat je wijzigingen in data direct ziet)
        const filePath = path.join(__dirname, 'data', 'tijdvakken.cjs');
        delete require.cache[require.resolve(filePath)];
        const data = require(filePath);

        // Stuur de lijst terug (of het nu een array is of {tijdvakken: []})
        const list = Array.isArray(data) ? data : (data.tijdvakken || []);
        res.json(list);
    } catch (e) { 
        console.error("Fout bij tijdvakken:", e);
        res.status(500).json({ error: "Fout bij laden tijdvakken" }); 
    }
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

// 3. Overige (Chips, Proposals)
try { app.use('/api', require('./routes/a99.chips.cjs')); } catch (e) {}
try { app.use('/api', require('./routes/a25.proposals.cjs')); } catch (e) {}

// Health Check
app.get('/', (req, res) => res.send('Kleio Backend Live on 8081'));

// START
app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend luistert op http://${HOST}:${PORT}`);
});

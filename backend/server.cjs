const express = require('express');
const cors = require('cors');
const path = require('path'); // Nodig voor het vinden van de data bestanden
require('dotenv').config();

const app = express();
const port = 8081;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- 1. IMPORTEER DE LOGICA (ROUTES) ---
const searchRoutes = require('./routes/a12.search.cjs');
const presetRoutes = require('./routes/a14.presets.cjs');
const imageProxyRoutes = require('./routes/image-proxy.cjs');
const proposalRoutesV2 = require('./routes/a35.proposals-v2.cjs'); // V2 Concepten
const refineRoutes = require('./routes/a36.refine.cjs');          // Feedback
const lessonRoutesV2 = require('./routes/a40.lesson-v2.cjs');     // V2 Les

// --- 2. KOPPEL DE LOGICA AAN DE URL'S ---
app.use('/api', searchRoutes);
app.use('/api', presetRoutes);
app.use('/api', imageProxyRoutes);
app.use('/api', proposalRoutesV2);
app.use('/api', refineRoutes);
app.use('/api', lessonRoutesV2);

// --- 3. DE ONTBREKENDE ROUTES: TIJDVAKKEN & KA ---
// Dit zorgt ervoor dat de dropdowns gevuld worden vanuit data/tijdvakken.cjs

app.get('/api/tijdvakken', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'tijdvakken.cjs');
        delete require.cache[require.resolve(filePath)]; // Cache wissen voor live updates
        const data = require(filePath);
        const list = Array.isArray(data) ? data : (data.tijdvakken || []);
        res.json(list);
    } catch (e) { 
        console.error("Fout bij tijdvakken:", e.message);
        res.status(500).json({ error: "Kon tijdvakken niet laden." }); 
    }
});

app.get('/api/ka', (req, res) => {
    try {
        const tvId = req.query.tv; // De frontend stuurt ?tv=1
        const filePath = path.join(__dirname, 'data', 'tijdvakken.cjs');
        delete require.cache[require.resolve(filePath)];
        const data = require(filePath);
        const list = Array.isArray(data) ? data : (data.tijdvakken || []);
        
        // Zoek het juiste tijdvak op ID
        const tv = list.find(t => String(t.id) == String(tvId));
        res.json(tv ? (tv.kenmerkendeAspecten || []) : []);
    } catch (e) { 
        res.json([]); 
    }
});

// --- 4. STARTEN ---
app.get('/', (req, res) => res.send('🚀 Backend V2 is online!'));

app.listen(port, () => {
  console.log(`🚀 Backend luistert op http://127.0.0.1:${port}`);
  console.log(`   - Tijdvakken route: /api/tijdvakken (HERSTELD)`);
});

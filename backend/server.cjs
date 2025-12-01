const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 8081;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- ROUTES LADEN ---
const searchRoutes       = require('./routes/a12.search.cjs');
const presetRoutes       = require('./routes/a14.presets.cjs');
const imageProxyRoutes   = require('./routes/image-proxy.cjs');

// 🔹 NIEUW: dummy-lesvoorstellen (40 contextbronnen, 15 per voorstel)
const proposalsRoutes    = require('./routes/a25.proposals.cjs');

// Bestaande v2-proposals / Kleio-multiquery-logica
const proposalRoutesV2   = require('./routes/a35.proposals-v2.cjs');

const refineRoutes       = require('./routes/a36.refine.cjs');
const lessonRoutesV2     = require('./routes/a40.lesson-v2.cjs');
const lessonFullRoutes   = require('./routes/a40.lesson-full.cjs');

// --- ROUTES KOPPELEN OP /api ---
app.use('/api', searchRoutes);
app.use('/api', presetRoutes);
app.use('/api', imageProxyRoutes);

// 🔹 A25: POST /api/propose-lessons (dummy, zonder Gemini)
app.use('/api', proposalsRoutes);

// Bestaande A35 v2-routes (zoals eerder)
app.use('/api', proposalRoutesV2);

app.use('/api', refineRoutes);
app.use('/api/generate-lesson-v2', lessonRoutesV2);
app.use('/api', lessonFullRoutes);

// --- TIJDVAKKEN & KA ---
app.get('/api/tijdvakken', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'tijdvakken.cjs');
    delete require.cache[require.resolve(filePath)];
    const data = require(filePath);
    const list = Array.isArray(data) ? data : (data.tijdvakken || []);
    res.json(list);
  } catch (e) {
    console.error('Fout bij tijdvakken:', e.message);
    res.status(500).json({ error: 'Kon tijdvakken niet laden.' });
  }
});

app.get('/api/ka', (req, res) => {
  try {
    const tvId = req.query.tv;
    const filePath = path.join(__dirname, 'data', 'tijdvakken.cjs');
    delete require.cache[require.resolve(filePath)];
    const data = require(filePath);
    const list = Array.isArray(data) ? data : (data.tijdvakken || []);
    const tv = list.find(t => String(t.id) === String(tvId));
    res.json(tv ? (tv.kenmerkendeAspecten || []) : []);
  } catch (e) {
    res.json([]);
  }
});

// --- ROOT ---
app.get('/', (req, res) => res.send('🚀 Backend V2 is online!'));

app.listen(port, () => {
  console.log(`🚀 Backend luistert op http://127.0.0.1:${port}`);
  console.log('   - Tijdvakken route: /api/tijdvakken (HERSTELD)');
});


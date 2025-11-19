// server.cjs

const express = require('express');
const cors = require('cors');
const path = require('path');

// Config laadt de .env (en API keys)
// require('./config/a00.env.cjs'); // VERWIJDERD

// Services die data moeten voorladen
const geminiService = require('./services/a05.gemini.cjs');
const citoService = require('./services/a28.cito.cjs'); // Zorgt dat Cito CSV laadt

// --- ROUTES ---
const healthRoutes = require('./routes/a01.health.cjs');
const pingEuropeanaRoutes = require('./routes/a11.pingEuropeana.cjs');
const searchRoutes = require('./routes/a12.search.cjs');
const searchPresetRoutes = require('./routes/a13.searchPreset.cjs');
const chipsRoutes = require('./routes/a06.chips.cjs');
const generateRoutes = require('./routes/a19.generate.cjs');
const chatSearchRoutes = require('./routes/a21.chatSearch.cjs');
const thesaurusRoutes = require('./routes/a22.thesaurus.cjs');
const europeanaSearchRawRoutes = require('./routes/a23.searchRaw.cjs');
const europeanaFacetsRoutes = require('./routes/a23.facets.cjs');
const europeanaItemRoutes = require('./routes/a24.item.cjs');
const proposalsRoutes = require('./routes/a25.proposals.cjs');
const scrapeRoutes = require('./routes/a26.scrape.cjs');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- ROUTES MOUNTEN (Met de console logs) ---
console.log('[server] Routes mounten...');

// Healthcheck
app.use('/', healthRoutes);
console.log('[mount] OK / <- ./routes/a01.health.cjs');

// Europeana specifiek
app.use('/api/europeana', pingEuropeanaRoutes);
console.log('[mount] OK /api/europeana <- ./routes/a11.pingEuropeana.cjs');
app.use('/api/europeana', europeanaSearchRawRoutes);
console.log('[mount] OK /api/europeana <- ./routes/a23.searchRaw.cjs');
app.use('/api/europeana', europeanaFacetsRoutes);
console.log('[mount] OK /api/europeana <- ./routes/a23.facets.cjs');
app.use('/api/europeana', europeanaItemRoutes);
console.log('[mount] OK /api/europeana <- ./routes/a24.item.cjs');

// API (Algemeen)
app.use('/api', chipsRoutes);
console.log('[mount] OK /api <- ./routes/a06.chips.cjs');
app.use('/api', generateRoutes);
console.log('[mount] OK /api <- ./routes/a19.generate.cjs');
app.use('/api', proposalsRoutes);
console.log('[mount] OK /api <- ./routes/a25.proposals.cjs');
app.use('/api', searchRoutes);
console.log('[mount] OK /api <- ./routes/a12.search.cjs');
app.use('/api', searchPresetRoutes);
console.log('[mount] OK /api <- ./routes/a13.searchPreset.cjs');
app.use('/api', chatSearchRoutes);
console.log('[mount] OK /api <- ./routes/a21.chatSearch.cjs');
app.use('/api', thesaurusRoutes);
console.log('[mount] OK /api <- ./routes/a22.thesaurus.cjs');

// **** DE NIEUWE ROUTE ****
app.use('/api', scrapeRoutes);
console.log('[mount] OK /api <- ./routes/a26.scrape.cjs');

// --- SERVER START ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[server] masterprompt-backend draait op http://localhost:${PORT}`);
  console.log(`[server] Healthcheck: curl http://localhost:${PORT}/`);
});

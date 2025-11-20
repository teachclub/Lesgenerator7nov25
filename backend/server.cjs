require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

// Verhoog de limiet voor grote JSON payloads (belangrijk voor bronnen)
app.use(express.json({ limit: '10mb' })); 
app.use(cors());

// --- ROUTES MOUNTEN ---
// Alleen bestanden in de map 'routes' horen hier thuis.

// 1. Zoeken & Fetchen
app.use('/api', require('./routes/a12.search.cjs'));
app.use('/api', require('./routes/a26.fetch.cjs'));

// 2. Hulpmiddelen
// (Check of deze bestaat, anders commentarieer uit)
try {
    app.use('/api', require('./routes/a27.imageProxy.cjs'));
} catch (e) {
    console.warn('Image Proxy route niet gevonden (optioneel).');
}

// 3. AI Generatie (Fase 1 & 2)
app.use('/api', require('./routes/a29.proposals.cjs'));
app.use('/api', require('./routes/a30.lesson.cjs'));

// --- SERVICE PRELOAD (Optioneel) ---
// We laden Cito alvast in zodat de CSV in het geheugen zit
try {
    require('./services/a28.cito.cjs');
} catch (e) {
    console.error('Kon Cito service niet pre-loaden:', e.message);
}

app.listen(port, () => {
  console.log(`[server] Draait op http://localhost:${port}`);
});

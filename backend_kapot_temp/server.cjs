require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ROUTES
app.use('/api', require('./routes/a12.search.cjs'));
app.use('/api', require('./routes/a26.fetch.cjs'));
app.use('/api', require('./routes/a27.imageProxy.cjs')); // Plaatjes fix
app.use('/api', require('./routes/a29.proposals.cjs'));  // AI Studio

// Cito Service Preload
try {
    require('./services/a28.cito.cjs');
} catch (e) {
    console.error('Kon Cito service niet laden:', e);
}

app.listen(port, () => {
  console.log(`[server] Draait op http://localhost:${port}`);
});

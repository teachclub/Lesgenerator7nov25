const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const bronselectieRouter = require('./routes/bronselectie.cjs');
const proposalsRouter = require('./routes/proposals-v2.cjs');

const app = express();
const port = 8081;

app.use(cors());
app.use(bodyParser.json());

// Mount routes
app.use('/api/bronselectie', bronselectieRouter);
app.use('/api/lesson-v2', proposalsRouter);

// Test-endpoint
app.get('/', (req, res) => {
  res.send('✅ Backend draait!');
});

app.listen(port, () => {
  console.log(`🚀 Server actief op http://localhost:${port}`);
});


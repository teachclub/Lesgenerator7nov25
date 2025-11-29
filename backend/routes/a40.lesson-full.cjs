const express = require('express');
const router = express.Router();

// Helper om intern je eigen API aan te roepen
async function callJsonEndpoint(path, body) {
  const url = `http://127.0.0.1:8081${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Call to ${path} failed: ${res.status} ${res.statusText} – ${text.slice(0, 400)}`);
  }

  if (!text) {
    throw new Error(`Call to ${path} returned empty body`);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Call to ${path} returned invalid JSON: ${err.message}. Raw: ${text.slice(0, 400)}`);
  }
}

router.post('/generate-lesson-v2/full', async (req, res) => {
  const { concept, sources } = req.body || {};

  if (!concept || !sources || !Array.isArray(sources) || sources.length === 0) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'concept en sources (minimaal 1) zijn verplicht voor generate-lesson-v2/full.'
    });
  }

  try {
    const base = '/api/generate-lesson-v2';

    const step1 = await callJsonEndpoint(`${base}/step1`, { concept, sources });
    const step2 = await callJsonEndpoint(`${base}/step2`, { concept });

    const quadrantContext = step2.kwadrantAsLabels || null;

    const step3 = await callJsonEndpoint(`${base}/step3`, {
      concept,
      sources,
      quadrantContext
    });

    const step4 = await callJsonEndpoint(`${base}/step4`, { concept, sources });

    return res.json({
      step1,
      step2,
      step3,
      step4
    });
  } catch (err) {
    console.error('[A40] full lesson error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message || 'Onbekende fout in generate-lesson-v2/full'
    });
  }
});

module.exports = router;


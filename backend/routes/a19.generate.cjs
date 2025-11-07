const express = require('express');
const router = express.Router();

// Placeholder generate-endpoint: valideert input en geeft samenvatting terug
router.post('/api/generate', async (req, res) => {
  try {
    const { selected = [], context = {} } = req.body || {};
    if (!Array.isArray(selected) || selected.length === 0) {
      return res.status(400).json({ ok: false, error: 'no_selection' });
    }

    const safeCtx = {
      query: String(context?.query ?? ''),
      tv: String(context?.tv ?? ''),
      ka: String(context?.ka ?? ''),
    };

    const items = selected.map((it) => ({
      type: String(it?.type || ''),
      title: it?.title ? String(it.title) : undefined,
      provider: it?.provider ? String(it.provider) : undefined,
      url: it?.url ? String(it.url) : undefined,
      thumb: it?.thumb ? String(it.thumb) : undefined,
    }));

    // Simpele “lesplan”-skelet als bewijs van leven
    const lesson = {
      meta: {
        createdAt: new Date().toISOString(),
        selectionCount: items.length,
        tv: safeCtx.tv,
        ka: safeCtx.ka,
        query: safeCtx.query,
      },
      structuur: {
        hoofdvraag: safeCtx.query ? `Wat leren deze bronnen over: ${safeCtx.query}?` : "Wat leren deze bronnen over het onderwerp?",
        doelen: [
          "Leerling kan bronnen selecteren en duiden (tekst/beeld).",
          "Leerling koppelt broncontext aan tijdvak en kenmerkend aspect.",
        ],
        werkvorm: "Jigsaw / duo-analyse / klassikale terugkoppeling",
      },
      bronnen: items,
      notities: "Dit is een placeholder-generatie. De AI-variant kan later worden aangesloten.",
    };

    return res.json({ ok: true, lesson });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'generate_failed' });
  }
});

module.exports = router;


const express = require("express");
const { buildIndex, searchHistoriana, getIndexStats, ensureIndexFresh } =
  require("../services/historianaFetcher.cjs");

const router = express.Router();

router.get("/ping", async (_req, res) => {
  try {
    await ensureIndexFresh();
    res.json({ ok: true, service: "historiana", stats: getIndexStats(), ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Number(req.query.page || 1);
    const result = await searchHistoriana(q, page);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e), total: 0, items: [] });
  }
});

router.post("/reindex", async (_req, res) => {
  try {
    const stats = await buildIndex();
    res.json({ ok: true, stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

module.exports = router;


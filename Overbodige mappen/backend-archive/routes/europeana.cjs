const express = require("express");
const { searchEuropeana } = require("../services/europeanaFetcher.cjs");

const router = express.Router();

router.get("/ping", (_req, res) => {
  res.json({
    ok: true,
    service: "europeana",
    key: Boolean(process.env.EUROPEANA_API_KEY),
    ts: new Date().toISOString(),
  });
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Number(req.query.page || 1);
    const rows = Number(req.query.rows || 25);
    const out = await searchEuropeana(q, page, rows);
    res.json(out);
  } catch (e) {
    res.status(500).json({ total: 0, items: [], error: String(e?.message || e) });
  }
});

module.exports = router;


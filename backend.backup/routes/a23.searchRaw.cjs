const express = require("express");
const router = express.Router();
const { performEuropeanaSearch } = require("../services/a23.europeana.cjs");

// POST /api/europeana/searchRaw
router.post("/europeana/searchRaw", async (req, res) => {
  try {
    const payload = req.body || {};
    const data = await performEuropeanaSearch(payload);
    res.json(data);
  } catch (e) {
    console.error("[searchRaw POST] error:", e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

// (optioneel) GET shim: /api/europeana/searchRaw?terms=luther&rows=3&page=1
router.get("/europeana/searchRaw", async (req, res) => {
  try {
    const terms = req.query.terms
      ? String(req.query.terms).split(",").map(s => s.trim()).filter(Boolean)
      : [];
    const rows = Number(req.query.rows ?? 24) || 24;
    const page = Number(req.query.page ?? 1) || 1;
    const mode = String(req.query.mode || "AND");
    const data = await performEuropeanaSearch({ terms, rows, page, mode });
    res.json(data);
  } catch (e) {
    console.error("[searchRaw GET] error:", e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;


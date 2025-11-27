const express = require("express");
const router = express.Router();
const { getFacets } = require("../services/a23.facets.cjs");

// POST /api/europeana/facets
router.post("/europeana/facets", async (req, res) => {
  try {
    const payload = req.body || {};
    const data = await getFacets(payload);
    res.json(data);
  } catch (e) {
    console.error("[facets POST] error:", e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

// GET /api/europeana/facets?terms=luther
router.get("/europeana/facets", async (req, res) => {
  try {
    const terms = req.query.terms
      ? String(req.query.terms).split(",").map(s => s.trim()).filter(Boolean)
      : [];
    const mode = String(req.query.mode || "AND");
    const data = await getFacets({ terms, mode, rows: 0 });
    res.json(data);
  } catch (e) {
    console.error("[facets GET] error:", e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;


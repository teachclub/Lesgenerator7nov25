// backend/routes/a06.chips.cjs
const express = require("express");
const router = express.Router();
const { hybridChips } = require("../services/a06.chips.cjs");

router.get("/chips/ping", (req, res) => {
  res.json({ ok: true, route: "chips", ts: new Date().toISOString() });
});

router.post("/chips", async (req, res) => {
  try {
    const { term = "", limit = 12 } = req.body || {};
    if (!term || !String(term).trim()) {
      return res.status(400).json({ ok: false, error: "term is verplicht" });
    }
    const out = await hybridChips({ term, limit: Number(limit) || 12 });
    res.json({ ok: true, ...out });
  } catch (err) {
    console.error("[/api/chips] error:", err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

module.exports = router;


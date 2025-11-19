// routes/kleio.cjs — API voor Kleio-bronnen (met debug)
const express = require("express");
const router = express.Router();
const { kleioSearch } = require("../services/kleioFetcher.cjs");

router.get("/ping", (_req, res) => {
  res.json({ ok: true, service: "kleio", ts: new Date().toISOString() });
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || "8", 10)));
    if (!q) return res.status(400).json({ ok: false, error: "q query param vereist" });

    // DEBUG
    console.log("[route:/api/kleio/search] q=", q, "limit=", limit);
    console.log("[route] kleioSearch typeof =", typeof kleioSearch);
    try {
      console.log(
        "[route] kleioSearch has VERSION_MARK?",
        kleioSearch.toString().includes("VERSION_MARK")
      );
    } catch {}

    const items = await kleioSearch(q, { limit });
    res.json({ q, count: items.length, items });
  } catch (e) {
    console.error("[route:/api/kleio/search] error:", e?.message);
    res.status(502).json({ ok: false, error: e?.message || "fetch failed" });
  }
});

module.exports = router;


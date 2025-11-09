const express = require("express");
const { hybridChips } = require("../services/a06.chips.cjs");

module.exports = function router() {
  const r = express.Router();

  r.get("/chips/ping", (req, res) => {
    res.json({
      ok: true,
      model: process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash",
      time: new Date().toISOString(),
    });
  });

  r.post("/chips", async (req, res) => {
    try {
      const { term = "", limit = 20 } = req.body || {};
      const out = await hybridChips({ term, limit });
      return res.status(200).json(out);
    } catch (e) {
      console.error("[/api/chips] error:", e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  return r;
};

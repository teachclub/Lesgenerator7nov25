const express = require("express");
const { callGemini } = require("../services/a06.chips.cjs");

module.exports = function router() {
  const r = express.Router();

  /**
   * GET /api/chips/ping
   * Snelle healthcheck voor de Gemini configuratie.
   */
  r.get("/chips/ping", (req, res) => {
    const model = process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash";
    const hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    res.json({ ok: true, model, hasKey });
  });

  /**
   * POST /api/chips
   * Genereer chips o.b.v. term en context.
   */
  r.post("/chips", async (req, res) => {
    const { term, context, limit } = req.body || {};
    
    if (!term || typeof term !== "string") {
      return res.status(400).json({ ok: false, error: "term verplicht (string)" });
    }

    // Roep de service aan (die de daadwerkelijke API call doet)
    const out = await callGemini(term, context, limit || 10);
    const statusCode = out.status || (out.ok ? 200 : 502); // 502 (Bad Gateway) als service faalt

    if (!out.ok) {
      // Fout vanuit Gemini (bijv. API key, 400, 500)
      return res.status(statusCode).json({ ok: false, error: out.data });
    }

    // Succes
    return res.status(statusCode).json({
      ok: true,
      model: out.data.model, // Het model dat daadwerkelijk gebruikt is
      chips: out.data.chips, // De array met chips
    });
  });

  return r;
};

const express = require("express");
const svc = require("../services/a11.europeana.cjs");

module.exports = function router() {
  const r = express.Router();

  r.post("/facets", async (req, res) => {
    // Stuur de body van de request (JSON) direct door naar de service
    const out = await svc.facets(req.body || {});
    const statusCode = out.status || (out.ok ? 200 : 500);

    // Stuur het 'data' object (dat de 'facets' array bevat) direct terug
    res.status(statusCode).json({ ok: out.ok, response: out.data });
  });

  return r;
};

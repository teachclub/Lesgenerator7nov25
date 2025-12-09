const express = require("express");
const svc = require("../services/a11.europeana.cjs");

module.exports = function router() {
  const r = express.Router();

  r.get("/ping", async (req, res) => {
    const out = await svc.ping();
    // Stuur de statuscode van de service (bijv. 400 als key mist, 502 bij timeout)
    const statusCode = out.status || (out.ok ? 200 : 500);
    res.status(statusCode).json({
      ok: out.ok,
      response: { statusCode: out.status, body: out.data },
    });
  });

  return r;
};

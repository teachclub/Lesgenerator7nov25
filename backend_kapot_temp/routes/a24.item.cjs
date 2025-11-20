const express = require("express");
const svc = require("../services/a11.europeana.cjs");

module.exports = function router() {
  const r = express.Router();

  r.get("/item", async (req, res) => {
    // Haal het 'id' op uit de query parameters (?id=...)
    const id = req.query.id;
    
    const out = await svc.item(id);
    const statusCode = out.status || (out.ok ? 200 : 500);

    // Stuur het 'data' object (dat het volledige item bevat) direct terug
    res.status(statusCode).json({ ok: out.ok, response: out.data });
  });

  return r;
};

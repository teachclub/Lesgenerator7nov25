const express = require("express");

module.exports = function router() {
  const r = express.Router();

  r.get("/", (req, res) => {
    res.json({
      ok: true,
      service: "masterprompt-backend",
      timestamp: new Date().toISOString(),
      routes: [
        "GET /",
        "GET /api/europeana/ping",
        "POST /api/europeana/search-raw",
        "POST /api/europeana/facets",
        "GET /api/europeana/item?id=...",
        "GET /api/chips/ping",
        "POST /api/chips",
        "POST /api/search (opt)",
        "POST /api/search-preset (opt)",
      ],
    });
  });

  return r;
};

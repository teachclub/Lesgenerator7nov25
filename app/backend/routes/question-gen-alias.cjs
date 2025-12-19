"use strict";

const express = require("express");

// DIRECT router: geen forwarding, geen loop.
// Biedt meerdere paden, maar elk pad geeft direct response via a16 handler.

module.exports = function questionGenAliasRouter() {
  const router = express.Router();

  const a16Factory = require("./a16.questionGen.cjs");
  const a16Router = typeof a16Factory === "function" ? a16Factory() : a16Factory;

  // Mount a16Router onder /question-gen zodat /api/question-gen -> /question-gen (in a16) exact matcht.
  router.use("/question-gen", a16Router);

  // Compat paden: map naar /question-gen (maar ZONDER req.url te muteren)
  router.use("/questionGen", a16Router);
  router.use("/a16.questionGen", a16Router);
  router.use("/a16-questionGen", a16Router);

  return router;
};


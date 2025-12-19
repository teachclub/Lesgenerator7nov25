"use strict";

const express = require("express");
const { getSourcesForProposalService } = require("../services/a26.sources.cjs");

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function safeStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

module.exports = function router() {
  const r = express.Router();

  // POST /api/get-sources-for-proposal
  // body: { term, filters, chosenProposal }
  r.post("/get-sources-for-proposal", async (req, res) => {
    try {
      const body = isObj(req.body) ? req.body : {};
      const term = safeStr(body.term);
      const chosenProposal = isObj(body.chosenProposal) ? body.chosenProposal : null;
      const filters = isObj(body.filters) ? body.filters : {};

      if (!chosenProposal) {
        return res.status(400).json({
          ok: false,
          error: "chosenProposal ontbreekt (gekozen lesvoorstel is verplicht).",
        });
      }
      if (!term) {
        return res.status(400).json({ ok: false, error: "term ontbreekt (zoekterm is verplicht)." });
      }

      const result = await getSourcesForProposalService(term, filters, chosenProposal);

      return res.status(result?.ok ? 200 : 500).json(result);
    } catch (err) {
      console.error("[a26.sources route] crash:", err);
      return res.status(500).json({ ok: false, error: err?.message || "sources route crash" });
    }
  });

  return r;
};


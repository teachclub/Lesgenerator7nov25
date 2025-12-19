"use strict";

const express = require("express");
const svc = require("../services/a11.europeana.cjs");

module.exports = function router() {
  const r = express.Router();

  // GET /api/item?id=...
  r.get("/item", async (req, res) => {
    try {
      const id = typeof req.query?.id === "string" ? req.query.id.trim() : "";

      if (!id) {
        return res.status(400).json({ ok: false, error: "id ontbreekt (?id=...)" });
      }

      const out = await svc.item(id);

      const statusCode =
        typeof out?.status === "number"
          ? out.status
          : out?.ok
            ? 200
            : 502;

      return res.status(statusCode).json({
        ok: !!out?.ok,
        response: out?.data ?? null,
        status: out?.status ?? statusCode,
        error: out?.ok ? null : out?.error ?? "item fetch failed",
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e?.message || "item route crash" });
    }
  });

  return r;
};


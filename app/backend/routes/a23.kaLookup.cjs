"use strict";

const express = require("express");
const { query } = require("../services/pg.cjs");

module.exports = function a23KaLookupRouter() {
  const r = express.Router();

  r.get("/ka-lookup", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();

      const sql = q
        ? `
          SELECT ka_code, ka_label
          FROM lessie.ka_lookup
          WHERE ka_code ILIKE $1 OR ka_label ILIKE $1
          ORDER BY ka_code ASC
          LIMIT 200
        `
        : `
          SELECT ka_code, ka_label
          FROM lessie.ka_lookup
          ORDER BY ka_code ASC
        `;

      const params = q ? [`%${q}%`] : [];
      const out = await query(sql, params);

      return res.json({
        ok: true,
        rows: (out && out.rows) || [],
      });
    } catch (e) {
      console.error("[a23.kaLookup] FOUT", e);
      return res.status(500).json({ ok: false, error: "ka-lookup faalde" });
    }
  });

  return r;
};


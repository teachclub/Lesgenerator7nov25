"use strict";

const express = require("express");
const { Pool } = require("pg");

function intOr(x, d) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function safeIdent(s, allow) {
  const v = String(s || "").trim();
  return allow.includes(v) ? v : allow[0];
}

function buildPool() {
  const url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();

  if (url) {
    return new Pool({ connectionString: url });
  }

  const host = process.env.PGHOST || "127.0.0.1";
  const port = intOr(process.env.PGPORT, 5432);
  const user = process.env.PGUSER || process.env.USER || "postgres";
  const database = process.env.PGDATABASE || "lessie2000";
  const password = process.env.PGPASSWORD || undefined;

  return new Pool({
    host,
    port,
    user,
    database,
    password,
  });
}

module.exports = function a50DbBrowserRouter() {
  const r = express.Router();
  const pool = buildPool();

  r.get("/db/ping", async (req, res) => {
    try {
      const q = await pool.query("select now() as now");
      return res.json({ ok: true, now: q.rows[0].now });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "db ping faalde",
        message: e && e.message ? String(e.message) : "onbekend",
      });
    }
  });

  r.get("/db/sources", async (req, res) => {
    const q = String(req.query.q || "").trim();
    const provider = String(req.query.provider || "").trim();
    const tv = String(req.query.tv || "").trim();
    const ka = String(req.query.ka || "").trim();

    const page = clamp(intOr(req.query.page, 1), 1, 1000000);
    const pageSize = clamp(intOr(req.query.pageSize, 50), 5, 200);

    const sort = safeIdent(String(req.query.sort || ""), [
      "updated_at",
      "created_at",
      "provider",
      "tv",
      "ka",
      "title",
    ]);
    const dir = String(req.query.dir || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const where = [];
    const params = [];
    let p = 1;

    if (provider) {
      where.push(`s.provider = $${p++}`);
      params.push(provider);
    }
    if (tv) {
      where.push(`s.tv ILIKE $${p++}`);
      params.push(tv);
    }
    if (ka) {
      where.push(`s.ka ILIKE $${p++}`);
      params.push(ka);
    }
    if (q) {
      where.push(`(
        s.title ILIKE $${p} OR
        s.url ILIKE $${p} OR
        s.full_text ILIKE $${p} OR
        s.main_text ILIKE $${p} OR
        s.intro_text ILIKE $${p}
      )`);
      params.push(`%${q}%`);
      p++;
    }

    const whereSql = where.length ? `where ${where.join(" and ")}` : "";
    const offset = (page - 1) * pageSize;

    try {
      const countSql = `
        select count(*)::int as n
        from lessie.sources s
        ${whereSql}
      `;
      const countRes = await pool.query(countSql, params);

      const dataSql = `
        select
          s.id,
          s.provider,
          s.source_key,
          s.source_type,
          s.title,
          s.url,
          s.tv,
          s.ka,
          kl.ka_label as ka_label,
          s.image_url,
          left(coalesce(s.full_text,''), 260) as preview,
          s.updated_at,
          s.created_at
        from lessie.sources s
        left join lessie.ka_lookup kl
          on kl.ka_code = regexp_replace(upper(coalesce(s.ka,'')), '^.*(KA[0-9]{1,2}).*$', '\\1')
        ${whereSql}
        order by ${sort} ${dir}
        limit $${p++} offset $${p++}
      `;
      const dataRes = await pool.query(dataSql, [...params, pageSize, offset]);

      return res.json({
        ok: true,
        meta: {
          page,
          pageSize,
          total: countRes.rows[0].n,
          sort,
          dir,
          q: q || null,
          provider: provider || null,
          tv: tv || null,
          ka: ka || null,
        },
        rows: dataRes.rows,
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "db sources faalde",
        message: e && e.message ? String(e.message) : "onbekend",
      });
    }
  });

  r.get("/db/source/:id", async (req, res) => {
    const id = intOr(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, error: "id ontbreekt" });

    try {
      const sql = `
        select
          s.*,
          kl.ka_label as ka_label
        from lessie.sources s
        left join lessie.ka_lookup kl
          on kl.ka_code = regexp_replace(upper(coalesce(s.ka,'')), '^.*(KA[0-9]{1,2}).*$', '\\1')
        where s.id = $1
        limit 1
      `;
      const r1 = await pool.query(sql, [id]);
      if (!r1.rows.length) return res.status(404).json({ ok: false, error: "niet gevonden" });
      return res.json({ ok: true, row: r1.rows[0] });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "db source detail faalde",
        message: e && e.message ? String(e.message) : "onbekend",
      });
    }
  });

  return r;
};


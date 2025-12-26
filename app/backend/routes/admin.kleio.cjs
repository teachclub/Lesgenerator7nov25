"use strict";

const express = require("express");

/*
  Admin-overzicht Kleio in PostgreSQL (lessie.sources)
  - URL: /admin/kleio
  - Login via Basic Auth (ADMIN_USER / ADMIN_PASS in .env)
*/

function parseBasicAuth(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Basic\s+(.+)$/i);
  if (!m) return null;
  try {
    const raw = Buffer.from(m[1], "base64").toString("utf8");
    const i = raw.indexOf(":");
    if (i < 0) return null;
    return { user: raw.slice(0, i), pass: raw.slice(i + 1) };
  } catch {
    return null;
  }
}

function authGuard(req, res, next) {
  const wantUser = String(process.env.ADMIN_USER || "").trim();
  const wantPass = String(process.env.ADMIN_PASS || "").trim();

  if (!wantUser || !wantPass) {
    return res.status(500).send("Admin login ontbreekt: zet ADMIN_USER en ADMIN_PASS in app/backend/.env");
  }

  const creds = parseBasicAuth(req);
  if (!creds || creds.user !== wantUser || creds.pass !== wantPass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Lessie Admin"');
    return res.status(401).send("Unauthorized");
  }
  next();
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = function adminKleioRouter(dbPool) {
  const router = express.Router();

  router.get("/admin/kleio", authGuard, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const tv = String(req.query.tv || "").trim(); // bijv "9"
      const ka = String(req.query.ka || "").trim(); // bijv "KA42"

      const where = [`provider='Kleio'`];
      const params = [];
      let p = 1;

      if (q) {
        where.push(`(title ILIKE $${p} OR url ILIKE $${p} OR full_text ILIKE $${p})`);
        params.push(`%${q}%`);
        p++;
      }
      if (tv) {
        where.push(`tv = $${p}`);
        params.push(tv);
        p++;
      }
      if (ka) {
        where.push(`ka ILIKE $${p}`);
        params.push(`%${ka}%`);
        p++;
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const rowsSql = `
        SELECT id, source_key, source_type, title, url, tv, ka, updated_at
        FROM lessie.sources
        ${whereSql}
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 200
      `;
      const countSql = `
        SELECT count(*)::int AS n
        FROM lessie.sources
        ${whereSql}
      `;

      const [rowsR, countR] = await Promise.all([
        dbPool.query(rowsSql, params),
        dbPool.query(countSql, params),
      ]);

      const n = countR.rows[0]?.n ?? 0;
      const rows = rowsR.rows || [];

      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (tv) qs.set("tv", tv);
      if (ka) qs.set("ka", ka);

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Lessie Admin – Kleio</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 16px; }
    .row { display:flex; gap:12px; align-items:center; flex-wrap: wrap; }
    input { padding: 8px; font-size: 14px; }
    button { padding: 8px 12px; font-size: 14px; cursor: pointer; }
    table { width:100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; background: #fafafa; }
    .muted { color: #666; font-size: 12px; }
    a { color: inherit; }
    code { font-size: 12px; }
  </style>
</head>
<body>
  <h2>Lessie Admin – Kleio</h2>
  <div class="muted">Totaal (na filters): <b>${esc(n)}</b> • getoond: <b>${esc(rows.length)}</b> (max 200)</div>

  <form class="row" method="GET" action="/admin/kleio">
    <label>Zoek
      <input name="q" value="${esc(q)}" placeholder="Hitler, noodbevoegdheden, ..."/>
    </label>
    <label>TV
      <input name="tv" value="${esc(tv)}" placeholder="9" style="width:80px"/>
    </label>
    <label>KA
      <input name="ka" value="${esc(ka)}" placeholder="KA42" style="width:110px"/>
    </label>
    <button type="submit">Filter</button>
    <a class="muted" href="/admin/kleio">Reset</a>
    <span class="muted">JSON: <a href="/admin/kleio.json?${esc(qs.toString())}">/admin/kleio.json</a></span>
  </form>

  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Titel</th>
        <th>TV/KA</th>
        <th>Type</th>
        <th>URL</th>
        <th>Key</th>
        <th>Updated</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
        <tr>
          <td>${esc(r.id)}</td>
          <td>${esc(r.title || "")}</td>
          <td><code>${esc(r.tv || "")}</code> <code>${esc(r.ka || "")}</code></td>
          <td><code>${esc(r.source_type || "")}</code></td>
          <td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url)}</a>` : ""}</td>
          <td><code>${esc(r.source_key || "")}</code></td>
          <td class="muted">${esc(r.updated_at || "")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (e) {
      console.error("[admin.kleio] error", e && (e.stack || e.message || e));
      return res.status(500).send("Admin Kleio faalde");
    }
  });

  router.get("/admin/kleio.json", authGuard, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const tv = String(req.query.tv || "").trim();
      const ka = String(req.query.ka || "").trim();

      const where = [`provider='Kleio'`];
      const params = [];
      let p = 1;

      if (q) {
        where.push(`(title ILIKE $${p} OR url ILIKE $${p} OR full_text ILIKE $${p})`);
        params.push(`%${q}%`);
        p++;
      }
      if (tv) {
        where.push(`tv = $${p}`);
        params.push(tv);
        p++;
      }
      if (ka) {
        where.push(`ka ILIKE $${p}`);
        params.push(`%${ka}%`);
        p++;
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const sql = `
        SELECT id, source_key, source_type, title, url, tv, ka, updated_at
        FROM lessie.sources
        ${whereSql}
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 500
      `;
      const r = await dbPool.query(sql, params);
      return res.json({ ok: true, count: r.rows.length, rows: r.rows });
    } catch (e) {
      console.error("[admin.kleio.json] error", e && (e.stack || e.message || e));
      return res.status(500).json({ ok: false });
    }
  });

  return router;
};


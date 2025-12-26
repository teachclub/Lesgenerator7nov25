"use strict";

const express = require("express");

function pickDbConfig() {
  const url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (url) return { connectionString: url };

  return {
    host: process.env.PGHOST || "127.0.0.1",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || process.env.USER || "postgres",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "lessie2000",
  };
}

let _pool = null;
function getPool() {
  if (_pool) return _pool;
  let Pool;
  try {
    Pool = require("pg").Pool;
  } catch (e) {
    throw new Error("[admin] Package 'pg' ontbreekt. Installeer met: npm i pg");
  }
  _pool = new Pool(pickDbConfig());
  return _pool;
}

async function q(sql, params) {
  const pool = getPool();
  const r = await pool.query(sql, params || []);
  return r.rows || [];
}

function unauthorized(res) {
  res.set("WWW-Authenticate", 'Basic realm="Lessie Admin"');
  return res.status(401).send("401 Unauthorized");
}

function basicAuth(req, res, next) {
  const wantUser = String(process.env.ADMIN_USER || "").trim();
  const wantPass = String(process.env.ADMIN_PASS || "").trim();
  if (!wantUser || !wantPass) {
    return res.status(500).send("ADMIN_USER/ADMIN_PASS ontbreken in backend .env");
  }

  const h = String(req.headers.authorization || "");
  if (!h.startsWith("Basic ")) return unauthorized(res);

  let decoded = "";
  try {
    decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
  } catch (e) {
    return unauthorized(res);
  }

  const i = decoded.indexOf(":");
  if (i < 0) return unauthorized(res);

  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);
  if (user !== wantUser || pass !== wantPass) return unauthorized(res);

  next();
}

function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function page(title, body) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)}</title>
<style>
  body{font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial; margin:24px; line-height:1.35;}
  h1{margin:0 0 12px 0;}
  .muted{color:#666; font-size:14px;}
  .topnav{display:flex; gap:10px; margin:10px 0 18px 0; flex-wrap:wrap;}
  .topnav a{border:1px solid #ddd; padding:6px 10px; border-radius:10px; text-decoration:none;}
  .topnav a.active{background:#f6f6f6;}
  table{border-collapse:collapse; width:100%; margin:10px 0 22px 0;}
  th,td{border:1px solid #ddd; padding:8px; vertical-align:top; font-size:13px;}
  th{background:#f6f6f6; text-align:left; cursor:pointer; user-select:none;}
  .card{border:1px solid #ddd; border-radius:12px; padding:12px; margin:12px 0;}
  code{background:#f6f6f6; padding:2px 5px; border-radius:6px;}
  input,select,textarea,button{font:inherit;}
  input,select{padding:6px 8px;}
  textarea{width:100%; min-height:140px; padding:8px;}
  .row{display:flex; gap:10px; flex-wrap:wrap; align-items:end;}
  .row > div{display:flex; flex-direction:column; gap:4px;}
  .btn{border:1px solid #ddd; background:#fff; padding:6px 10px; border-radius:10px; cursor:pointer;}
  .btn.primary{background:#f6f6f6;}
  .pager{display:flex; gap:10px; align-items:center; flex-wrap:wrap;}
  .small{font-size:12px; color:#666;}
  a{color:inherit;}
  .nowrap{white-space:nowrap;}
</style>
</head>
<body>
${body}
<script>
(function(){
  const ths = document.querySelectorAll("th[data-sort]");
  ths.forEach(th=>{
    th.addEventListener("click", ()=>{
      const key = th.getAttribute("data-sort");
      const url = new URL(window.location.href);
      const cur = url.searchParams.get("sort") || "";
      const dir = url.searchParams.get("dir") || "desc";
      url.searchParams.set("sort", key);
      url.searchParams.set("dir", (cur===key && dir==="desc") ? "asc" : "desc");
      url.searchParams.set("offset", "0");
      window.location.href = url.toString();
    });
  });
})();
</script>
</body>
</html>`;
}

function nav(active) {
  const items = [
    ["Overzicht", "/admin/"],
    ["Bronnen (Kleio/Cito)", "/admin/sources"],
    ["Hoofd/Deelvragen", "/admin/questions"],
  ];
  return `<div class="topnav">
    ${items
      .map(([label, href]) => {
        const is = active === href;
        return `<a class="${is ? "active" : ""}" href="${href}">${esc(label)}</a>`;
      })
      .join("")}
  </div>`;
}

function pickInt(v, def, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function allowSort(sortKey, allowed, fallback) {
  const s = String(sortKey || "").trim();
  if (allowed.includes(s)) return s;
  return fallback;
}

async function tableExists(schema, table) {
  const rows = await q(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema=$1 AND table_name=$2
     LIMIT 1`,
    [schema, table]
  );
  return rows.length > 0;
}

module.exports = function a90AdminRouter() {
  const router = express.Router();
  router.use(basicAuth);

  router.get("/ping", (req, res) => res.json({ ok: true, admin: true }));

  router.get("/", async (req, res) => {
    try {
      const counts = await q(
        `SELECT provider, count(*)::int AS n
         FROM lessie.sources
         GROUP BY provider
         ORDER BY n DESC, provider ASC`
      );

      const now = new Date().toISOString();
      const countsRows = counts
        .map((r) => `<tr><td>${esc(r.provider)}</td><td>${esc(r.n)}</td></tr>`)
        .join("");

      const html = page(
        "Lessie2000 Admin",
        `<h1>Lessie2000 Admin</h1>
<div class="muted">tijd: ${esc(now)} · schema: <code>lessie</code></div>
${nav("/admin/")}
<div class="card">
  <h2 style="margin:0 0 8px 0;">Bronnen per provider</h2>
  <table>
    <thead><tr><th>provider</th><th>aantal</th></tr></thead>
    <tbody>${countsRows || ""}</tbody>
  </table>
  <div class="small">Tip: ga naar “Bronnen (Kleio/Cito)” voor zoeken/sorteren/bewerken.</div>
</div>`
      );

      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (e) {
      console.error("[admin] ERROR", e && (e.stack || e.message || e));
      return res.status(500).send("admin faalde: " + (e?.message ? String(e.message) : "onbekend"));
    }
  });

  router.get("/sources", async (req, res) => {
    try {
      const provider = String(req.query.provider || "").trim();
      const tv = String(req.query.tv || "").trim();
      const ka = String(req.query.ka || "").trim();
      const search = String(req.query.q || "").trim();

      const limit = pickInt(req.query.limit, 50, 10, 200);
      const offset = pickInt(req.query.offset, 0, 0, 200000);

      const sort = allowSort(req.query.sort, ["updated_at", "id", "provider", "tv", "ka", "source_type", "title"], "updated_at");
      const dir = String(req.query.dir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

      const where = [];
      const params = [];
      let p = 1;

      if (provider) {
        where.push(`provider=$${p++}`);
        params.push(provider);
      }
      if (tv) {
        where.push(`tv=$${p++}`);
        params.push(tv);
      }
      if (ka) {
        where.push(`ka=$${p++}`);
        params.push(ka);
      }
      if (search) {
        where.push(`(
          title ILIKE $${p} OR
          url ILIKE $${p} OR
          full_text ILIKE $${p}
        )`);
        params.push(`%${search}%`);
        p++;
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const totalRows = await q(`SELECT count(*)::int AS n FROM lessie.sources ${whereSql}`, params);
      const total = totalRows[0] ? Number(totalRows[0].n) : 0;

      const rows = await q(
        `SELECT id, provider, source_key, source_type, title, url, tv, ka, updated_at
         FROM lessie.sources
         ${whereSql}
         ORDER BY ${sort} ${dir}, id DESC
         LIMIT $${p++} OFFSET $${p++}`,
        [...params, limit, offset]
      );

      const urlNow = new URL(req.protocol + "://" + req.get("host") + req.originalUrl);
      function setParam(k, v) {
        if (v === "" || v === null || v === undefined) urlNow.searchParams.delete(k);
        else urlNow.searchParams.set(k, String(v));
      }

      const prevOff = Math.max(0, offset - limit);
      const nextOff = offset + limit;

      const prevUrl = new URL(urlNow.toString());
      prevUrl.searchParams.set("offset", String(prevOff));

      const nextUrl = new URL(urlNow.toString());
      nextUrl.searchParams.set("offset", String(nextOff));

      const tableRows = rows
        .map((r) => {
          const link = r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url)}</a>` : "";
          return `<tr>
<td class="nowrap">${esc(r.id)}</td>
<td>${esc(r.provider)}</td>
<td>${esc(r.source_type)}</td>
<td>${esc(r.tv || "")}</td>
<td>${esc(r.ka || "")}</td>
<td>${esc(r.title || "")}</td>
<td>${link}</td>
<td class="nowrap">${esc(r.updated_at || "")}</td>
<td class="nowrap"><a href="/admin/source/${esc(r.id)}">edit</a></td>
</tr>`;
        })
        .join("");

      const html = page(
        "Bronnen",
        `<h1>Bronnen (Kleio/Cito)</h1>
<div class="muted">Zoeken/sorteren/pagineren. Klik op kolomkop om te sorteren. “edit” om te bewerken.</div>
${nav("/admin/sources")}

<div class="card">
  <form method="GET" action="/admin/sources">
    <div class="row">
      <div>
        <label>provider</label>
        <select name="provider">
          <option value="" ${provider ? "" : "selected"}>(alle)</option>
          <option value="Kleio" ${provider === "Kleio" ? "selected" : ""}>Kleio</option>
          <option value="Cito" ${provider === "Cito" ? "selected" : ""}>Cito</option>
        </select>
      </div>
      <div>
        <label>tv</label>
        <input name="tv" value="${esc(tv)}" placeholder="9" />
      </div>
      <div>
        <label>ka</label>
        <input name="ka" value="${esc(ka)}" placeholder="KA42" />
      </div>
      <div style="min-width:320px; flex:1;">
        <label>zoek (title/url/full_text)</label>
        <input name="q" value="${esc(search)}" placeholder="Hitler" style="width:100%;" />
      </div>
      <div>
        <label>limit</label>
        <input name="limit" value="${esc(limit)}" />
      </div>
      <div>
        <button class="btn primary" type="submit">Zoek</button>
      </div>
    </div>
    <input type="hidden" name="sort" value="${esc(sort)}" />
    <input type="hidden" name="dir" value="${esc(dir.toLowerCase())}" />
    <input type="hidden" name="offset" value="${esc(offset)}" />
  </form>
</div>

<div class="pager">
  <div><b>totaal:</b> ${esc(total)} · <b>offset:</b> ${esc(offset)} · <b>limit:</b> ${esc(limit)}</div>
  <div>
    <a class="btn" href="${esc(prevUrl.toString().replace(urlNow.origin, ""))}">Vorige</a>
    <a class="btn" href="${esc(nextUrl.toString().replace(urlNow.origin, ""))}">Volgende</a>
  </div>
  <div class="small">Sort: ${esc(sort)} ${esc(dir)}</div>
</div>

<table>
  <thead>
    <tr>
      <th data-sort="id">id</th>
      <th data-sort="provider">provider</th>
      <th data-sort="source_type">type</th>
      <th data-sort="tv">tv</th>
      <th data-sort="ka">ka</th>
      <th data-sort="title">title</th>
      <th>url</th>
      <th data-sort="updated_at">updated_at</th>
      <th>edit</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>`
      );

      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (e) {
      console.error("[admin/sources] ERROR", e && (e.stack || e.message || e));
      return res.status(500).send("sources faalde: " + (e?.message ? String(e.message) : "onbekend"));
    }
  });

  router.get("/source/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).send("bad id");

      const rows = await q(
        `SELECT id, provider, source_key, source_type, title, url, tv, ka, intro_text, main_text, caption_text, full_text, image_url, updated_at
         FROM lessie.sources
         WHERE id=$1
         LIMIT 1`,
        [id]
      );

      if (!rows.length) return res.status(404).send("not found");
      const r = rows[0];

      const html = page(
        "Edit bron",
        `<h1>Edit bron</h1>
${nav("/admin/sources")}
<div class="muted


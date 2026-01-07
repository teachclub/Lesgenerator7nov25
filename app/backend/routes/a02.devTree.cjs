"use strict";

const express = require("express");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

module.exports = function a02DevTreeFactory() {
  const router = express.Router();

  function pickBackendRoot() {
    const cwd = process.cwd(); // Cloud Run: "/app"
    const candidates = [
      path.join(cwd, "app", "backend"),
      path.join(cwd, "backend"),
      cwd,
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
      } catch (_) {}
    }
    return cwd;
  }

  const BACKEND_ROOT = pickBackendRoot();

  const SKIP_DIRS = new Set([
    "node_modules",
    ".git",
    ".firebase",
    "dist",
    "build",
    ".next",
    ".cache",
    "coverage",
    ".turbo",
  ]);

  function shouldSkipDir(name) {
    if (!name) return true;
    if (name.startsWith(".")) return true;
    return SKIP_DIRS.has(name);
  }

  async function readHint(fileAbs) {
    try {
      const fh = await fsp.open(fileAbs, "r");
      const buf = Buffer.alloc(2048);
      const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
      await fh.close();
      const txt = buf.slice(0, bytesRead).toString("utf8");
      const lines = txt.split(/\r?\n/).slice(0, 12).map((s) => s.trim());
      const hit =
        lines.find((l) => l.startsWith("// hint:")) ||
        lines.find((l) => l.startsWith("// ---")) ||
        lines.find((l) => l.startsWith("/*")) ||
        lines.find((l) => l.startsWith("//"));
      if (!hit) return "";
      return hit.replace(/^\/\//, "").trim().slice(0, 140);
    } catch (_) {
      return "";
    }
  }

  async function walkDir(dirAbs, relBase, depth, maxDepth, withHints) {
    const name = path.basename(dirAbs) || relBase || "backend";
    const node = { type: "dir", name, path: relBase || ".", children: [] };

    if (depth > maxDepth) return node;

    let entries;
    try {
      entries = await fsp.readdir(dirAbs, { withFileTypes: true });
    } catch (e) {
      node.error = e?.message || String(e);
      return node;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));

    for (const ent of entries) {
      const entName = ent.name;

      if (ent.isDirectory()) {
        if (shouldSkipDir(entName)) continue;
        const abs = path.join(dirAbs, entName);
        const rel = relBase ? path.join(relBase, entName) : entName;
        node.children.push(await walkDir(abs, rel, depth + 1, maxDepth, withHints));
        continue;
      }

      if (ent.isFile()) {
        const abs = path.join(dirAbs, entName);
        const rel = relBase ? path.join(relBase, entName) : entName;

        let st;
        try {
          st = await fsp.stat(abs);
        } catch (_) {
          node.children.push({ type: "file", name: entName, path: rel, error: "stat failed" });
          continue;
        }

        const child = {
          type: "file",
          name: entName,
          path: rel,
          size: st.size,
          mtime: st.mtime ? new Date(st.mtime).toISOString() : null,
        };

        if (withHints) {
          child.hint = await readHint(abs);
        }

        node.children.push(child);
      }
    }

    return node;
  }

  function scopeStartDir(scope) {
    const s = String(scope || "").toLowerCase();
    if (s === "ql") return path.join(BACKEND_ROOT, "routes");
    return BACKEND_ROOT;
  }

  router.get("/api/dev/tree", async (req, res) => {
    try {
      const scope = String(req.query.scope || "all");
      const withHints = String(req.query.withHints || "0") === "1";
      const withNotes = String(req.query.withNotes || "0") === "1"; // compatibel, nu niet gebruikt
      const maxDepth = Math.max(1, Math.min(12, Number(req.query.maxDepth || 8)));

      const startAbs = scopeStartDir(scope);
      const relBase = path.relative(BACKEND_ROOT, startAbs) || ".";

      const tree = await walkDir(startAbs, relBase, 0, maxDepth, withHints);

      res.status(200).json({
        ok: true,
        ts: new Date().toISOString(),
        scope,
        backendRoot: BACKEND_ROOT,
        start: startAbs,
        withHints,
        withNotes,
        maxDepth,
        tree,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  });

  router.get("/dev/tree/ui", async (req, res) => {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dev Tree UI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:14px}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
    .btn{
      padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:750;cursor:pointer
    }
    .btn:hover{background:#f8fafc}
    select{padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:650}
    label{font-size:13px;color:#334155;display:flex;gap:6px;align-items:center}
    pre{white-space:pre-wrap;word-break:break-word;border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#f8fafc}
    .muted{font-size:12px;color:#64748b}
    .sep{width:1px;height:26px;background:#e5e7eb;margin:0 4px}
  </style>
</head>
<body>
  <div class="row">
    <button class="btn" id="btnAll">Tree ALL</button>
    <button class="btn" id="btnQl">Tree QL</button>
    <span class="sep"></span>

    <select id="scope">
      <option value="all">scope=all</option>
      <option value="ql">scope=ql</option>
    </select>

    <label><input type="checkbox" id="hints" /> hints</label>
    <label><input type="checkbox" id="notes" /> notes</label>

    <button class="btn" id="load">Load</button>
    <span class="muted" id="msg"></span>
  </div>

  <pre id="out">(klik Load)</pre>

<script>
(function(){
  var out = document.getElementById('out');
  var msg = document.getElementById('msg');

  function qs(){
    var p = {};
    var s = (location.search || '').replace(/^\\?/, '');
    if (!s) return p;
    s.split('&').forEach(function(kv){
      var i = kv.indexOf('=');
      var k = i >= 0 ? kv.slice(0,i) : kv;
      var v = i >= 0 ? kv.slice(i+1) : '';
      k = decodeURIComponent(k || '').trim();
      v = decodeURIComponent(v || '').trim();
      if (k) p[k] = v;
    });
    return p;
  }

  var q = qs();

  function setUi(scope, hints, notes){
    document.getElementById('scope').value = scope || 'all';
    document.getElementById('hints').checked = hints === true;
    document.getElementById('notes').checked = notes === true;
  }

  async function load(){
    msg.textContent = 'loading…';
    var scope = document.getElementById('scope').value;
    var hints = document.getElementById('hints').checked ? '1' : '0';
    var notes = document.getElementById('notes').checked ? '1' : '0';
    var url = '/api/dev/tree?scope=' + encodeURIComponent(scope)
      + '&withHints=' + hints
      + '&withNotes=' + notes
      + '&cachebust=' + Date.now();
    try{
      var r = await fetch(url, { cache: 'no-store' });
      var t = await r.text();
      out.textContent = t;
      msg.textContent = r.ok ? 'ok' : ('HTTP ' + r.status);
    }catch(e){
      msg.textContent = 'error';
      out.textContent = String(e && e.message ? e.message : e);
    }
  }

  document.getElementById('load').addEventListener('click', load);

  document.getElementById('btnAll').addEventListener('click', function(){
    setUi('all', document.getElementById('hints').checked, document.getElementById('notes').checked);
    load();
  });

  document.getElementById('btnQl').addEventListener('click', function(){
    setUi('ql', document.getElementById('hints').checked, document.getElementById('notes').checked);
    load();
  });

  // query params support (voor DevHub-knoppen straks)
  var initScope = (q.scope || '').toLowerCase();
  if (initScope !== 'all' && initScope !== 'ql') initScope = 'all';

  var initHints = (q.withHints === '1' || q.hints === '1');
  var initNotes = (q.withNotes === '1' || q.notes === '1');

  setUi(initScope, initHints, initNotes);

  // auto-load als ?auto=1 of ?hub=1
  if (q.auto === '1' || q.hub === '1') {
    load();
  }
})();
</script>
</body>
</html>`;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  return router;
};


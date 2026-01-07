"use strict";

const express = require("express");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

module.exports = function a02DevTreeFactory() {
  const router = express.Router();

  function pickBackendRoot() {
    const cwd = process.cwd();
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
      const buf = Buffer.alloc(2400);
      const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
      await fh.close();
      const txt = buf.slice(0, bytesRead).toString("utf8");
      const lines = txt.split(/\r?\n/).slice(0, 14).map((s) => s.trim()).filter(Boolean);
      const hit =
        lines.find((l) => l.startsWith("// hint:")) ||
        lines.find((l) => l.startsWith("// ---")) ||
        lines.find((l) => l.startsWith("/*")) ||
        lines.find((l) => l.startsWith("//"));
      if (!hit) return "";
      return hit.replace(/^\/\//, "").trim().slice(0, 180);
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
      const withNotes = String(req.query.withNotes || "0") === "1";
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
  <title>Dev Tree</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root{color-scheme:light}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0}
    .bar{
      position:sticky;top:0;z-index:10;
      background:#fff;border-bottom:1px solid #e5e7eb;
      padding:10px 12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center
    }
    .btn{
      padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:750;cursor:pointer
    }
    .btn:hover{background:#f8fafc}
    select,input[type="text"]{padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:650}
    label{font-size:13px;color:#334155;display:flex;gap:6px;align-items:center}
    .pill{font-size:12px;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:999px;padding:6px 10px}
    .spacer{flex:1}
    .status{font-size:12px;color:#334155;min-height:16px;max-width:72ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .wrap{padding:12px}
    .tree{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:12px}
    details{margin-left:14px}
    summary{cursor:pointer;user-select:none}
    .file{margin-left:28px;display:flex;gap:10px;align-items:baseline}
    .meta{color:#64748b}
    .hint{color:#0f172a;opacity:.75}
    .err{color:#b91c1c}
    a{color:#0f172a}
    .small{font-size:12px;color:#64748b}
  </style>
</head>
<body>
  <div class="bar">
    <button class="btn" id="btnAll">Tree ALL</button>
    <button class="btn" id="btnQl">Tree QL</button>

    <span class="pill" id="pill">scope=all</span>

    <label><input type="checkbox" id="hints" /> hints</label>
    <label><input type="checkbox" id="notes" /> notes</label>
    <label class="small">depth <select id="depth">
      <option>4</option><option>6</option><option selected>8</option><option>10</option><option>12</option>
    </select></label>

    <input type="text" id="filter" placeholder="filter (bijv. a03)" />

    <button class="btn" id="reload">Reload</button>
    <button class="btn" id="raw">Raw JSON</button>

    <span class="spacer"></span>
    <span class="status" id="status"></span>
  </div>

  <div class="wrap">
    <div class="tree" id="tree"></div>
  </div>

<script>
(function(){
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
  var elTree = document.getElementById('tree');
  var elStatus = document.getElementById('status');
  var elPill = document.getElementById('pill');
  var elHints = document.getElementById('hints');
  var elNotes = document.getElementById('notes');
  var elDepth = document.getElementById('depth');
  var elFilter = document.getElementById('filter');

  var scope = (q.scope || 'all').toLowerCase();
  if (scope !== 'all' && scope !== 'ql') scope = 'all';

  elHints.checked = (q.withHints === '1' || q.hints === '1');
  elNotes.checked = (q.withNotes === '1' || q.notes === '1');
  if (q.maxDepth) elDepth.value = String(q.maxDepth);

  function setStatus(s){ elStatus.textContent = String(s || ''); }
  function setPill(){ elPill.textContent = 'scope=' + scope; }

  function clear(node){
    while(node.firstChild) node.removeChild(node.firstChild);
  }

  function fmtBytes(n){
    n = Number(n||0);
    if (n < 1024) return n + 'b';
    if (n < 1024*1024) return (n/1024).toFixed(1) + 'kb';
    return (n/(1024*1024)).toFixed(1) + 'mb';
  }

  function matchesFilter(text, f){
    if (!f) return true;
    return String(text||'').toLowerCase().indexOf(f.toLowerCase()) !== -1;
  }

  function renderNode(node, container, filterText){
    if (!node) return;

    if (node.type === 'dir') {
      var details = document.createElement('details');
      details.open = true;

      var sum = document.createElement('summary');
      var label = (node.name || node.path || '(dir)');
      sum.textContent = '📁 ' + label;
      details.appendChild(sum);

      if (node.error) {
        var err = document.createElement('div');
        err.className = 'err';
        err.textContent = node.error;
        details.appendChild(err);
      }

      var kids = Array.isArray(node.children) ? node.children : [];
      var any = false;

      for (var i=0;i<kids.length;i++){
        var k = kids[i];
        var hay = (k.path || k.name || '');
        if (k.type === 'file') hay += ' ' + (k.hint || '');
        if (k.type === 'dir') hay += ' ' + (k.name || '');
        if (!matchesFilter(hay, filterText)) continue;
        any = true;
        renderNode(k, details, filterText);
      }

      if (any) container.appendChild(details);
      return;
    }

    if (node.type === 'file') {
      var row = document.createElement('div');
      row.className = 'file';

      var a = document.createElement('span');
      a.textContent = '📄 ' + (node.name || node.path || '(file)');
      row.appendChild(a);

      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = (node.size != null ? fmtBytes(node.size) : '') + (node.mtime ? ('  ' + node.mtime.slice(0,19).replace('T',' ')) : '');
      row.appendChild(meta);

      if (node.hint) {
        var h = document.createElement('span');
        h.className = 'hint';
        h.textContent = node.hint;
        row.appendChild(h);
      }

      if (node.error) {
        var e = document.createElement('span');
        e.className = 'err';
        e.textContent = node.error;
        row.appendChild(e);
      }

      container.appendChild(row);
    }
  }

  function apiUrl(){
    var hints = elHints.checked ? '1' : '0';
    var notes = elNotes.checked ? '1' : '0';
    var depth = encodeURIComponent(elDepth.value || '8');
    return '/api/dev/tree?scope=' + encodeURIComponent(scope)
      + '&withHints=' + hints
      + '&withNotes=' + notes
      + '&maxDepth=' + depth
      + '&cachebust=' + Date.now();
  }

  async function load(){
    setPill();
    setStatus('loading…');
    clear(elTree);

    var url = apiUrl();
    try{
      var r = await fetch(url, { cache: 'no-store' });
      var j = await r.json();

      if (!r.ok || !j || !j.ok) {
        setStatus('error');
        var pre = document.createElement('pre');
        pre.textContent = JSON.stringify(j || { ok:false, status:r.status }, null, 2);
        elTree.appendChild(pre);
        return;
      }

      var filterText = (elFilter.value || '').trim();
      renderNode(j.tree, elTree, filterText);
      setStatus('ok');
    }catch(e){
      setStatus('error');
      var pre2 = document.createElement('pre');
      pre2.textContent = String(e && e.message ? e.message : e);
      elTree.appendChild(pre2);
    }
  }

  document.getElementById('btnAll').addEventListener('click', function(){ scope='all'; load(); });
  document.getElementById('btnQl').addEventListener('click', function(){ scope='ql'; load(); });
  document.getElementById('reload').addEventListener('click', load);
  elFilter.addEventListener('input', function(){ load(); });

  document.getElementById('raw').addEventListener('click', function(){
    window.open(apiUrl(), '_blank');
  });

  if (q.auto === '1' || q.hub === '1') load();
  else setPill();
})();
</script>
</body>
</html>`;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  return router;
};


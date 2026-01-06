"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");

function safeBool(x, def) {
  if (x == null) return def;
  const s = String(x).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function normalizeRel(p) {
  let s = String(p || "").trim();
  s = s.replace(/^\/+/, "");
  if (s.startsWith("app/")) s = s.slice(4);
  s = s.replace(/\\/g, "/");
  s = s.replace(/^\.\//, "");
  return s;
}

// Belangrijk: detecteer repoRoot correct voor Cloud Run
function detectRepoRoot() {
  const cwd = process.cwd();

  // Cloud Run: meestal /app met routes/ aanwezig
  const cloudRunSentinel = path.join(cwd, "routes");
  if (fs.existsSync(cloudRunSentinel)) return cwd;

  // Lokaal monorepo: __dirname = app/backend/routes  -> repoRoot = ../../../
  return path.join(__dirname, "..", "..", "..");
}

function readDirSafe(abs) {
  try {
    return fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return [];
  }
}

function statSafe(abs) {
  try {
    return fs.statSync(abs);
  } catch {
    return null;
  }
}

function defaultScopeRoots(scope, repoRoot) {
  const s = String(scope || "ql").toLowerCase();
  const root = path.resolve(repoRoot);

  if (s === "ql") {
    const dirs = ["routes", "services", "prompts", "data", "sql", "tools"];
    return dirs
      .map((d) => path.join(root, d))
      .filter((abs) => fs.existsSync(abs));
  }

  return [root];
}

function shouldSkip(rel) {
  const s = String(rel || "");

  // CRUCIAAL: root mag NOOIT geskipt worden (anders tree=null bij scope=all)
  if (s === "") return false;

  if (s.includes("/node_modules/")) return true;
  if (s.includes("/.git/")) return true;
  if (s.includes("/dist/")) return true;
  if (s.includes("/build/")) return true;
  if (s.includes("/.firebase/")) return true;
  if (s.includes("/.next/")) return true;
  if (s.includes("/coverage/")) return true;

  if (s.endsWith(".map")) return true;
  if (s.endsWith(".log")) return true;

  if (s.endsWith(".png") || s.endsWith(".jpg") || s.endsWith(".jpeg") || s.endsWith(".webp")) return true;
  if (s.endsWith(".zip") || s.endsWith(".7z") || s.endsWith(".tar") || s.endsWith(".gz")) return true;

  return false;
}

function buildFileNode(abs, rel, name, opts) {
  const st = statSafe(abs);
  if (!st) return null;

  const relBase = normalizeRel(rel);
  if (shouldSkip(relBase)) return null;

  const hint = opts.hintsMap[relBase] || null;
  const note = opts.notesMap[relBase] || null;

  return {
    type: "file",
    name,
    rel: relBase,
    mtime: st.mtime,
    hint,
    note,
    bytes: st.size,
  };
}

function buildDirNode(abs, rel, name, opts, depth) {
  const st = statSafe(abs);
  if (!st) return null;

  const relBase = normalizeRel(rel);
  if (shouldSkip(relBase)) return null;

  if (depth > 16) {
    const note = opts.notesMap[relBase] || null;
    return { type: "dir", name, rel: relBase, mtime: st.mtime, note, children: [] };
  }

  const entries = readDirSafe(abs);

  const children = [];
  for (const ent of entries) {
    const childAbs = path.join(abs, ent.name);
    const childRel = relBase ? path.join(relBase, ent.name) : ent.name;

    if (ent.isDirectory()) {
      const dn = buildDirNode(childAbs, childRel, ent.name, opts, depth + 1);
      if (dn) children.push(dn);
    } else if (ent.isFile()) {
      const fn = buildFileNode(childAbs, childRel, ent.name, opts);
      if (fn) children.push(fn);
    }
  }

  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });

  const note = opts.notesMap[relBase] || null;
  return { type: "dir", name, rel: relBase, mtime: st.mtime, note, children };
}

function buildTree(scope, withHints, withNotes) {
  const repoRoot = detectRepoRoot();
  const roots = defaultScopeRoots(scope, repoRoot);

  const opts = {
    hintsMap: withHints ? {} : {},
    notesMap: withNotes ? {} : {},
  };

  if (roots.length === 1 && path.resolve(roots[0]) === path.resolve(repoRoot)) {
    const rootName = path.basename(path.resolve(repoRoot)) || "repo";
    const node = buildDirNode(path.resolve(repoRoot), "", rootName, opts, 0);
    return { repoRoot, root: node };
  }

  const root = {
    type: "dir",
    name: "repo",
    rel: "",
    mtime: new Date(),
    note: null,
    children: [],
  };

  for (const abs of roots) {
    const nm = path.basename(abs);
    const rel = normalizeRel(path.relative(repoRoot, abs));
    const dn = buildDirNode(abs, rel, nm, opts, 0);
    if (dn) root.children.push(dn);
  }

  root.children.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return { repoRoot, root };
}

module.exports = function a02DevTreeFactory() {
  const router = express.Router();

  router.get("/api/dev/tree", (req, res) => {
    try {
      res.set("Cache-Control", "no-store");

      const scope = String(req.query.scope || "ql").toLowerCase() === "all" ? "all" : "ql";
      const withHints = safeBool(req.query.withHints, true);
      const notes = safeBool(req.query.notes, true);

      const out = buildTree(scope, withHints, notes);
      res.json({
        ok: true,
        scope,
        repoRoot: out.repoRoot,
        tree: out.root,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
    }
  });

  // UI met per-file buttons (Snapshot / View / Copy / History) via a09.devSnapshots endpoints
  router.get("/dev/tree/ui", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lessie Tree</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;background:#fff}
    header{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#f8fafc}
    .brand{font-weight:900}
    .sp{flex:1}
    .ctl{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .ctl label{font-size:12px;color:#334155;display:flex;gap:6px;align-items:center}
    select,input{cursor:pointer}
    .btn{padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer;font-weight:700}
    .btn:hover{background:#f1f5f9}
    .btn2{padding:6px 8px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer;font-weight:800;font-size:12px}
    .btn2:hover{background:#f8fafc}
    .status{font-size:12px;color:#334155;max-width:60ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    main{padding:10px 12px}
    .row{display:flex;gap:8px;align-items:flex-start;padding:4px 0}
    .row .label{display:flex;gap:8px;align-items:center;min-width:0}
    .twisty{border:0;background:transparent;cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;border-radius:6px}
    .twisty:hover{background:#e2e8f0}
    .ic{width:18px;display:inline-block}
    .name{font-weight:700}
    .rel{font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52vw}
    .children{padding-left:22px;border-left:1px dashed #e5e7eb;margin-left:6px}
    .metaWrap{margin-left:30px;margin-top:2px;display:flex;flex-direction:column;gap:4px}
    .meta{font-size:12px;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;padding:6px 8px;max-width:100%}
    .meta .k{font-weight:900;margin-right:6px;color:#334155}
    .meta.hint{background:#eff6ff;border-color:#bfdbfe}
    .meta.note{background:#f5f3ff;border-color:#ddd6fe}
    .muted{color:#64748b}
    .pill{font-size:12px;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:999px;padding:6px 10px}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}

    .drawer{
      position:fixed; top:0; right:0; height:100vh; width:min(860px, 96vw);
      background:#ffffff; border-left:1px solid #e5e7eb;
      box-shadow:-12px 0 30px rgba(15,23,42,.10);
      transform:translateX(110%); transition:transform .18s ease;
      z-index:50; display:flex; flex-direction:column;
    }
    .drawer.open{ transform:translateX(0); }
    .drawerHead{
      padding:12px 14px; border-bottom:1px solid #e5e7eb;
      display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    }
    .drawerTitle{ font-weight:900; }
    .drawerBody{ padding:12px 14px; overflow:auto; }
    .pre{
      white-space:pre; overflow:auto; max-height:62vh;
      border:1px solid #0b1220; border-radius:12px; padding:10px 12px;
      background:#0b1220; color:#e5e7eb; font-size:12px; line-height:1.45;
    }
    .hr{height:1px;background:#e5e7eb;margin:12px 0}
    .tbl{ width:100%; border-collapse:collapse; margin:8px 0 14px; }
    .tbl th,.tbl td{ text-align:left; padding:8px 6px; border-bottom:1px solid #e5e7eb; font-size:13px; vertical-align:top; }
    .tbl th{ font-size:12px; color:#334155; }
  </style>
</head>
<body>
  <header>
    <div class="brand">Tree</div>
    <span class="pill" id="pill">scope=ql</span>

    <div class="ctl">
      <label>scope
        <select id="scopeSel">
          <option value="ql">ql</option>
          <option value="all">all</option>
        </select>
      </label>

      <label><input type="checkbox" id="showHints" checked /> hints</label>
      <label><input type="checkbox" id="showNotes" checked /> notes</label>

      <button class="btn" id="reload">Reload</button>
      <button class="btn" id="openAll">Open all</button>
      <button class="btn" id="closeAll">Close all</button>
    </div>

    <div class="sp"></div>
    <span class="status" id="status"></span>
  </header>

  <main>
    <div id="out" class="muted">loading…</div>
  </main>

  <aside class="drawer" id="drawer">
    <div class="drawerHead">
      <div class="drawerTitle" id="drawerTitle">Drawer</div>
      <span class="muted" id="drawerStamp"></span>
      <div class="sp"></div>
      <button class="btn" id="drawerClose">Close</button>
    </div>
    <div class="drawerBody">
      <div id="drawerIntro" class="muted"></div>
      <div id="drawerContent" class="muted" style="margin-top:10px;">—</div>
    </div>
  </aside>

<script>
  const out = document.getElementById('out');
  const statusEl = document.getElementById('status');
  const scopeSel = document.getElementById('scopeSel');
  const showHints = document.getElementById('showHints');
  const showNotes = document.getElementById('showNotes');
  const btnReload = document.getElementById('reload');
  const btnOpenAll = document.getElementById('openAll');
  const btnCloseAll = document.getElementById('closeAll');
  const pill = document.getElementById('pill');

  const drawer = document.getElementById('drawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerStamp = document.getElementById('drawerStamp');
  const drawerIntro = document.getElementById('drawerIntro');
  const drawerContent = document.getElementById('drawerContent');
  const drawerClose = document.getElementById('drawerClose');

  function qs(name){
    const u = new URL(location.href);
    return u.searchParams.get(name);
  }

  function setFromQs(){
    const s = (qs("scope") || "ql").toLowerCase();
    scopeSel.value = (s === "all" ? "all" : "ql");
  }

  function updatePill(){
    pill.textContent = "scope=" + scopeSel.value
      + " hints=" + (showHints.checked ? "1" : "0")
      + " notes=" + (showNotes.checked ? "1" : "0");
  }

  function esc(s){
    return String(s==null?"":s)
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#39;");
  }

  async function fetchJson(url, opts){
    const r = await fetch(url, Object.assign({ cache: "no-store" }, opts || {}));
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch {}
    return { ok: r.ok, status: r.status, text: t, json: j };
  }

  function openDrawer(title, introHtml){
    drawerTitle.textContent = title || "Drawer";
    drawerIntro.innerHTML = introHtml || "";
    drawerContent.textContent = "loading…";
    drawerStamp.textContent = "";
    drawer.classList.add("open");
  }

  function closeDrawer(){
    drawer.classList.remove("open");
  }

  drawerClose.addEventListener("click", closeDrawer);

  function buildUrl(){
    const scope = scopeSel.value || "ql";
    const hints = showHints.checked ? "1" : "0";
    const notes = showNotes.checked ? "1" : "0";
    return "/api/dev/tree?scope=" + encodeURIComponent(scope)
      + "&withHints=" + hints
      + "&notes=" + notes;
  }

  function attachRowHandlers(){
    document.querySelectorAll('.row.dir .twisty').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.row.dir');
        const rel = row ? row.getAttribute('data-rel') : "";
        const kids = document.querySelector('.children[data-parent="' + CSS.escape(rel) + '"]');
        const open = btn.getAttribute('data-open') === "1";
        if (!kids) return;
        kids.style.display = open ? "none" : "block";
        btn.textContent = open ? "▸" : "▾";
        btn.setAttribute('data-open', open ? "0" : "1");
      });
    });
  }

  function setAll(open){
    document.querySelectorAll('.row.dir .twisty').forEach(btn => {
      const row = btn.closest('.row.dir');
      const rel = row ? row.getAttribute('data-rel') : "";
      const kids = document.querySelector('.children[data-parent="' + CSS.escape(rel) + '"]');
      if (!kids) return;
      kids.style.display = open ? "block" : "none";
      btn.textContent = open ? "▾" : "▸";
      btn.setAttribute('data-open', open ? "1" : "0");
    });
  }

  btnOpenAll.addEventListener("click", () => setAll(true));
  btnCloseAll.addEventListener("click", () => setAll(false));

  async function snapshotOne(pathRel){
    const payload = {
      scope: scopeSel.value || "ql",
      kind: "tree",
      note: "tree-single",
      pinnedPaths: [pathRel],
      includeContent: true
    };

    statusEl.textContent = "snapshot… " + pathRel;
    const r = await fetchJson("/api/dev/snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok || !r.json || !r.json.ok) {
      const msg = (r.json && r.json.error) ? r.json.error : r.text;
      throw new Error(msg || "snapshot failed");
    }
    return r.json;
  }

  async function loadHistory(pathRel){
    const r = await fetchJson("/api/dev/snapshots/file?path=" + encodeURIComponent(pathRel));
    if (!r.ok || !r.json || !r.json.ok) {
      const msg = (r.json && r.json.error) ? r.json.error : r.text;
      throw new Error(msg || "history failed");
    }
    return Array.isArray(r.json.items) ? r.json.items : [];
  }

  async function loadContent(pathRel, snapshotId){
    const url = "/api/dev/snapshots/file-content?path=" + encodeURIComponent(pathRel)
      + "&snapshot_id=" + encodeURIComponent(String(snapshotId));
    const r = await fetchJson(url);
    if (!r.ok || !r.json || !r.json.ok) {
      const msg = (r.json && r.json.error) ? r.json.error : r.text;
      throw new Error(msg || "file-content failed");
    }
    return r.json.item || {};
  }

  async function copyToClipboard(text){
    await navigator.clipboard.writeText(String(text || ""));
    statusEl.textContent = "copied ✓";
    setTimeout(() => { statusEl.textContent = ""; }, 1200);
  }

  function renderHistoryTable(pathRel, items){
    if (!items.length) {
      drawerContent.innerHTML = "<div class='muted'>Nog geen snapshots voor <code>"+esc(pathRel)+"</code>.</div>";
      return;
    }
    let html = "";
    html += "<div class='muted'>History voor <code>"+esc(pathRel)+"</code> (nieuwste eerst)</div>";
    html += "<table class='tbl'><thead><tr><th>when</th><th>snapshot</th><th>kind</th><th>scope</th><th>view</th></tr></thead><tbody>";
    html += items.map(it => {
      const sid = it.snapshot_id;
      const when = it.created_at || "";
      const kind = it.kind || "";
      const scope = it.scope || "";
      return "<tr>"
        + "<td>"+esc(when)+"</td>"
        + "<td>#"+esc(sid)+"</td>"
        + "<td>"+esc(kind)+"</td>"
        + "<td>"+esc(scope)+"</td>"
        + "<td><button class='btn2' data-view='1' data-path='"+esc(pathRel)+"' data-sid='"+esc(String(sid))+"'>View</button></td>"
        + "</tr>";
    }).join("");
    html += "</tbody></table>";
    drawerContent.innerHTML = html;

    Array.from(drawerContent.querySelectorAll("button[data-view='1']")).forEach(btn => {
      btn.addEventListener("click", async () => {
        const p = btn.getAttribute("data-path");
        const sid = Number(btn.getAttribute("data-sid"));
        openDrawer("Code view", "<div class='muted'><code>"+esc(p)+"</code> • snapshot <code>#"+esc(String(sid))+"</code></div>");
        try {
          const item = await loadContent(p, sid);
          const content = (item.content != null) ? String(item.content) : "";
          drawerContent.innerHTML =
            "<button class='btn2' id='copyBtn'>Copy code</button>"
            + "<div class='hr'></div>"
            + "<div class='pre mono' id='codeBox'></div>";
          document.getElementById("codeBox").textContent = content || "";
          document.getElementById("copyBtn").addEventListener("click", () => copyToClipboard(content || ""));
          drawerStamp.textContent = "loaded " + new Date().toLocaleTimeString("nl-NL");
        } catch (e) {
          drawerContent.textContent = String(e && e.message ? e.message : e);
        }
      });
    });
  }

  async function showFileActions(pathRel){
    openDrawer("File", "<div class='muted'><code>"+esc(pathRel)+"</code></div>");
    drawerContent.innerHTML =
      "<div class='row2'>"
      + "<button class='btn2' id='snapBtn'>Snapshot</button> "
      + "<button class='btn2' id='histBtn'>History</button>"
      + "</div>"
      + "<div class='hr'></div>"
      + "<div class='muted'>Tip: klik eerst Snapshot om zeker te zijn dat er full code in DB staat.</div>";

    document.getElementById("snapBtn").addEventListener("click", async () => {
      try {
        const j = await snapshotOne(pathRel);
        const sid = j.snapshot && j.snapshot.id ? j.snapshot.id : "?";
        openDrawer("Snapshot saved", "<div class='muted'><code>"+esc(pathRel)+"</code> • snapshot <code>#"+esc(String(sid))+"</code></div>");
        drawerContent.innerHTML =
          "<button class='btn2' id='viewBtn'>View</button> "
          + "<button class='btn2' id='copyBtn'>Copy</button> "
          + "<button class='btn2' id='histBtn2'>History</button>"
          + "<div class='hr'></div>"
          + "<div class='muted'>Saved ✓</div>";

        document.getElementById("histBtn2").addEventListener("click", async () => {
          openDrawer("History", "<div class='muted'><code>"+esc(pathRel)+"</code></div>");
          try {
            const items = await loadHistory(pathRel);
            renderHistoryTable(pathRel, items);
          } catch (e) {
            drawerContent.textContent = String(e && e.message ? e.message : e);
          }
        });

        document.getElementById("viewBtn").addEventListener("click", async () => {
          openDrawer("Code view", "<div class='muted'><code>"+esc(pathRel)+"</code> • snapshot <code>#"+esc(String(sid))+"</code></div>");
          try {
            const item = await loadContent(pathRel, sid);
            const content = (item.content != null) ? String(item.content) : "";
            drawerContent.innerHTML =
              "<button class='btn2' id='copyBtn3'>Copy code</button>"
              + "<div class='hr'></div>"
              + "<div class='pre mono' id='codeBox'></div>";
            document.getElementById("codeBox").textContent = content || "";
            document.getElementById("copyBtn3").addEventListener("click", () => copyToClipboard(content || ""));
          } catch (e) {
            drawerContent.textContent = String(e && e.message ? e.message : e);
          }
        });

        document.getElementById("copyBtn").addEventListener("click", async () => {
          try {
            const item = await loadContent(pathRel, sid);
            const content = (item.content != null) ? String(item.content) : "";
            await copyToClipboard(content || "");
          } catch (e) {
            statusEl.textContent = "copy failed";
            setTimeout(() => { statusEl.textContent = ""; }, 1400);
          }
        });

        drawerStamp.textContent = "saved " + new Date().toLocaleTimeString("nl-NL");
        statusEl.textContent = "saved ✓";
        setTimeout(() => { statusEl.textContent = ""; }, 1500);
      } catch (e) {
        drawerContent.textContent = String(e && e.message ? e.message : e);
        statusEl.textContent = "snapshot failed";
        setTimeout(() => { statusEl.textContent = ""; }, 2000);
      }
    });

    document.getElementById("histBtn").addEventListener("click", async () => {
      openDrawer("History", "<div class='muted'><code>"+esc(pathRel)+"</code></div>");
      try {
        const items = await loadHistory(pathRel);
        renderHistoryTable(pathRel, items);
        drawerStamp.textContent = "loaded " + new Date().toLocaleTimeString("nl-NL");
      } catch (e) {
        drawerContent.textContent = String(e && e.message ? e.message : e);
      }
    });
  }

  function mkMeta(item){
    const bits = [];
    if (showHints.checked && item.hint) bits.push('<div class="meta hint"><span class="k">hint</span>' + esc(item.hint) + '</div>');
    if (showNotes.checked && item.note) bits.push('<div class="meta note"><span class="k">note</span>' + esc(item.note) + '</div>');
    return bits.join("");
  }

  function row(item){
    const rel = esc(item.rel||"");
    const nm = esc(item.name||"");
    const relTxt = esc(item.rel||"");
    const isDir = item.type === "dir";

    let html = '';
    if (isDir) {
      html += '<div class="row dir" data-rel="'+relTxt+'">';
      html += '  <div class="label">';
      html += '    <button class="twisty" data-open="1">▾</button>';
      html += '    <span class="ic">📁</span>';
      html += '    <span class="name">'+nm+'</span>';
      html += '    <span class="rel mono">'+relTxt+'</span>';
      html += '  </div>';
      html += '</div>';
    } else {
      html += '<div class="row file" data-rel="'+relTxt+'">';
      html += '  <div class="label">';
      html += '    <span class="ic">📄</span>';
      html += '    <span class="name">'+nm+'</span>';
      html += '    <span class="rel mono">'+relTxt+'</span>';
      html += '  </div>';
      html += '  <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">';
      html += '    <button class="btn2" data-file-actions="1" data-path="'+relTxt+'">Snapshot/View/History</button>';
      html += '  </div>';
      html += '</div>';
    }

    const meta = mkMeta(item);
    if (meta) {
      html += '<div class="metaWrap">' + meta + '</div>';
    }

    if (isDir) {
      const kids = Array.isArray(item.children) ? item.children : [];
      html += '<div class="children" data-parent="'+relTxt+'">';
      html += kids.map(child => render(child)).join('');
      html += '</div>';
    }
    return html;
  }

  function render(item){
    return row(item);
  }

  function attachFileButtons(){
    Array.from(document.querySelectorAll("button[data-file-actions='1']")).forEach(btn => {
      btn.addEventListener("click", () => {
        const p = btn.getAttribute("data-path") || "";
        showFileActions(p).catch(()=>{});
      });
    });
  }

  async function load(){
    updatePill();
    statusEl.textContent = "loading…";
    try {
      const url = buildUrl();
      const r = await fetchJson(url);
      if (!r.ok || !r.json || !r.json.ok) throw new Error((r.json && r.json.error) ? r.json.error : r.text);

      const tree = r.json.tree;
      out.innerHTML = "";
      out.classList.remove("muted");

      if (!tree) {
        out.innerHTML = "<div class='muted'>tree=null (scope="+esc(scopeSel.value)+")</div>";
        statusEl.textContent = "";
        return;
      }

      out.innerHTML = render(tree);

      attachRowHandlers();
      attachFileButtons();
      setAll(true);

      statusEl.textContent = "ok";
      setTimeout(() => { statusEl.textContent = ""; }, 1200);
    } catch (e) {
      out.classList.add("muted");
      out.textContent = "load failed: " + (e && e.message ? e.message : String(e));
      statusEl.textContent = "failed";
    }
  }

  btnReload.addEventListener("click", () => load().catch(()=>{}));
  showHints.addEventListener("change", () => load().catch(()=>{}));
  showNotes.addEventListener("change", () => load().catch(()=>{}));
  scopeSel.addEventListener("change", () => load().catch(()=>{}));

  setFromQs();
  load().catch(()=>{});
</script>
</body>
</html>`);
  });

  return router;
};
`);

  return router;
};


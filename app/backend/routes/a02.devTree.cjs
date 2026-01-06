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

// Belangrijk: detecteer repoRoot correct voor Cloud Run (deploy vanuit app/backend)
function detectRepoRoot() {
  const cwd = process.cwd();

  // Cloud Run: cwd = app/backend  (verwacht dat routes hier bestaan)
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

  // In jouw setup is repoRoot meestal app/backend (Cloud Run) of monorepo root (lokaal).
  // We tonen bewust “backend” als hoofdmap niet; we werken repoRoot-relatief.
  // QL: vooral routes/services/prompts/data (je kunt dit later cureren)
  if (s === "ql") {
    const dirs = ["routes", "services", "prompts", "data", "sql", "tools"];
    return dirs
      .map((d) => path.join(root, d))
      .filter((abs) => fs.existsSync(abs));
  }

  // ALL: heel repoRoot (maar we filteren rommel)
  return [root];
}

function shouldSkip(rel) {
  const s = String(rel || "");
  if (!s) return true;

  // rommel / groot / secrets
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

  // depth guard (veiligheid)
  if (depth > 16) {
    const note = opts.notesMap[relBase] || null;
    return { type: "dir", name, rel: relBase, mtime: st.mtime, note, children: [] };
  }

  const entries = readDirSafe(abs);

  const children = [];
  for (const ent of entries) {
    const childAbs = path.join(abs, ent.name);
    const childRel = path.join(relBase, ent.name);

    if (ent.isDirectory()) {
      const dn = buildDirNode(childAbs, childRel, ent.name, opts, depth + 1);
      if (dn) children.push(dn);
    } else if (ent.isFile()) {
      const fn = buildFileNode(childAbs, childRel, ent.name, opts);
      if (fn) children.push(fn);
    }
  }

  // sort: dirs first, then files; alpha
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

  // Hints/Notes kun je later “echt” vullen (bijv. vanuit je Living Map output).
  // Voor nu: tree blijft werken, maar zonder extra meta als je het niet koppelt.
  const opts = {
    hintsMap: withHints ? {} : {},
    notesMap: withNotes ? {} : {},
  };

  if (roots.length === 1 && path.resolve(roots[0]) === path.resolve(repoRoot)) {
    // single-root “all”: toon repoRoot als dir
    const rootName = path.basename(path.resolve(repoRoot)) || "repo";
    const node = buildDirNode(path.resolve(repoRoot), "", rootName, opts, 0);
    return { repoRoot, root: node };
  }

  // multi-root (ql): maak een synthetic root met children
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

  // JSON: /api/dev/tree
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

  // UI: /dev/tree/ui  (met buttons: Snapshot / View / Copy / History)
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
    .brand{font-weight:800}
    .sp{flex:1}
    .ctl{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .ctl label{font-size:12px;color:#334155;display:flex;gap:6px;align-items:center}
    select,input{cursor:pointer}
    .btn{padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer;font-weight:650}
    .btn:hover{background:#f1f5f9}
    .btn2{padding:6px 8px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer;font-weight:700;font-size:12px}
    .btn2:hover{background:#f1f5f9}
    .status{font-size:12px;color:#334155;max-width:60ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    main{padding:10px 12px}
    .row{display:flex;gap:8px;align-items:flex-start;padding:4px 0}
    .row .label{display:flex;gap:8px;align-items:center;min-width:0}
    .twisty{border:0;background:transparent;cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;border-radius:6px}
    .twisty:hover{background:#e2e8f0}
    .ic{width:18px;display:inline-block}
    .name{font-weight:650}
    .rel{font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52vw}
    .children{padding-left:22px;border-left:1px dashed #e5e7eb;margin-left:6px}
    .metaWrap{margin-left:30px;margin-top:2px;display:flex;flex-direction:column;gap:6px}
    .meta{font-size:12px;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;padding:6px 8px;max-width:100%}
    .meta .k{font-weight:800;margin-right:6px;color:#334155}
    .meta.hint{background:#eff6ff;border-color:#bfdbfe}
    .meta.note{background:#f5f3ff;border-color:#ddd6fe}
    .muted{color:#64748b}
    .pill{font-size:12px;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:999px;padding:6px 10px}
    code{background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:1px 6px}

    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .drawer{
      position:fixed; top:0; right:0; height:100vh; width:min(820px, 96vw);
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
    .drawerTitle{ font-weight:850; }
    .drawerBody{ padding:12px 14px; overflow:auto; }
    .hr{height:1px;background:#e5e7eb;margin:12px 0}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
    .pre{
      white-space:pre; overflow:auto; max-height:62vh;
      border:1px solid #0b1220; border-radius:12px; padding:10px 12px; background:#0b1220; color:#e5e7eb;
      font-size:12px; line-height:1.45;
    }
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

      <label><input type="checkbox" id="showHints" checked /> toon hints</label>
      <label><input type="checkbox" id="showNotes" checked /> toon notes</label>

      <button class="btn" id="reload">Reload</button>
    </div>

    <div class="sp"></div>
    <span class="status" id="status"></span>
  </header>

  <main>
    <div id="out" class="muted">loading…</div>
  </main>

  <aside class="drawer" id="drawer">
    <div class="drawerHead">
      <div class="drawerTitle" id="drawerTitle">Code</div>
      <span class="muted" id="drawerStamp"></span>
      <div class="sp"></div>
      <button class="btn" id="drawerClose">Close</button>
    </div>
    <div class="drawerBody">
      <div id="drawerIntro" class="muted"></div>
      <div id="drawerContent" style="margin-top:10px;">—</div>
    </div>
  </aside>

<script>
  const out = document.getElementById('out');
  const statusEl = document.getElementById('status');
  const scopeSel = document.getElementById('scopeSel');
  const showHints = document.getElementById('showHints');
  const showNotes = document.getElementById('showNotes');
  const btnReload = document.getElementById('reload');
  const pill = document.getElementById('pill');

  const drawer = document.getElementById('drawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerStamp = document.getElementById('drawerStamp');
  const drawerIntro = document.getElementById('drawerIntro');
  const drawerContent = document.getElementById('drawerContent');
  const drawerClose = document.getElementById('drawerClose');

  function escHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

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
      + "  hints=" + (showHints.checked ? "1" : "0")
      + "  notes=" + (showNotes.checked ? "1" : "0");
  }

  async function fetchText(url, options){
    const r = await fetch(url, Object.assign({ cache: "no-store" }, options || {}));
    const t = await r.text();
    return { ok: r.ok, status: r.status, text: t };
  }

  async function fetchJson(url, options){
    const r = await fetch(url, Object.assign({ cache: "no-store" }, options || {}));
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch {}
    return { ok: r.ok, status: r.status, text: t, json: j };
  }

  function buildUrl(){
    const scope = scopeSel.value || "ql";
    const hints = showHints.checked ? "1" : "0";
    const notes = showNotes.checked ? "1" : "0";
    return "/api/dev/tree?scope=" + encodeURIComponent(scope)
      + "&withHints=" + hints
      + "&notes=" + notes;
  }

  function openDrawer(title, introHtml){
    drawerTitle.textContent = title || "Code";
    drawerIntro.innerHTML = introHtml || "";
    drawerContent.innerHTML = "<div class='muted'>loading…</div>";
    drawerStamp.textContent = "";
    drawer.classList.add("open");
  }

  function closeDrawer(){ drawer.classList.remove("open"); }
  drawerClose.addEventListener("click", closeDrawer);

  async function copyToClipboard(text){
    await navigator.clipboard.writeText(String(text || ""));
    statusEl.textContent = "copied ✓";
    setTimeout(() => { statusEl.textContent = ""; }, 1400);
  }

  async function loadFileHistory(path){
    const url = "/api/dev/snapshots/file?path=" + encodeURIComponent(path);
    const r = await fetchJson(url);
    if (!r.ok || !r.json || !r.json.ok) {
      drawerContent.textContent = "history failed: " + (r.json && r.json.error ? r.json.error : r.text);
      return;
    }
    const items = Array.isArray(r.json.items) ? r.json.items : [];
    if (!items.length) {
      drawerContent.innerHTML = "<div class='muted'>Nog geen snapshots voor <code>"+escHtml(path)+"</code>.</div>";
      return;
    }
    let html = "";
    html += "<div class='muted'>History voor <code>"+escHtml(path)+"</code> (nieuwste eerst)</div>";
    html += "<table class='tbl'><thead><tr><th>when</th><th>snapshot</th><th>kind</th><th>scope</th><th></th></tr></thead><tbody>";
    html += items.map(it => {
      const sid = it.snapshot_id;
      return "<tr>"
        + "<td>"+escHtml(it.created_at || "")+"</td>"
        + "<td>#"+escHtml(String(sid))+"</td>"
        + "<td>"+escHtml(it.kind || "")+"</td>"
        + "<td>"+escHtml(it.scope || "")+"</td>"
        + "<td><button class='btn2' data-view='1' data-path='"+escHtml(path)+"' data-sid='"+escHtml(String(sid))+"'>View</button></td>"
        + "</tr>";
    }).join("");
    html += "</tbody></table>";
    drawerContent.innerHTML = html;

    Array.from(drawerContent.querySelectorAll("button[data-view='1']")).forEach(btn => {
      btn.addEventListener("click", () => {
        const p = btn.getAttribute("data-path");
        const sid = Number(btn.getAttribute("data-sid"));
        openDrawer("Code view", "<div class='muted'><code>"+escHtml(p)+"</code> • snapshot <code>#"+escHtml(String(sid))+"</code></div>");
        loadFileContent(p, sid).catch(() => { drawerContent.textContent = "view failed"; });
      });
    });

    drawerStamp.textContent = "updated " + new Date().toLocaleTimeString("nl-NL");
  }

  async function loadFileContent(path, snapshotId){
    const url = "/api/dev/snapshots/file-content?path=" + encodeURIComponent(path) + "&snapshot_id=" + encodeURIComponent(String(snapshotId));
    const r = await fetchJson(url);
    if (!r.ok || !r.json || !r.json.ok) {
      drawerContent.textContent = "file-content failed: " + (r.json && r.json.error ? r.json.error : r.text);
      return;
    }
    const item = r.json.item || {};
    const content = (item.content != null) ? String(item.content) : "";
    const meta = "sha256 " + escHtml(item.sha256 || "-") + " • " + escHtml(String(item.bytes || "-")) + " bytes • " + escHtml(String(item.n_lines || "-")) + " lines";
    drawerContent.innerHTML =
      "<div class='muted'>"+meta+"</div>"
      + "<div class='hr'></div>"
      + "<div class='actions'>"
      + "<button class='btn2' id='copyCodeBtn'>Copy code</button>"
      + "</div>"
      + "<div style='height:10px'></div>"
      + "<div class='pre mono' id='codeBox'></div>";

    const codeBox = document.getElementById("codeBox");
    if (codeBox) codeBox.textContent = content || (item.head30 || "");
    const copyBtn = document.getElementById("copyCodeBtn");
    if (copyBtn) copyBtn.addEventListener("click", () => copyToClipboard(content || ""));
    drawerStamp.textContent = "loaded " + new Date().toLocaleTimeString("nl-NL");
  }

  async function latestSnapshotIdForPath(path){
    const url = "/api/dev/snapshots/file?path=" + encodeURIComponent(path);
    const r = await fetchJson(url);
    if (!r.ok || !r.json || !r.json.ok) return null;
    const items = Array.isArray(r.json.items) ? r.json.items : [];
    if (!items.length) return null;
    return Number(items[0].snapshot_id);
  }

  async function snapshotOne(path){
    statusEl.textContent = "snapshot…";
    const payload = {
      scope: scopeSel.value || "ql",
      kind: "tree",
      note: "tree-one",
      pinnedPaths: [path],
      includeContent: true
    };
    const r = await fetchJson("/api/dev/snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok || !r.json || !r.json.ok) {
      const msg = (r.json && r.json.error) ? r.json.error : r.text;
      statusEl.textContent = "snapshot failed: " + (msg || "");
      setTimeout(() => { statusEl.textContent = ""; }, 6000);
      return null;
    }
    statusEl.textContent = "saved ✓ (#" + String(r.json.snapshot.id) + ")";
    setTimeout(() => { statusEl.textContent = ""; }, 2000);
    return r.json.snapshot.id;
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

    document.querySelectorAll("button[data-act='snapshot']").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const p = btn.getAttribute("data-path") || "";
        const sid = await snapshotOne(p);
        if (sid) {
          openDrawer("Snapshot saved", "<div class='muted'><code>"+escHtml(p)+"</code> • snapshot <code>#"+escHtml(String(sid))+"</code></div>");
          loadFileContent(p, sid).catch(() => { drawerContent.textContent = "view failed"; });
        }
      });
    });

    document.querySelectorAll("button[data-act='view']").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const p = btn.getAttribute("data-path") || "";
        const sid = await latestSnapshotIdForPath(p);
        if (!sid) {
          openDrawer("No snapshots", "<div class='muted'>Nog geen snapshots voor <code>"+escHtml(p)+"</code>.</div>");
          drawerContent.innerHTML = "<div class='muted'>Klik eerst <b>Snapshot</b> op dit bestand.</div>";
          return;
        }
        openDrawer("Code view", "<div class='muted'><code>"+escHtml(p)+"</code> • latest snapshot <code>#"+escHtml(String(sid))+"</code></div>");
        loadFileContent(p, sid).catch(() => { drawerContent.textContent = "view failed"; });
      });
    });

    document.querySelectorAll("button[data-act='copy']").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const p = btn.getAttribute("data-path") || "";
        const sid = await latestSnapshotIdForPath(p);
        if (!sid) {
          statusEl.textContent = "no snapshot yet";
          setTimeout(() => { statusEl.textContent = ""; }, 1400);
          return;
        }
        const url = "/api/dev/snapshots/file-content?path=" + encodeURIComponent(p) + "&snapshot_id=" + encodeURIComponent(String(sid));
        const r = await fetchJson(url);
        if (!r.ok || !r.json || !r.json.ok) {
          statusEl.textContent = "copy failed";
          setTimeout(() => { statusEl.textContent = ""; }, 1400);
          return;
        }
        const content = (r.json.item && r.json.item.content != null) ? String(r.json.item.content) : "";
        await copyToClipboard(content || "");
      });
    });

    document.querySelectorAll("button[data-act='history']").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const p = btn.getAttribute("data-path") || "";
        openDrawer("History", "<div class='muted'><code>"+escHtml(p)+"</code></div>");
        loadFileHistory(p).catch(() => { drawerContent.textContent = "history failed"; });
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

  window.addEventListener("message", (ev) => {
    const d = ev && ev.data ? ev.data : null;
    if (!d || d.kind !== "LESSIE_TREE_CMD") return;
    if (d.cmd === "openAll") setAll(true);
    if (d.cmd === "closeAll") setAll(false);
  });

  async function load(){
    updatePill();
    statusEl.textContent = "loading…";
    try {
      const url = buildUrl();
      const treeRes = await fetchJson(url);
      if (!treeRes.ok || !treeRes.json || !treeRes.json.ok) {
        out.classList.add("muted");
        out.textContent = "tree failed: " + (treeRes.json && treeRes.json.error ? treeRes.json.error : treeRes.text);
        statusEl.textContent = "";
        return;
      }

      const tree = treeRes.json.tree;

      out.innerHTML = "";
      out.classList.remove("muted");

      function mkMeta(item){
        const bits = [];
        if (showHints.checked && item.hint) bits.push('<div class="meta hint"><span class="k">hint</span>' + escHtml(item.hint) + '</div>');
        if (showNotes.checked && item.note) bits.push('<div class="meta note"><span class="k">note</span>' + escHtml(item.note) + '</div>');
        return bits.join("");
      }

      function row(item){
        const rel = escHtml(item.rel||"");
        const nm = escHtml(item.name||"");
        const isDir = item.type === "dir";
        const twisty = isDir ? '<button class="twisty" data-open="0">▸</button>' : '<span class="ic"></span>';
        const icon = isDir ? "📁" : "📄";
        const meta = mkMeta(item);
        const actions = (!isDir)
          ? ('<div class="actions">'
              + '<button class="btn2" data-act="snapshot" data-path="'+rel+'">Snapshot</button>'
              + '<button class="btn2" data-act="view" data-path="'+rel+'">View</button>'
              + '<button class="btn2" data-act="copy" data-path="'+rel+'">Copy</button>'
              + '<button class="btn2" data-act="history" data-path="'+rel+'">History</button>'
            + '</div>')
          : '';

        return '<div class="row '+(isDir?'dir':'file')+'" data-rel="'+rel+'">'
          + '<div class="label">'
            + twisty
            + '<span class="ic">'+icon+'</span>'
            + '<span class="name">'+nm+'</span>'
            + '<span class="rel">'+rel+'</span>'
          + '</div>'
          + (actions ? '<div class="sp"></div>'+actions : '')
          + (meta ? ('<div class="metaWrap">'+meta+'</div>') : '')
        + '</div>';
      }

      function render(node){
        let html = row(node);
        if (node.type === "dir") {
          const rel = escHtml(node.rel||"");
          html += '<div class="children" data-parent="'+rel+'" style="display:none">';
          const kids = Array.isArray(node.children) ? node.children : [];
          for (const k of kids) html += render(k);
          html += '</div>';
        }
        return html;
      }

      out.innerHTML = render(tree);
      attachRowHandlers();
      statusEl.textContent = "";
    } catch (e) {
      out.classList.add("muted");
      out.textContent = "error: " + (e && e.message ? e.message : String(e));
      statusEl.textContent = "";
    }
  }

  setFromQs();
  updatePill();

  btnReload.addEventListener("click", () => load());
  scopeSel.addEventListener("change", () => load());
  showHints.addEventListener("change", () => load());
  showNotes.addEventListener("change", () => load());

  load();
</script>
</body>
</html>`);
  });

  return router;
};


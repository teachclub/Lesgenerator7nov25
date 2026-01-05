"use strict";

const express = require("express");

module.exports = function a03DevHubFactory() {
  const router = express.Router();

  const isRunAppDefault = "https://kleio9nov-578e4.web.app";

  const FRONTEND_BASE_OLD =
    (process.env.LESSIE_FRONTEND_BASE_OLD || process.env.LESSIE_FRONTEND_BASE || "").trim();

  const FRONTEND_BASE_QL =
    (process.env.LESSIE_FRONTEND_BASE_QL || process.env.LESSIE_FRONTEND_BASE || "").trim();

  router.get("/dev", (req, res) => {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lessie DevHub</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0}
    header{padding:12px 14px;border-bottom:1px solid #e5e7eb;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .brand{font-weight:800}
    .group{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .btn{
      padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;
      background:#fff;cursor:pointer;font-weight:650
    }
    .btn:hover{background:#f8fafc}
    .btn.active{background:#e2e8f0;border-color:#94a3b8}
    .spacer{flex:1}
    .status{font-size:12px;color:#334155;min-height:16px;max-width:72ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    main{padding:0}
    iframe{width:100%;height:calc(100vh - 158px);border:0}
    .ctl{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .ctl label{font-size:12px;color:#334155}
    select,input[type="checkbox"]{cursor:pointer}
    .pill{font-size:12px;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:999px;padding:6px 10px}
    .sep{width:1px;height:26px;background:#e5e7eb;margin:0 4px}

    .snapbar{
      padding:10px 14px;border-bottom:1px solid #e5e7eb;
      display:flex;gap:10px;align-items:center;flex-wrap:wrap
    }
    .snapbar .label{font-size:12px;color:#334155;font-weight:700}
    .snapbar select{min-width:min(620px, 92vw); padding:8px;border:1px solid #cbd5e1;border-radius:10px}
    .mini{font-size:12px;color:#475569}
    .list{
      padding:10px 14px;border-bottom:1px solid #e5e7eb; display:none;
    }
    .list.open{display:block}
    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px dashed #e5e7eb}
    .row:last-child{border-bottom:0}
    .path{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:#0f172a;max-width:72ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .row .btn{padding:6px 8px;border-radius:10px;font-weight:700;font-size:12px}

    .drawer{
      position:fixed; top:0; right:0; height:100vh; width:min(560px, 92vw);
      background:#ffffff; border-left:1px solid #e5e7eb;
      box-shadow:-12px 0 30px rgba(15,23,42,.10);
      transform:translateX(110%); transition:transform .18s ease;
      z-index:50; display:flex; flex-direction:column;
    }
    .drawer.open{ transform:translateX(0); }
    .drawerHead{
      padding:12px 14px; border-bottom:1px solid #e5e7eb;
      display:flex; align-items:center; gap:10px;
    }
    .drawerTitle{ font-weight:800; }
    .drawerBody{ padding:12px 14px; overflow:auto; }
    .muted{ color:#475569; font-size:12px; }
    .kpiGrid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0 14px; }
    .card{ border:1px solid #e5e7eb; border-radius:14px; padding:10px 12px; background:#fff; }
    .card .k{ font-size:12px; color:#475569; }
    .card .v{ font-size:18px; font-weight:850; color:#0f172a; margin-top:2px; }
    .tbl{ width:100%; border-collapse:collapse; margin:8px 0 14px; }
    .tbl th,.tbl td{ text-align:left; padding:8px 6px; border-bottom:1px solid #e5e7eb; font-size:13px; vertical-align:top; }
    .tbl th{ font-size:12px; color:#334155; }
    .link{ color:#0f172a; text-decoration:underline; text-underline-offset:2px; }
    .small{ font-size:12px; color:#475569; }
    .row2{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    code{background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:1px 6px}
    pre{white-space:pre-wrap;word-break:break-word}
  </style>
</head>
<body>
  <header>
    <div class="brand">Lessie DevHub</div>

    <div class="group" id="buttons">
      <button class="btn active" data-mode="map" data-scope="all">Living Map Lessie 2000</button>
      <button class="btn" data-mode="map" data-scope="ql">Living Map QL</button>

      <span class="sep"></span>

      <button class="btn" data-mode="tree" data-scope="all">Tree Lessie 2000</button>
      <button class="btn" data-mode="tree" data-scope="ql">Tree QL</button>

      <span class="sep"></span>

      <button class="btn" data-mode="live" data-target="old">Lessie 2000 Live</button>
      <button class="btn" data-mode="live" data-target="ql">Lessie QL Live</button>
    </div>

    <span class="pill" id="pill">scope=all</span>

    <div class="ctl">
      <label><input type="checkbox" id="withHints" checked /> hints</label>
      <label><input type="checkbox" id="withNotes" checked /> notes</label>
      <label><input type="checkbox" id="includeMin" /> +tree(min)</label>
    </div>

    <div class="spacer"></div>

    <button class="btn" id="metricsBtn">Metrics</button>
    <button class="btn" id="openAll">Open all</button>
    <button class="btn" id="closeAll">Close all</button>
    <button class="btn" id="copyAll">Copy snapshot</button>
    <span class="status" id="status"></span>
  </header>

  <div class="snapbar">
    <span class="label">Snapshot selectie (max 20)</span>
    <select id="filePick" multiple size="6"></select>
    <label class="mini"><input type="checkbox" id="includeFullCode" checked /> full code</label>
    <input id="snapLabel" style="padding:8px;border:1px solid #cbd5e1;border-radius:10px" placeholder="label (bv: ql-safe)" />
    <button class="btn" id="takeSnap">Snapshot</button>
    <span class="mini" id="pickInfo"></span>
  </div>

  <div class="list" id="snapList"></div>

  <main>
    <iframe id="frame" src="/api/dev/sitemap?scope=all"></iframe>
  </main>

  <aside class="drawer" id="drawer">
    <div class="drawerHead">
      <div class="drawerTitle">Metrics</div>
      <span class="muted" id="metricsStamp"></span>
      <div class="spacer"></div>
      <button class="btn" id="metricsRefresh">Refresh</button>
      <button class="btn" id="metricsClose">Close</button>
    </div>
    <div class="drawerBody">
      <div class="muted">Live uit PostgreSQL + usage_events (top bronnen = event <code>source_selected</code>).</div>
      <div id="metricsContent" class="small" style="margin-top:10px;">Klik <b>Refresh</b> of open <b>Metrics</b>.</div>
    </div>
  </aside>

<script>
  function escHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  const frame = document.getElementById('frame');
  const btns = Array.from(document.querySelectorAll('#buttons .btn'));
  const statusEl = document.getElementById('status');

  const withHints = document.getElementById('withHints');
  const withNotes = document.getElementById('withNotes');
  const includeMin = document.getElementById('includeMin');
  const pill = document.getElementById('pill');

  const btnCopy = document.getElementById('copyAll');
  const btnOpen = document.getElementById('openAll');
  const btnClose = document.getElementById('closeAll');

  const filePick = document.getElementById("filePick");
  const pickInfo = document.getElementById("pickInfo");
  const includeFullCode = document.getElementById("includeFullCode");
  const snapLabel = document.getElementById("snapLabel");
  const takeSnap = document.getElementById("takeSnap");
  const snapList = document.getElementById("snapList");

  const metricsBtn = document.getElementById('metricsBtn');
  const drawer = document.getElementById('drawer');
  const metricsClose = document.getElementById('metricsClose');
  const metricsRefresh = document.getElementById('metricsRefresh');
  const metricsContent = document.getElementById('metricsContent');
  const metricsStamp = document.getElementById('metricsStamp');

  const ENV_OLD = ${JSON.stringify(FRONTEND_BASE_OLD)};
  const ENV_QL  = ${JSON.stringify(FRONTEND_BASE_QL)};
  const DEFAULT_RUNAPP = ${JSON.stringify(isRunAppDefault)};

  function baseFromEnvOrDefault(envVal){
    const v = (envVal || "").trim();
    if (v) return v.replace(/\\/$/, "");
    if (location.origin.includes("run.app")) return DEFAULT_RUNAPP;
    return location.origin;
  }

  const FRONTEND_OLD = baseFromEnvOrDefault(ENV_OLD);
  const FRONTEND_QL  = baseFromEnvOrDefault(ENV_QL);

  let current = { mode: "map", scope: "all" };
  let allFilesCache = { all: [], ql: [] };

  function setActive(button){
    btns.forEach(x => x.classList.remove('active'));
    button.classList.add('active');
  }

  function updatePill(){
    pill.textContent = "scope=" + (current.scope || "-") + "  mode=" + current.mode;
  }

  function stamp(){ return new Date().toISOString(); }

  function livingMapUrl(scope){
    return "/api/dev/sitemap?scope=" + encodeURIComponent(scope || "all");
  }

  function treeUiUrl(scope){
    return "/dev/tree/ui?hub=1&scope=" + encodeURIComponent(scope || "ql");
  }

  function treeJsonUrl(scope, min){
    const hints = withHints.checked ? "1" : "0";
    const notes = withNotes.checked ? "1" : "0";
    return "/api/dev/tree?scope=" + encodeURIComponent(scope || "ql")
      + "&withHints=" + (min ? "0" : hints)
      + "&notes=" + (min ? "0" : notes);
  }

  function liveUrl(target){
    if (target === "ql") return FRONTEND_QL + "/lab/questions";
    return FRONTEND_OLD + "/";
  }

  btns.forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.mode;
    if (mode === "map") {
      current = { mode: "map", scope: b.dataset.scope || "all" };
      frame.src = livingMapUrl(current.scope);
      refreshFileDropdown().catch(()=>{});
    } else if (mode === "tree") {
      current = { mode: "tree", scope: b.dataset.scope || "ql" };
      frame.src = treeUiUrl(current.scope);
      refreshFileDropdown().catch(()=>{});
    } else if (mode === "live") {
      current = { mode: "live", scope: "-" };
      frame.src = liveUrl(b.dataset.target || "old");
    }
    setActive(b);
    updatePill();
  }));

  updatePill();

  async function fetchText(url){
    const r = await fetch(url, { cache: "no-store" });
    const t = await r.text();
    return { ok: r.ok, status: r.status, text: t };
  }

  async function fetchJson(url, opt){
    const r = await fetch(url, Object.assign({ cache: "no-store" }, opt || {}));
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch {}
    return { ok: r.ok, status: r.status, text: t, json: j };
  }

  function fence(title){ return "\\n\\n===== " + title + " =====\\n"; }

  function postTreeCmd(cmd){
    try {
      frame.contentWindow.postMessage({ kind: "LESSIE_TREE_CMD", cmd }, "*");
      statusEl.textContent = cmd + " sent";
      setTimeout(() => { statusEl.textContent = ""; }, 1200);
    } catch (e) {
      statusEl.textContent = "Tree not ready";
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    }
  }

  btnOpen.addEventListener('click', () => {
    if (current.mode !== "tree") {
      const treeAllBtn = btns.find(x => x.dataset.mode === "tree" && x.dataset.scope === "all");
      if (treeAllBtn) treeAllBtn.click();
      setTimeout(() => postTreeCmd("openAll"), 500);
      return;
    }
    postTreeCmd("openAll");
  });

  btnClose.addEventListener('click', () => {
    if (current.mode !== "tree") {
      const treeAllBtn = btns.find(x => x.dataset.mode === "tree" && x.dataset.scope === "all");
      if (treeAllBtn) treeAllBtn.click();
      setTimeout(() => postTreeCmd("closeAll"), 500);
      return;
    }
    postTreeCmd("closeAll");
  });

  btnCopy.addEventListener('click', async () => {
    statusEl.textContent = "building snapshot…";
    btnCopy.disabled = true;

    const scope = (current.mode === "tree" || current.mode === "map") ? (current.scope || "all") : "all";

    try {
      const out = [];
      out.push("LESSIE_SNAPSHOT " + stamp());
      out.push("HOST " + location.origin);
      out.push("MODE " + current.mode);
      out.push("SCOPE " + scope + " (tree hints=" + (withHints.checked?1:0) + " notes=" + (withNotes.checked?1:0) + ")");
      out.push("FRONTEND_OLD " + FRONTEND_OLD);
      out.push("FRONTEND_QL " + FRONTEND_QL);
      out.push("NOTE: paste this whole block into ChatGPT.");

      const runtime = await fetchText("/api/health");
      out.push(fence("RUNTIME /api/health"));
      out.push(runtime.text);

      const map = await fetchText(livingMapUrl(scope));
      out.push(fence("LIVING_MAP " + livingMapUrl(scope)));
      out.push(map.text);

      const tree = await fetchText(treeJsonUrl(scope, false));
      out.push(fence("DEV_TREE_JSON " + treeJsonUrl(scope, false)));
      out.push(tree.text);

      if (includeMin.checked) {
        const treeMin = await fetchText(treeJsonUrl(scope, true));
        out.push(fence("DEV_TREE_JSON_MIN " + treeJsonUrl(scope, true)));
        out.push(treeMin.text);
      }

      const db = await fetchText("/api/dev/db-status");
      out.push(fence("DB_STATUS /api/dev/db-status"));
      out.push(db.text);

      const snap = out.join("\\n");
      await navigator.clipboard.writeText(snap);

      statusEl.textContent = "copied ✓ (paste into ChatGPT)";
    } catch (e) {
      statusEl.textContent = "copy failed: " + (e && e.message ? e.message : String(e));
    } finally {
      btnCopy.disabled = false;
      setTimeout(() => { statusEl.textContent = ""; }, 8000);
    }
  });

  function walkCollectFiles(x, out){
    if (!x) return;
    if (Array.isArray(x)) {
      x.forEach(v => walkCollectFiles(v, out));
      return;
    }
    if (typeof x === "object") {
      const path = typeof x.path === "string" ? x.path : "";
      const kind = typeof x.kind === "string" ? x.kind : (typeof x.type === "string" ? x.type : "");
      if (path && (kind === "file" || kind === "leaf" || kind === "source" || kind === "code")) {
        out.push(path);
      }
      for (const k of Object.keys(x)) walkCollectFiles(x[k], out);
    }
  }

  async function loadFilesForScope(scope){
    const r = await fetchJson(treeJsonUrl(scope || "all", true));
    if (!r.ok || !r.json) return [];
    const out = [];
    walkCollectFiles(r.json, out);
    const uniq = Array.from(new Set(out.map(s => String(s).trim()).filter(Boolean)));
    uniq.sort((a,b) => a.localeCompare(b));
    return uniq;
  }

  function selectedPaths(){
    return Array.from(filePick.selectedOptions).map(o => o.value).slice(0, 20);
  }

  function renderPickInfo(){
    const n = Array.from(filePick.selectedOptions).length;
    pickInfo.textContent = n + "/20 geselecteerd";
    if (n > 20) pickInfo.textContent = "teveel geselecteerd";
  }

  async function refreshFileDropdown(){
    const scope = (current.scope === "ql") ? "ql" : "all";
    if (!allFilesCache[scope].length) {
      statusEl.textContent = "loading files…";
      const files = await loadFilesForScope(scope);
      allFilesCache[scope] = files;
      statusEl.textContent = "";
    }

    const files = allFilesCache[scope];
    filePick.innerHTML = files.map(p => '<option value="'+escHtml(p)+'">'+escHtml(p)+'</option>').join("");

    renderPickInfo();
  }

  filePick.addEventListener("change", () => {
    const opts = Array.from(filePick.options);
    let picked = opts.filter(o => o.selected);
    if (picked.length > 20) {
      picked.slice(20).forEach(o => o.selected = false);
    }
    renderPickInfo();
  });

  async function openCode(snapshotId, path){
    const u = "/api/dev/snapshots/file-content?path=" + encodeURIComponent(path) + "&snapshot_id=" + encodeURIComponent(String(snapshotId));
    window.open(u, "_blank", "noopener");
  }

  async function copyCode(snapshotId, path){
    const u = "/api/dev/snapshots/file-content?path=" + encodeURIComponent(path) + "&snapshot_id=" + encodeURIComponent(String(snapshotId));
    const r = await fetchJson(u);
    if (!r.ok || !r.json || !r.json.ok) {
      statusEl.textContent = "copy failed: " + (r.json && r.json.error ? r.json.error : r.text);
      setTimeout(()=>statusEl.textContent="", 5000);
      return;
    }
    const content = (r.json.item && typeof r.json.item.content === "string") ? r.json.item.content : "";
    await navigator.clipboard.writeText(content);
    statusEl.textContent = "copied ✓ " + path;
    setTimeout(()=>statusEl.textContent="", 2500);
  }

  function historyUrl(path){
    return "/api/dev/snapshots/file?path=" + encodeURIComponent(path);
  }

  function renderSnapButtons(snapshotId, saved){
    const okItems = (saved || []).filter(x => x && x.ok === true && x.path);
    if (!okItems.length) {
      snapList.classList.add("open");
      snapList.innerHTML = '<div class="mini">Geen files opgeslagen (check paths).</div>';
      return;
    }
    snapList.classList.add("open");
    snapList.innerHTML =
      '<div class="mini">Snapshot #' + escHtml(snapshotId) + ' — per bestand: code / kopie / history</div>'
      + okItems.map(it => {
        const p = it.path;
        return '<div class="row">'
          + '<div class="path" title="'+escHtml(p)+'">'+escHtml(p)+'</div>'
          + '<button class="btn" data-act="open" data-path="'+escHtml(p)+'" data-sid="'+escHtml(snapshotId)+'">Code</button>'
          + '<button class="btn" data-act="copy" data-path="'+escHtml(p)+'" data-sid="'+escHtml(snapshotId)+'">Copy</button>'
          + '<a class="btn link" style="text-decoration:none" target="_blank" rel="noopener" href="'+historyUrl(p)+'">History</a>'
          + '</div>';
      }).join("");

    snapList.querySelectorAll("button[data-act]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const act = btn.getAttribute("data-act");
        const p = btn.getAttribute("data-path");
        const sid = btn.getAttribute("data-sid");
        if (!p || !sid) return;
        if (act === "open") await openCode(sid, p);
        if (act === "copy") await copyCode(sid, p);
      });
    });
  }

  takeSnap.addEventListener("click", async () => {
    const scope = (current.scope === "ql") ? "ql" : "all";
    const paths = selectedPaths();
    if (!paths.length) {
      statusEl.textContent = "selecteer 1–20 files";
      setTimeout(()=>statusEl.textContent="", 3000);
      return;
    }

    takeSnap.disabled = true;
    statusEl.textContent = "snapshot…";

    try {
      const payload = {
        scope,
        label: (snapLabel.value || "").trim() || ("manual-" + scope),
        pinnedPaths: paths,
        includeContent: includeFullCode.checked === true
      };
      const r = await fetchJson("/api/dev/snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok || !r.json || !r.json.ok) {
        statusEl.textContent = "snapshot failed: " + (r.json && r.json.error ? r.json.error : r.text);
        return;
      }

      const sid = r.json.snapshot && r.json.snapshot.id ? r.json.snapshot.id : "?";
      renderSnapButtons(sid, r.json.saved || []);
      statusEl.textContent = "saved ✓ snapshot #" + sid;
      setTimeout(()=>statusEl.textContent="", 5000);
    } catch (e) {
      statusEl.textContent = "snapshot failed: " + (e && e.message ? e.message : String(e));
    } finally {
      takeSnap.disabled = false;
    }
  });

  async function boot(){
    await refreshFileDropdown().catch(()=>{});
  }
  boot();

  function fmtInt(x){
    const n = Number(x);
    if (!Number.isFinite(n)) return String(x);
    return n.toLocaleString("nl-NL");
  }

  function htmlKpiCards(counts){
    const map = {};
    (counts || []).forEach(x => map[x.kpi] = x.n);
    const cards = [
      { k: "Hoofdvragen", v: map.questions ?? "-" },
      { k: "Deelvragen", v: map.subquestions ?? "-" },
      { k: "Bronnen totaal", v: map.sources_total ?? "-" },
      { k: "Source entities", v: map.source_entities ?? "-" },
    ];
    return '<div class="kpiGrid">' + cards.map(c =>
      '<div class="card"><div class="k">'+escHtml(c.k)+'</div><div class="v">'+escHtml(fmtInt(c.v))+'</div></div>'
    ).join('') + '</div>';
  }

  async function loadMetrics(){
    metricsStamp.textContent = "";
    metricsContent.textContent = "loading…";

    const summary = await fetchJson("/api/dev/metrics/summary");
    if (!summary.ok || !summary.json || !summary.json.ok) {
      metricsContent.textContent = "summary failed: " + (summary.json && summary.json.error ? summary.json.error : summary.text);
      return;
    }

    const top = await fetchJson("/api/dev/metrics/top-sources?limit=20");
    const topItems = (top.ok && top.json && top.json.ok) ? (top.json.items || []) : [];

    const counts = summary.json.counts || [];
    const providers = summary.json.providers || [];

    let html = '';
    html += '<div class="row2"><span class="pill">DB</span><span class="small">'+escHtml(summary.json.timestamp || '')+'</span></div>';
    html += htmlKpiCards(counts);

    html += '<div class="row2" style="margin-top:2px;"><span class="pill">Providers</span></div>';
    html += '<table class="tbl"><thead><tr><th>provider</th><th>n</th></tr></thead><tbody>'
      + providers.map(p => '<tr><td>'+escHtml(p.provider)+'</td><td>'+escHtml(fmtInt(p.n))+'</td></tr>').join('')
      + '</tbody></table>';

    html += '<div class="row2" style="margin-top:2px;"><span class="pill">Top gebruikte bronnen</span><span class="small">(event: source_selected)</span></div>';
    if (!topItems.length) {
      html += '<div class="small">Nog geen usage events (of nog geen match met sources).</div>';
    } else {
      html += '<table class="tbl"><thead><tr><th>uses</th><th>provider</th><th>bron</th></tr></thead><tbody>'
        + topItems.map(it => {
          const id = it.source_id;
          const title = it.title || '(no title)';
          const href = '/api/dev/source/' + encodeURIComponent(id);
          return '<tr>'
            + '<td>'+escHtml(fmtInt(it.uses))+'</td>'
            + '<td>'+escHtml(it.provider || '-')+'</td>'
            + '<td><a class="link" target="_blank" rel="noopener" href="'+href+'">#'+escHtml(id)+' — '+escHtml(title)+'</a></td>'
            + '</tr>';
        }).join('')
        + '</tbody></table>';
    }

    metricsContent.innerHTML = html;
    metricsStamp.textContent = "updated " + new Date().toLocaleTimeString("nl-NL");
  }

  function openDrawer(){
    drawer.classList.add("open");
    loadMetrics().catch(() => { metricsContent.textContent = "metrics failed"; });
  }
  function closeDrawer(){
    drawer.classList.remove("open");
  }

  metricsBtn.addEventListener('click', () => {
    if (drawer.classList.contains("open")) closeDrawer();
    else openDrawer();
  });
  metricsClose.addEventListener('click', closeDrawer);
  metricsRefresh.addEventListener('click', () => loadMetrics().catch(() => { metricsContent.textContent = "metrics failed"; }));
</script>
</body>
</html>`;

    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  return router;
};


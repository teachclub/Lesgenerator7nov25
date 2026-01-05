"use strict";

const express = require("express");

module.exports = function a03DevHubFactory() {
  const router = express.Router();

  const isRunAppDefault = "https://kleio9nov-578e4.web.app";

  const FRONTEND_BASE_OLD =
    (process.env.LESSIE_FRONTEND_BASE_OLD || process.env.LESSIE_FRONTEND_BASE || "").trim();

  const FRONTEND_BASE_QL =
    (process.env.LESSIE_FRONTEND_BASE_QL || process.env.LESSIE_FRONTEND_BASE || "").trim();

  // ---------------- TOP20 (curated) ----------------
  // Let op: paths zijn repo-root relatief zoals a09.devSnapshots verwacht (dus zonder "app/backend/").
  // Jij wil geen "alle bestanden" dropdown. Alleen deze curated Top20 per scope.
  const TOP20_ALL = [
    "server.cjs",
    "routes/a01.health.cjs",
    "routes/a02.devTree.cjs",
    "routes/a03.devHub.cjs",
    "routes/a04.devDbStatus.cjs",
    "routes/a06.chips.cjs",
    "routes/a07.usageEvents.cjs",
    "routes/a09.devSnapshots.cjs",
    "routes/a12.search.cjs",
    "routes/a13.searchPreset.cjs",
    "routes/a14.sourceDetail.cjs",
    "routes/a15.imageProxy.cjs",
    "routes/a16.questionGen.cjs",
    "routes/a17.contextGen.cjs",
    "routes/searchMatch.cjs",
    "routes/searchMatchV2.cjs",
    "routes/a35.proposals-v2.cjs",
    "routes/lessonV2.step1.cjs",
    "routes/lessonV2.step2.cjs",
    "routes/lessonV2.step4.cjs",
  ];

  // QL = focust set (QuestionLab / matching / dev tooling)
  const TOP20_QL = [
    "server.cjs",
    "routes/a03.devHub.cjs",
    "routes/a02.devTree.cjs",
    "routes/a09.devSnapshots.cjs",
    "routes/a04.devDbStatus.cjs",
    "routes/a07.usageEvents.cjs",
    "routes/a14.sourceDetail.cjs",
    "routes/a15.imageProxy.cjs",
    "routes/a16.questionGen.cjs",
    "routes/a17.contextGen.cjs",
    "routes/searchMatch.cjs",
    "routes/searchMatchV2.cjs",
    "routes/a12.search.cjs",
    "routes/a13.searchPreset.cjs",
    "routes/a35.proposals-v2.cjs",
    "routes/a22.thesaurus.cjs",
    "routes/a24.chipSuggest.cjs",
    "routes/a50.dbBrowser.cjs",
    "routes/a06.chips.cjs",
    "routes/a01.health.cjs",
  ];
  // ------------------------------------------------

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
    iframe{width:100%;height:calc(100vh - 112px);border:0}
    .ctl{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .ctl label{font-size:12px;color:#334155}
    select,input[type="checkbox"]{cursor:pointer}
    .pill{font-size:12px;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:999px;padding:6px 10px}
    .sep{width:1px;height:26px;background:#e5e7eb;margin:0 4px}

    .drawer{
      position:fixed; top:0; right:0; height:100vh; width:min(720px, 96vw);
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

    .fileCard{border:1px solid #e5e7eb;border-radius:14px;padding:10px 12px;margin:8px 0;background:#fff}
    .fileHead{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .filePath{font-weight:800}
    .btn2{padding:7px 9px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer;font-weight:650;font-size:12px}
    .btn2:hover{background:#f8fafc}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
    .pre{
      white-space:pre; overflow:auto; max-height:52vh;
      border:1px solid #e5e7eb; border-radius:12px; padding:10px 12px; background:#0b1220; color:#e5e7eb;
      font-size:12px; line-height:1.45;
    }
    .hr{height:1px;background:#e5e7eb;margin:10px 0}
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

    <button class="btn" id="snapTopBtn">Top20 snapshot</button>
    <button class="btn" id="metricsBtn">Metrics</button>

    <button class="btn" id="openAll">Open all</button>
    <button class="btn" id="closeAll">Close all</button>
    <button class="btn" id="copyAll">Copy snapshot</button>
    <span class="status" id="status"></span>
  </header>

  <main>
    <iframe id="frame" src="/api/dev/sitemap?scope=all"></iframe>
  </main>

  <aside class="drawer" id="drawer">
    <div class="drawerHead">
      <div class="drawerTitle" id="drawerTitle">Metrics</div>
      <span class="muted" id="drawerStamp"></span>
      <div class="spacer"></div>
      <button class="btn" id="drawerRefresh">Refresh</button>
      <button class="btn" id="drawerClose">Close</button>
    </div>
    <div class="drawerBody">
      <div id="drawerIntro" class="muted">Live uit PostgreSQL + usage_events (top bronnen = event <code>source_selected</code>).</div>
      <div id="drawerContent" class="small" style="margin-top:10px;">Klik <b>Refresh</b> of open <b>Metrics</b>.</div>
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

  const snapTopBtn = document.getElementById('snapTopBtn');

  const drawer = document.getElementById('drawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerStamp = document.getElementById('drawerStamp');
  const drawerClose = document.getElementById('drawerClose');
  const drawerRefresh = document.getElementById('drawerRefresh');
  const drawerContent = document.getElementById('drawerContent');
  const drawerIntro = document.getElementById('drawerIntro');

  const metricsBtn = document.getElementById('metricsBtn');

  const ENV_OLD = ${JSON.stringify(FRONTEND_BASE_OLD)};
  const ENV_QL  = ${JSON.stringify(FRONTEND_BASE_QL)};
  const DEFAULT_RUNAPP = ${JSON.stringify(isRunAppDefault)};

  const TOP20_ALL = ${JSON.stringify(TOP20_ALL)};
  const TOP20_QL  = ${JSON.stringify(TOP20_QL)};

  function baseFromEnvOrDefault(envVal){
    const v = (envVal || "").trim();
    if (v) return v.replace(/\\/$/, "");
    if (location.origin.includes("run.app")) return DEFAULT_RUNAPP;
    return location.origin;
  }

  const FRONTEND_OLD = baseFromEnvOrDefault(ENV_OLD);
  const FRONTEND_QL  = baseFromEnvOrDefault(ENV_QL);

  let current = { mode: "map", scope: "all" };

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
    } else if (mode === "tree") {
      current = { mode: "tree", scope: b.dataset.scope || "ql" };
      frame.src = treeUiUrl(current.scope);
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

  async function fetchJson(url, opts){
    const r = await fetch(url, Object.assign({ cache: "no-store" }, opts || {}));
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

  function openDrawer(title, introHtml){
    drawerTitle.textContent = title;
    drawerIntro.innerHTML = introHtml || "";
    drawer.classList.add("open");
  }
  function closeDrawer(){
    drawer.classList.remove("open");
  }
  drawerClose.addEventListener('click', closeDrawer);

  // ---------- METRICS ----------
  async function loadMetrics(){
    drawerStamp.textContent = "";
    drawerContent.textContent = "loading…";

    const summary = await fetchJson("/api/dev/metrics/summary");
    if (!summary.ok || !summary.json || !summary.json.ok) {
      drawerContent.textContent = "summary failed: " + (summary.json && summary.json.error ? summary.json.error : summary.text);
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

    drawerContent.innerHTML = html;
    drawerStamp.textContent = "updated " + new Date().toLocaleTimeString("nl-NL");
  }

  metricsBtn.addEventListener('click', () => {
    openDrawer("Metrics", 'Live uit PostgreSQL + usage_events (top bronnen = event <code>source_selected</code>).');
    loadMetrics().catch(() => { drawerContent.textContent = "metrics failed"; });
  });

  // ---------- SNAPSHOTS (Top20) ----------
  function topListForScope(scope){
    return (String(scope||"all") === "ql") ? TOP20_QL : TOP20_ALL;
  }

  async function snapshotTop20(){
    const scope = (current.mode === "tree" || current.mode === "map") ? (current.scope || "all") : "all";
    const paths = topListForScope(scope);

    statusEl.textContent = "Top20 snapshot…";
    snapTopBtn.disabled = true;

    const label = (scope === "ql") ? "top20-ql" : "top20-all";
    const payload = {
      scope,
      kind: "top20",
      note: label,
      pinnedPaths: paths,
      includeContent: true
    };

    try {
      const r = await fetchJson("/api/dev/snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok || !r.json || !r.json.ok) {
        const msg = (r.json && r.json.error) ? r.json.error : r.text;
        throw new Error(msg || "snapshot failed");
      }

      openDrawer("Top20 snapshot", `
        <div class="muted">
          Scope: <code>${escHtml(scope)}</code> • Snapshot: <code>#${escHtml(r.json.snapshot.id)}</code> • ${escHtml(r.json.snapshot.created_at)}
        </div>
      `);

      renderSnapshotResult(r.json.snapshot, r.json.saved, scope);
      drawerStamp.textContent = "saved " + new Date().toLocaleTimeString("nl-NL");
      statusEl.textContent = "Top20 saved ✓";
    } catch (e) {
      statusEl.textContent = "snapshot failed: " + (e?.message || String(e));
      openDrawer("Top20 snapshot", "<div class='muted'>Snapshot failed.</div>");
      drawerContent.textContent = String(e?.message || e);
    } finally {
      snapTopBtn.disabled = false;
      setTimeout(() => { statusEl.textContent = ""; }, 8000);
    }
  }

  function mkBtn(text, onClick){
    const b = document.createElement("button");
    b.className = "btn2";
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }

  async function copyToClipboard(text){
    await navigator.clipboard.writeText(String(text || ""));
    statusEl.textContent = "copied ✓";
    setTimeout(() => { statusEl.textContent = ""; }, 1400);
  }

  async function loadFileContent(path, snapshotId){
    const url = "/api/dev/snapshots/file-content?path=" + encodeURIComponent(path) + "&snapshot_id=" + encodeURIComponent(snapshotId);
    const r = await fetchJson(url);
    if (!r.ok || !r.json || !r.json.ok) {
      throw new Error((r.json && r.json.error) ? r.json.error : r.text);
    }
    const item = r.json.item || {};
    // content kan null zijn als includeContent=false (maar Top20 = true)
    return item.content ?? (item.head30 ?? "") + "\\n...\\n" + (item.tail30 ?? "");
  }

  async function loadHistory(path){
    const url = "/api/dev/snapshots/file?path=" + encodeURIComponent(path);
    const r = await fetchJson(url);
    if (!r.ok || !r.json || !r.json.ok) {
      throw new Error((r.json && r.json.error) ? r.json.error : r.text);
    }
    return r.json.items || [];
  }

  function renderSnapshotResult(snapshot, saved, scope){
    const okItems = (saved || []).filter(x => x && x.ok);
    const badItems = (saved || []).filter(x => x && x.ok === false);

    let html = "";
    html += "<div class='hr'></div>";
    html += "<div class='row2'><span class='pill'>Bestanden</span><span class='small'>per bestand: View • Copy • History</span></div>";

    if (badItems.length) {
      html += "<div class='small' style='margin:8px 0'><b>Let op:</b> sommige files niet gesaved:</div>";
      html += "<ul class='small'>" + badItems.map(x => "<li><span class='mono'>"+escHtml(x.path)+"</span> — "+escHtml(x.error||"error")+"</li>").join("") + "</ul>";
      html += "<div class='hr'></div>";
    }

    const container = document.createElement("div");
    container.innerHTML = html;

    const list = document.createElement("div");

    okItems.forEach(it => {
      const card = document.createElement("div");
      card.className = "fileCard";

      const head = document.createElement("div");
      head.className = "fileHead";

      const p = document.createElement("div");
      p.className = "filePath mono";
      p.textContent = it.path;

      const meta = document.createElement("div");
      meta.className = "small";
      meta.textContent = (it.bytes ? (it.bytes + " bytes") : "") + (it.n_lines ? (" • " + it.n_lines + " lines") : "");

      const viewBtn = mkBtn("View code", async () => {
        try {
          statusEl.textContent = "loading code…";
          const text = await loadFileContent(it.path, snapshot.id);
          showCodeView(it.path, text, snapshot.id);
        } catch (e) {
          statusEl.textContent = "view failed: " + (e?.message || String(e));
        } finally {
          setTimeout(() => { statusEl.textContent = ""; }, 2000);
        }
      });

      const copyBtn = mkBtn("Copy code", async () => {
        try {
          const text = await loadFileContent(it.path, snapshot.id);
          await copyToClipboard(text);
        } catch (e) {
          statusEl.textContent = "copy failed: " + (e?.message || String(e));
          setTimeout(() => { statusEl.textContent = ""; }, 2200);
        }
      });

      const histBtn = mkBtn("History", async () => {
        try {
          statusEl.textContent = "loading history…";
          const items = await loadHistory(it.path);
          showHistory(it.path, items);
        } catch (e) {
          statusEl.textContent = "history failed: " + (e?.message || String(e));
          setTimeout(() => { statusEl.textContent = ""; }, 2200);
        } finally {
          setTimeout(() => { statusEl.textContent = ""; }, 1200);
        }
      });

      head.appendChild(p);
      head.appendChild(meta);
      head.appendChild(viewBtn);
      head.appendChild(copyBtn);
      head.appendChild(histBtn);

      card.appendChild(head);

      list.appendChild(card);
    });

    container.appendChild(list);

    drawerContent.innerHTML = "";
    drawerContent.appendChild(container);
  }

  function showCodeView(path, text, snapshotId){
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="row2">
        <span class="pill">Code</span>
        <span class="small mono">${escHtml(path)}</span>
        <span class="small">snapshot #${escHtml(snapshotId)}</span>
      </div>
      <div class="row2" style="margin-top:8px;">
        <button class="btn2" id="copyNow">Copy</button>
      </div>
      <div class="pre mono" id="pre"></div>
    `;
    wrap.querySelector("#pre").textContent = String(text || "");
    wrap.querySelector("#copyNow").addEventListener("click", async () => {
      await copyToClipboard(text);
    });
    drawerContent.innerHTML = "";
    drawerContent.appendChild(wrap);
  }

  function showHistory(path, items){
    const wrap = document.createElement("div");
    const title = document.createElement("div");
    title.className = "row2";
    title.innerHTML = '<span class="pill">History</span><span class="small mono">'+escHtml(path)+'</span><span class="small">('+escHtml(items.length)+')</span>';
    wrap.appendChild(title);

    if (!items.length) {
      const m = document.createElement("div");
      m.className = "small";
      m.style.marginTop = "10px";
      m.textContent = "Geen snapshots gevonden voor dit bestand.";
      wrap.appendChild(m);
      drawerContent.innerHTML = "";
      drawerContent.appendChild(wrap);
      return;
    }

    const tbl = document.createElement("table");
    tbl.className = "tbl";
    tbl.innerHTML = "<thead><tr><th>tijd</th><th>label</th><th>snapshot</th><th>acties</th></tr></thead>";
    const tb = document.createElement("tbody");

    items.forEach(row => {
      const tr = document.createElement("tr");

      const tdT = document.createElement("td");
      tdT.className = "small";
      tdT.textContent = row.created_at || "";

      const tdL = document.createElement("td");
      tdL.className = "small";
      tdL.textContent = row.label || row.note || row.kind || "";

      const tdS = document.createElement("td");
      tdS.className = "small mono";
      tdS.textContent = "#" + (row.snapshot_id || row.id || "?");

      const tdA = document.createElement("td");

      const view = document.createElement("button");
      view.className = "btn2";
      view.textContent = "View";
      view.addEventListener("click", async () => {
        try {
          const sid = Number(row.snapshot_id || row.id);
          const text = await loadFileContent(path, sid);
          showCodeView(path, text, sid);
        } catch (e) {
          statusEl.textContent = "view failed: " + (e?.message || String(e));
          setTimeout(() => { statusEl.textContent = ""; }, 2200);
        }
      });

      const copy = document.createElement("button");
      copy.className = "btn2";
      copy.textContent = "Copy";
      copy.style.marginLeft = "6px";
      copy.addEventListener("click", async () => {
        try {
          const sid = Number(row.snapshot_id || row.id);
          const text = await loadFileContent(path, sid);
          await copyToClipboard(text);
        } catch (e) {
          statusEl.textContent = "copy failed: " + (e?.message || String(e));
          setTimeout(() => { statusEl.textContent = ""; }, 2200);
        }
      });

      tdA.appendChild(view);
      tdA.appendChild(copy);

      tr.appendChild(tdT);
      tr.appendChild(tdL);
      tr.appendChild(tdS);
      tr.appendChild(tdA);
      tb.appendChild(tr);
    });

    tbl.appendChild(tb);
    wrap.appendChild(tbl);

    drawerContent.innerHTML = "";
    drawerContent.appendChild(wrap);
  }

  snapTopBtn.addEventListener("click", () => {
    openDrawer("Top20 snapshot", "<div class='muted'>Maakt een snapshot (met volledige code) van de curated Top20 voor de huidige scope.</div>");
    drawerContent.textContent = "ready…";
    snapshotTop20().catch(() => {});
  });

  drawerRefresh.addEventListener("click", () => {
    // Refresh betekent: als Metrics drawer open is -> metrics reload.
    // Als Top20 drawer open is -> geen automatische refresh (je klikt opnieuw op Top20 snapshot).
    if (drawerTitle.textContent === "Metrics") {
      loadMetrics().catch(() => { drawerContent.textContent = "metrics failed"; });
    } else {
      drawerStamp.textContent = "no refresh (use Top20 snapshot)";
      setTimeout(() => { drawerStamp.textContent = ""; }, 1200);
    }
  });
</script>
</body>
</html>`;

    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  return router;
};


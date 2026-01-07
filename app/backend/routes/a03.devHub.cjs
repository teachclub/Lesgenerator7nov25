"use strict";

const express = require("express");

module.exports = function a03DevHubFactory() {
  const router = express.Router();

  const isRunAppDefault = "https://kleio9nov-578e4.web.app";

  const FRONTEND_BASE_OLD =
    (process.env.LESSIE_FRONTEND_BASE_OLD || process.env.LESSIE_FRONTEND_BASE || "").trim();

  const FRONTEND_BASE_QL =
    (process.env.LESSIE_FRONTEND_BASE_QL || process.env.LESSIE_FRONTEND_BASE || "").trim();

  // Paths zijn repo-root relatief zoals a09.devSnapshots verwacht (dus zonder "app/backend/").
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
    .brand{font-weight:900}
    .group{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .btn{
      padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;
      background:#fff;cursor:pointer;font-weight:750
    }
    .btn:hover{background:#f8fafc}
    .btn.active{background:#e2e8f0;border-color:#94a3b8}
    .spacer{flex:1}
    .status{font-size:12px;color:#334155;min-height:16px;max-width:72ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    main{padding:0}
    iframe{width:100%;height:calc(100vh - 118px);border:0}
    .ctl{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .ctl label{font-size:12px;color:#334155}
    input[type="checkbox"]{cursor:pointer}
    .pill{font-size:12px;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:999px;padding:6px 10px}
    .sep{width:1px;height:26px;background:#e5e7eb;margin:0 4px}
    code{background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:1px 6px}
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
      <label><input type="checkbox" id="includeMin" /> tree(min)</label>
    </div>

    <div class="spacer"></div>

    <button class="btn" id="snapAllBtn">Top20 snapshot — Lessie 2000</button>
    <button class="btn" id="snapQlBtn">Top20 snapshot — QL</button>

    <button class="btn" id="copyAll">Copy snapshot</button>

    <span class="status" id="status"></span>
  </header>

  <main>
    <iframe id="frame" src="/api/dev/sitemap?scope=all"></iframe>
  </main>

<script>
(function(){
  function setActive(button){
    var btns = Array.prototype.slice.call(document.querySelectorAll('#buttons .btn'));
    btns.forEach(function(x){ x.classList.remove('active'); });
    button.classList.add('active');
  }

  function setStatus(msg){
    var el = document.getElementById('status');
    el.textContent = String(msg || "");
  }

  function updatePill(mode, scope){
    var pill = document.getElementById('pill');
    pill.textContent = "scope=" + (scope || "-") + "  mode=" + (mode || "-");
  }

  function baseFromEnvOrDefault(envVal){
    var v = (envVal || "").trim();
    if (v) return v.replace(/\\/$/, "");
    if (location.origin.indexOf("run.app") !== -1) return DEFAULT_RUNAPP;
    return location.origin;
  }

  function livingMapUrl(scope){
    return "/api/dev/sitemap?scope=" + encodeURIComponent(scope || "all");
  }

  function treeJsonUrl(scope, min){
    var hints = document.getElementById('withHints').checked ? "1" : "0";
    var notes = document.getElementById('withNotes').checked ? "1" : "0";
    return "/api/dev/tree?scope=" + encodeURIComponent(scope || "ql")
      + "&withHints=" + (min ? "0" : hints)
      + "&withNotes=" + (min ? "0" : notes)
      + "&cachebust=" + Date.now();
  }

  async function postJson(url, bodyObj){
    var r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bodyObj || {}),
      cache: "no-store"
    });
    var t = await r.text();
    var j;
    try { j = JSON.parse(t); } catch(e) { j = null; }
    if (!r.ok || !j || !j.ok) {
      throw new Error((j && j.error) ? j.error : t);
    }
    return j;
  }

  var frame = document.getElementById('frame');

  var ENV_OLD = ${JSON.stringify(FRONTEND_BASE_OLD)};
  var ENV_QL  = ${JSON.stringify(FRONTEND_BASE_QL)};
  var DEFAULT_RUNAPP = ${JSON.stringify(isRunAppDefault)};

  var FRONTEND_OLD = baseFromEnvOrDefault(ENV_OLD);
  var FRONTEND_QL  = baseFromEnvOrDefault(ENV_QL);

  var TOP20_ALL = ${JSON.stringify(TOP20_ALL)};
  var TOP20_QL  = ${JSON.stringify(TOP20_QL)};

  var currentMode = "map";
  var currentScope = "all";
  updatePill(currentMode, currentScope);

  async function go(mode, scope, target){
    currentMode = mode || currentMode;
    currentScope = scope || currentScope;
    updatePill(currentMode, currentScope);

    if (currentMode === "map") {
      setStatus("");
      frame.src = livingMapUrl(currentScope);
      return;
    }

    if (currentMode === "tree") {
      setStatus("tree=json");
      frame.src = treeJsonUrl(currentScope, document.getElementById('includeMin').checked);
      return;
    }

    if (currentMode === "live") {
      var base = (target === "ql") ? FRONTEND_QL : FRONTEND_OLD;
      setStatus(base);
      frame.src = base;
      return;
    }
  }

  Array.prototype.slice.call(document.querySelectorAll('#buttons .btn')).forEach(function(b){
    b.addEventListener("click", function(){
      var mode = b.getAttribute("data-mode");
      var scope = b.getAttribute("data-scope");
      var target = b.getAttribute("data-target");
      setActive(b);
      go(mode, scope, target);
    });
  });

  function refreshTreeIfActive(){
    if (currentMode === "tree") go("tree", currentScope);
  }
  document.getElementById('withHints').addEventListener("change", refreshTreeIfActive);
  document.getElementById('withNotes').addEventListener("change", refreshTreeIfActive);
  document.getElementById('includeMin').addEventListener("change", refreshTreeIfActive);

  document.getElementById('snapAllBtn').addEventListener("click", async function(){
    try {
      setStatus("snapshot…");
      var j = await postJson("/api/dev/snapshot", { scope: "all", paths: TOP20_ALL });
      setStatus("snapshot ok: " + (j.snapshotId || "(no id)"));
    } catch (e) {
      setStatus("snapshot error");
      alert(String(e && e.message ? e.message : e));
    }
  });

  document.getElementById('snapQlBtn').addEventListener("click", async function(){
    try {
      setStatus("snapshot…");
      var j = await postJson("/api/dev/snapshot", { scope: "ql", paths: TOP20_QL });
      setStatus("snapshot ok: " + (j.snapshotId || "(no id)"));
    } catch (e) {
      setStatus("snapshot error");
      alert(String(e && e.message ? e.message : e));
    }
  });

  document.getElementById('copyAll').addEventListener("click", async function(){
    try {
      var r = await fetch("/api/dev/snapshots/latest", { cache: "no-store" });
      var t = await r.text();
      await navigator.clipboard.writeText(t);
      setStatus("copied");
      setTimeout(function(){ setStatus(""); }, 1200);
    } catch (e) {
      setStatus("copy failed");
      setTimeout(function(){ setStatus(""); }, 1200);
    }
  });

})();
</script>

</body>
</html>`;

    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  return router;
};


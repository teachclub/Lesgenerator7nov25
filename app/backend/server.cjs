"use strict";

const path = require("path");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const dotenvPath = path.join(__dirname, ".env");
require("dotenv").config({ path: dotenvPath });

const app = express();
const api = express.Router();
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json({ limit: "4mb" }));

app.use("/static", express.static(path.join(__dirname, "data")));

app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

// -------------------- DB POOL (shared) --------------------
function makePoolConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };

  const hasPgEnv =
    Boolean(process.env.PGHOST) ||
    Boolean(process.env.PGPORT) ||
    Boolean(process.env.PGUSER) ||
    Boolean(process.env.PGPASSWORD) ||
    Boolean(process.env.PGDATABASE);

  if (!hasPgEnv) return {};

  return {
    host: process.env.PGHOST || undefined,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER || undefined,
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE || undefined,
  };
}

const pool = new Pool(makePoolConfig());

pool.on("error", (err) => {
  console.error("[pg] pool error:", err);
});
// ----------------------------------------------------------

// -------------------- DEVHUB GATE --------------------
const DEVHUB_ON = String(process.env.LESSIE_DEVHUB || "") === "1";

function isDevPath(req) {
  const p = String(req.path || "");
  return (
    p === "/dev" ||
    p.startsWith("/dev/") ||
    p === "/api/dev" ||
    p.startsWith("/api/dev/") ||
    p === "/api/dev-tree" ||
    p.startsWith("/api/dev-tree/") ||
    p === "/api/dev2" ||
    p.startsWith("/api/dev2/") ||
    p === "/dev2" ||
    p.startsWith("/dev2/")
  );
}

app.use((req, res, next) => {
  if (!DEVHUB_ON && isDevPath(req)) {
    res.status(404).json({ ok: false, error: "Route niet gevonden" });
    return;
  }
  next();
});
// -----------------------------------------------------

const healthRouterFactory = require("./routes/a01.health.cjs");
app.use("/", healthRouterFactory());

// DEV TREE (API + UI)
try {
  const devTreeFactory = require("./routes/a02.devTree.cjs");
  app.use("/api", devTreeFactory());
  app.use("/", devTreeFactory());
} catch (e) {
  console.warn("[server] a02.devTree niet geladen:", e?.message || String(e));
}

// DEV DB STATUS
try {
  const devDbStatusFactory = require("./routes/a04.devDbStatus.cjs");
  app.use("/api", devDbStatusFactory());
} catch (e) {
  console.warn("[server] a04.devDbStatus niet geladen:", e?.message || String(e));
}

// DEV SNAPSHOTS
try {
  const devSnapshotsFactory = require("./routes/a09.devSnapshots.cjs");
  app.use("/api", devSnapshotsFactory());
} catch (e) {
  console.warn("[server] a09.devSnapshots niet geladen:", e?.message || String(e));
}

// DEV HUB UI
try {
  const devHubFactory = require("./routes/a03.devHub.cjs");
  app.use("/", devHubFactory());
} catch (e) {
  console.warn("[server] a03.devHub niet geladen:", e?.message || String(e));
}

// DEV HUB 2
try {
  const devHub2Factory = require("./routes/a10.devHub2.cjs");
  app.use("/api", devHub2Factory());
} catch (e) {
  console.warn("[server] a10.devHub2 niet geladen:", e?.message || String(e));
}

// ✅ INSIGHTS (NIET /dev) — read-only dashboard + JSON
try {
  const registerDbInsights = require("./routes/a19.dbInsights.cjs");
  registerDbInsights(app, pool);
} catch (e) {
  console.warn("[server] a19.dbInsights niet geladen:", e?.message || String(e));
}

// ✅ DEV INSIGHTS QUALITY (onder /api/dev/insights/*)
try {
  const devInsightsQuality = require("./routes/a20.devInsightsQuality.cjs");
  devInsightsQuality.mount(app, { basePath: "/api/dev/insights" });
} catch (e) {
  console.warn("[server] a20.devInsightsQuality niet geladen:", e?.message || String(e));
}

api.use(require("./routes/a06.chips.cjs"));
api.use(require("./routes/a07.usageEvents.cjs")());
api.use(require("./routes/a24.chipSuggest.cjs")());
api.use(require("./routes/a12.search.cjs"));
api.use(require("./routes/a13.searchPreset.cjs"));
api.use(require("./routes/a22.thesaurus.cjs"));
api.use(require("./routes/a35.proposals-v2.cjs"));
api.use(require("./routes/lessonV2.refineConcept.cjs"));

api.use(require("./routes/a14.sourceDetail.cjs")());
api.use(require("./routes/a15.imageProxy.cjs")());
api.use(require("./routes/a16.questionGen.cjs")());
api.use(require("./routes/a17.contextGen.cjs")());
api.use(require("./routes/a52.seedSourceSuggest.cjs")());
api.use(require("./routes/a60.sourceGame.cjs")());

// ✅ QL03: MATCH VANUIT CONTEXT_A (nieuw)
api.use(require("./routes/a18.matchFromContextA.cjs"));

// ✅ QUESTION FLOW: 1 router, zowel /api/* als /* (handig voor debug)
const questionFlowFactory = require("./routes/a17.questionFlow.cjs");
const questionFlowRouter = questionFlowFactory();
api.use(questionFlowRouter);
app.use("/", questionFlowRouter);
app.use("/", require("./routes/searchMatchV2.cjs"));
api.use(require("./routes/a51.citoimg.cjs"));

try {
  const { registerLessonV2Step1Routes } = require("./routes/lessonV2.step1.cjs");
  const { registerLessonV2Step2Routes } = require("./routes/lessonV2.step2.cjs");
  const { registerLessonV2Step3Routes } = require("./routes/lessonV2.step3.cjs");
  const { registerLessonV2Step4Routes } = require("./routes/lessonV2.step4.cjs");

  registerLessonV2Step1Routes(app);
  registerLessonV2Step2Routes(app);
  registerLessonV2Step3Routes(app);
  registerLessonV2Step4Routes(app);

  registerLessonV2Step1Routes(api);
  registerLessonV2Step2Routes(api);
  registerLessonV2Step3Routes(api);
  registerLessonV2Step4Routes(api);
} catch (e) {
  console.warn("[server] lessonV2 step routes niet geregistreerd:", e?.message || String(e));
}

try {
  const dbBrowserFactory = require("./routes/a50.dbBrowser.cjs");
  api.use(dbBrowserFactory());
} catch (e) {
  console.warn("[server] a50.devBrowser niet geladen:", e?.message || String(e));
}

app.use("/api", api);

app.use((req, res) => {
  console.warn("[404] Niet gevonden:", req.method, req.url);
  res.status(404).json({ ok: false, error: "Route niet gevonden" });
});

app.use((err, req, res, next) => {
  console.error("[UNHANDLED ERROR]", err);
  res.status(500).json({ ok: false, error: "Interne serverfout" });
});

app.listen(PORT, () => {
  console.log(`[Backend] Luistert op http://0.0.0.0:${PORT}`);
});

module.exports = app;


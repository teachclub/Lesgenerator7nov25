"use strict";

const path = require("path");
const express = require("express");
const cors = require("cors");

const dotenvPath = path.join(__dirname, ".env");
require("dotenv").config({ path: dotenvPath });

const app = express();
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json({ limit: "4mb" }));

app.use("/static", express.static(path.join(__dirname, "data")));

app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

// -------------------- DEVHUB GATE --------------------
// Zet LESSIE_DEVHUB=1 in .env (lokaal) of Cloud Run env vars (alleen als je ’m live wil).
const DEVHUB_ON = String(process.env.LESSIE_DEVHUB || "") === "1";

function isDevPath(req) {
  const p = String(req.path || "");
  return (
    p === "/dev" ||
    p.startsWith("/dev/") ||
    p === "/api/dev" ||
    p.startsWith("/api/dev/") ||
    p === "/api/dev-tree" ||
    p.startsWith("/api/dev-tree/")
  );
}

// Als devhub uit staat: doe alsof routes niet bestaan (netjes 404).
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

// DEV TREE (API + UI) -> DevHub tab "Tree"
try {
  const devTreeFactory = require("./routes/a02.devTree.cjs");
  app.use("/api", devTreeFactory());
  app.use("/", devTreeFactory());
} catch (e) {
  console.warn("[server] a02.devTree niet geladen:", e?.message || String(e));
}

// DEV DB STATUS (Postgres snapshot) -> /api/dev/db-status
try {
  const devDbStatusFactory = require("./routes/a04.devDbStatus.cjs");
  app.use("/api", devDbStatusFactory());
} catch (e) {
  console.warn("[server] a04.devDbStatus niet geladen:", e?.message || String(e));
}

// DEV SNAPSHOTS (code backups) -> /api/dev/snapshot + /api/dev/snapshots/*
try {
  const devSnapshotsFactory = require("./routes/a09.devSnapshots.cjs");
  app.use("/api", devSnapshotsFactory());
} catch (e) {
  console.warn("[server] a09.devSnapshots niet geladen:", e?.message || String(e));
}

// DEV HUB (1 link) -> /dev
try {
  const devHubFactory = require("./routes/a03.devHub.cjs");
  app.use("/", devHubFactory());
} catch (e) {
  console.warn("[server] a03.devHub niet geladen:", e?.message || String(e));
}

app.use("/api", require("./routes/a06.chips.cjs"));
app.use("/api", require("./routes/a07.usageEvents.cjs")());
app.use("/api", require("./routes/a24.chipSuggest.cjs")());
app.use("/api", require("./routes/a12.search.cjs"));
app.use("/api", require("./routes/a13.searchPreset.cjs"));
app.use("/api", require("./routes/a22.thesaurus.cjs"));
app.use("/api", require("./routes/a35.proposals-v2.cjs"));
app.use("/api", require("./routes/lessonV2.refineConcept.cjs"));

app.use("/api", require("./routes/a14.sourceDetail.cjs")());
app.use("/api", require("./routes/a15.imageProxy.cjs")());
app.use("/api", require("./routes/a16.questionGen.cjs")());
app.use("/api", require("./routes/a17.contextGen.cjs")());
app.use("/api", require("./routes/searchMatch.cjs")());

app.use("/", require("./routes/searchMatchV2.cjs"));

app.use("/api", require("./routes/a51.citoimg.cjs"));

try {
  const { registerLessonV2Step1Routes } = require("./routes/lessonV2.step1.cjs");
  const { registerLessonV2Step2Routes } = require("./routes/lessonV2.step2.cjs");
  const { registerLessonV2Step3Routes } = require("./routes/lessonV2.step3.cjs");
  const { registerLessonV2Step4Routes } = require("./routes/lessonV2.step4.cjs");
  registerLessonV2Step1Routes(app);
  registerLessonV2Step2Routes(app);
  registerLessonV2Step3Routes(app);
  registerLessonV2Step4Routes(app);
} catch (e) {
  console.warn("[server] lessonV2 step routes niet geregistreerd:", e?.message || String(e));
}

try {
  const dbBrowserFactory = require("./routes/a50.dbBrowser.cjs");
  app.use("/api", dbBrowserFactory());
} catch (e) {
  console.warn("[server] a50.dbBrowser niet geladen:", e?.message || String(e));
}

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


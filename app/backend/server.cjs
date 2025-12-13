"use strict";

/**
 * Minimal clean server voor Lessie2000 / LesGO v2 in /app/backend
 */

const path = require("path");
const express = require("express");
const cors = require("cors");

const dotenvPath = path.join(__dirname, ".env");
require("dotenv").config({ path: dotenvPath });

try {
  require("./services/a28.cito.cjs");
} catch (e) {
  console.error("[server] Kon CITO-service niet laden:", e.message);
}

const app = express();
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

function healthPayload() {
  return {
    ok: true,
    service: "Lessie2000-backend",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extra health endpoints (Cloud Run/monitoring-friendly)
 * Laat bestaande GET / (a01.health) intact.
 */
app.get("/health", (req, res) => res.json(healthPayload()));
app.get("/api/health", (req, res) => res.json(healthPayload()));

const healthRouterFactory = require("./routes/a01.health.cjs");
app.use("/", healthRouterFactory());

app.use("/api", require("./routes/a06.chips.cjs"));
app.use("/api", require("./routes/a12.search.cjs"));
app.use("/api", require("./routes/a13.searchPreset.cjs"));
app.use("/api", require("./routes/a22.thesaurus.cjs"));
app.use("/api", require("./routes/a35.proposals-v2.cjs"));
app.use("/api", require("./routes/lessonV2.refineConcept.cjs"));

app.use("/api", require("./routes/a15.imageProxy.cjs")());

const lessonRouter = express.Router();

const { registerLessonV2Step1Routes } = require("./routes/lessonV2.step1.cjs");
const { registerLessonV2Step2Routes } = require("./routes/lessonV2.step2.cjs");
const { registerLessonV2Step3Routes } = require("./routes/lessonV2.step3.cjs");
const { registerLessonV2Step4Routes } = require("./routes/lessonV2.step4.cjs");

registerLessonV2Step1Routes(lessonRouter);
registerLessonV2Step2Routes(lessonRouter);
registerLessonV2Step3Routes(lessonRouter);
registerLessonV2Step4Routes(lessonRouter);

app.use("/api", lessonRouter);

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


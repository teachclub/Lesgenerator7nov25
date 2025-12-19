"use strict";

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
  const kService = process.env.K_SERVICE || null;
  const kRevision = process.env.K_REVISION || null;
  const kConfig = process.env.K_CONFIGURATION || null;

  const gcpProject =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    null;

  const serviceName =
    process.env.SERVICE_NAME ||
    (kService ? String(kService) : "") ||
    "Lessie2000-backend";

  return {
    ok: true,
    service: serviceName,
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || null,
    port: Number(PORT) || PORT,
    kService,
    kRevision,
    kConfiguration: kConfig,
    gcpProject,
  };
}

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
app.use("/api", require("./routes/a14.sourceDetail.cjs"));
app.use("/api", require("./routes/a15.imageProxy.cjs")());
app.use("/api", require("./routes/a16.questionGen.cjs")());
app.use("/api", require("./routes/searchMatch.cjs")());

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


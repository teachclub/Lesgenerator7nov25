"use strict";

/**
 * Minimal clean server voor Lessie / LesGO v2 in /app/backend
 * - Laadt .env
 * - Laadt CITO-service (a28) voor logging / dataset
 * - Mount:
 *   - GET    /                      → health
 *   - POST   /api/chips             → a06.chips
 *   - POST   /api/search            → a12.search
 *   - POST   /api/search-preset     → a13.searchPreset
 *   - POST   /api/thesaurus         → a22.thesaurus
 *   - POST   /api/proposals-v2      → a35.proposals-v2
 *   - POST   /api/generate-lesson-v2/step1..4 → lessonV2.step*.cjs
 */

const path = require("path");
const express = require("express");
const cors = require("cors");

// 1. .env laden
const dotenvPath = path.join(__dirname, ".env");
require("dotenv").config({ path: dotenvPath });

// 2. CITO-service preloaden (logt zelf wat hij doet)
try {
  require("./services/a28.cito.cjs");
} catch (e) {
  console.error("[server] Kon CITO-service niet laden:", e.message);
}

const app = express();
const PORT = process.env.PORT || 8081;

// 3. Basis middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// 4. Request-logger (zorgt altijd dat next() wordt aangeroepen)
app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

// 5. Health-route
const healthRouterFactory = require("./routes/a01.health.cjs");
app.use("/", healthRouterFactory());

// 6. API-routers (directe Express-routers)
app.use("/api", require("./routes/a06.chips.cjs"));
app.use("/api", require("./routes/a12.search.cjs"));
app.use("/api", require("./routes/a13.searchPreset.cjs"));
app.use("/api", require("./routes/a22.thesaurus.cjs"));
app.use("/api", require("./routes/a35.proposals-v2.cjs"));

// 7. LESSON V2 – step1..4 via register*Routes
const lessonRouter = express.Router();

const {
  registerLessonV2Step1Routes,
} = require("./routes/lessonV2.step1.cjs");
const {
  registerLessonV2Step2Routes,
} = require("./routes/lessonV2.step2.cjs");
const {
  registerLessonV2Step3Routes,
} = require("./routes/lessonV2.step3.cjs");
const {
  registerLessonV2Step4Routes,
} = require("./routes/lessonV2.step4.cjs");

registerLessonV2Step1Routes(lessonRouter);
registerLessonV2Step2Routes(lessonRouter);
registerLessonV2Step3Routes(lessonRouter);
registerLessonV2Step4Routes(lessonRouter);

app.use("/api", lessonRouter);

// 8. Fallback 404 (voor debugging fijn om te weten dat er iets is geraakt)
app.use((req, res, next) => {
  console.warn("[404] Niet gevonden:", req.method, req.url);
  res.status(404).json({ ok: false, error: "Route niet gevonden" });
});

// 9. Error handler (mag als laatste)
app.use((err, req, res, next) => {
  console.error("[UNHANDLED ERROR]", err);
  res.status(500).json({ ok: false, error: "Interne serverfout" });
});

// 10. Start server
app.listen(PORT, () => {
  console.log(`[Backend] Luistert op http://127.0.0.1:${PORT}`);
});

module.exports = app;


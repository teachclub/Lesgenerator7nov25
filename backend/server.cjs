#!/usr/bin/env node
const express = require("express");
const { loadEnv } = require("./config/a02.env.cjs");
const { corsOptions } = require("./middleware/a07.cors.cjs");
const cors = require("cors");

loadEnv();

const app = express();

// CORS vóór routes, met specifieke origin + credentials
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "1mb" }));

function mount(path, file) {
  try {
    const mod = require(file);
    const candidate = (typeof mod === "function" && !mod.stack) ? mod() : mod;
    if (!candidate || typeof candidate !== "function" || !candidate.stack) {
      console.error(`[mount] ${file} exporteert geen geldige express.Router (gevonden: ${typeof candidate}).`);
      process.exit(1);
    }
    app.use(path, candidate);
    console.log(`[mount] OK ${path} <- ${file}`);
  } catch (err) {
    console.error(`[mount] FOUT bij ${file}: ${err.message}`);
    process.exit(1);
  }
}

console.log("[server] Routes mounten...");
mount("/", "./routes/a01.health.cjs");
mount("/api/europeana", "./routes/a11.pingEuropeana.cjs");
mount("/api/europeana", "./routes/a23.searchRaw.cjs");
mount("/api/europeana", "./routes/a23.facets.cjs");
mount("/api/europeana", "./routes/a24.item.cjs");
mount("/api", "./routes/a06.chips.cjs");

for (const [base, file] of [
  ["/api", "./routes/a12.search.cjs"],
  ["/api", "./routes/a13.searchPreset.cjs"],
  ["/api", "./routes/a21.chatSearch.cjs"],
  ["/api", "./routes/a22.thesaurus.cjs"],
  ["/api", "./routes/a19.generate.cjs"],
]) { try { mount(base, file); } catch (_) {} }

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`[server] masterprompt-backend draait op ${url}`);
  console.log(`[server] Healthcheck: curl ${url}/`);
});

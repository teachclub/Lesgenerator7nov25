#!/usr/bin/env node
"use strict";

const express = require("express");
const cors = require("cors");

const { loadEnv } = require("./config/a02.env.cjs");
const { corsOptions } = require("./middleware/a07.cors.cjs");

loadEnv();

const app = express();

// CORS
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// JSON body parsing
app.use(express.json({ limit: "1mb" }));

/**
 * Mount een verplichte router.
 * Bij fout: loggen en proces stoppen.
 */
function mountRequired(path, file) {
  try {
    const mod = require(file);
    const candidate =
      typeof mod === "function" && !mod.stack ? mod() : mod;

    if (!candidate || typeof candidate !== "function" || !candidate.stack) {
      console.error(
        `[mountRequired] ${file} exporteert geen geldige express.Router (gevonden type: ${typeof candidate}).`
      );
      process.exit(1);
    }

    app.use(path, candidate);
    console.log(`[mountRequired] OK ${path} <- ${file}`);
  } catch (err) {
    console.error(`[mountRequired] FOUT bij ${file}: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Mount een optionele router.
 * Bij fout: alleen waarschuwing, geen exit.
 */
function mountOptional(path, file) {
  try {
    const mod = require(file);
    const candidate =
      typeof mod === "function" && !mod.stack ? mod() : mod;

    if (!candidate || typeof candidate !== "function" || !candidate.stack) {
      console.warn(
        `[mountOptional] ${file} exporteert geen geldige express.Router (gevonden type: ${typeof candidate}).`
      );
      return;
    }

    app.use(path, candidate);
    console.log(`[mountOptional] OK ${path} <- ${file}`);
  } catch (err) {
    console.warn(`[mountOptional] Niet gemount (${file}): ${err.message}`);
  }
}

console.log("[server] Routes mounten...");

// Healthcheck (verplicht)
mountRequired("/", "./routes/a01.health.cjs");

// Chips / tv-ka-chips (verplicht voor Lessie)
mountRequired("/api", "./routes/a06.chips.cjs");

// Kleio / zoek / thesaurus / chatsearch (optioneel)
mountOptional("/api", "./routes/a12.search.cjs");
mountOptional("/api", "./routes/a13.searchPreset.cjs");
mountOptional("/api", "./routes/a21.chatSearch.cjs");
mountOptional("/api", "./routes/a22.thesaurus.cjs");

// LESSON V2 – ENIGE ACTIEVE LESROUTES (verplicht)

// Nieuwe proposals-endpoint (A35, v2)
mountRequired("/api", "./routes/a35.proposals-v2.cjs");

// Nieuwe 4-stappen-lesgenerator (A40, v2)
mountRequired("/api", "./routes/a40.lesson-v2.cjs");

// Geen a19.generate, a25.proposals, a26.sources meer:
// dat waren oude v1-lesgenerator-routes en worden bewust niet meer gebruikt.

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`[server] Lessie / LesGO v2 backend draait op ${url}`);
  console.log(`[server] Healthcheck: curl ${url}/`);
  console.log("[server] Actieve lesroutes: /api/propose-lessons en /api/generate-lesson-v2/step1..4");
});


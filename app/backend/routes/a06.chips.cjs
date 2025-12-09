"use strict";

const express = require("express");
const router = express.Router();
const chipsService = require("../services/a06.chips.cjs");

// We halen de enige bestaande export op: expandKeywordsWithGemini
const { expandKeywordsWithGemini } = chipsService;

/**
 * POST /api/chips
 *
 * Doel in deze v2/migratiefase:
 * - Extra zoektermen ("chips") laten genereren door Gemini op basis van
 *   tijdvak, KA's en basiszoekwoorden.
 *
 * Verwachte body:
 * {
 *   tvLabel: "Tijdvak 8 – Tijd van burgers en stoommachines",
 *   kaLabels: ["KA31 - De industriële revolutie ...", "KA32 - Discussies over de ‘sociale kwestie’"],
 *   baseKeywords: ["industrialisation", "factory", "working class"]
 * }
 *
 * Respons:
 * {
 *   tvLabel,
 *   kaLabels,
 *   baseKeywords,
 *   expanded: [ "Industrial Revolution", "steam engine", ... ]
 * }
 */
router.post("/chips", async (req, res) => {
  try {
    const { tvLabel, kaLabels, baseKeywords } = req.body || {};

    if (
      !tvLabel ||
      !Array.isArray(kaLabels) ||
      !Array.isArray(baseKeywords) ||
      kaLabels.length === 0 ||
      baseKeywords.length === 0
    ) {
      return res.status(400).json({
        error:
          "Verwacht tvLabel (string), kaLabels (array) en baseKeywords (array).",
      });
    }

    const expanded = await expandKeywordsWithGemini({
      tvLabel,
      kaLabels,
      baseKeywords,
    });

    return res.json({
      tvLabel,
      kaLabels,
      baseKeywords,
      expanded,
    });
  } catch (error) {
    console.error("[routes/a06.chips] Fout:", error);
    return res.status(500).json({
      error: "Interne serverfout bij ophalen chips",
      details: error?.message,
    });
  }
});

/**
 * GET /api/image-proxy?url=...
 *
 * Proxy om CITO- en Kleio-afbeeldingen via de backend te laden.
 * Nodig omdat:
 * - sommige hosts (googleusercontent, Europeana) direct hotlinken bemoeilijken
 * - en omdat de frontend via de Vite-proxy naar /api loopt.
 *
 * Deze module wordt onder /api gemount, dus de volledige route is:
 *   GET /api/image-proxy?url=...
 */
router.get("/image-proxy", async (req, res) => {
  try {
    const url = req.query.url;

    if (!url || typeof url !== "string") {
      return res.status(400).send("Missing 'url' query parameter.");
    }

    // Basale veiligheidscheck: alleen http(s) toestaan
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).send("Invalid URL protocol.");
    }

    // Node 18 → global fetch beschikbaar
    const upstream = await fetch(url);

    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .send(`Upstream image request failed: ${upstream.statusText}`);
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    console.error("[image-proxy] Fout:", err);
    res.status(500).send("Image proxy error.");
  }
});

module.exports = router;


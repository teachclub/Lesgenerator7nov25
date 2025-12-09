// routes/a29.tvKa.cjs
// Eenvoudige TV/KA-endpoints voor de frontend
// - GET /api/tv-ka       → volledige structuur per tijdvak
// - GET /api/tv-ka/:tv   → één tijdvak met KA's

const { Router } = require("express");
const { TV_KA } = require("../data/tv-ka.cjs");

const router = Router();

/**
 * Alle tijdvakken + bijbehorende KA's
 */
router.get("/tv-ka", (req, res) => {
  try {
    res.json({
      ok: true,
      items: TV_KA,
      count: TV_KA.length,
    });
  } catch (err) {
    console.error("[a29.tvKa] ERROR /tv-ka", err);
    res.status(500).json({
      ok: false,
      error: "Interne fout bij ophalen tijdvakken",
    });
  }
});

/**
 * Enkel tijdvak op nummer (1..10)
 * Voorbeeld: GET /api/tv-ka/5
 */
router.get("/tv-ka/:tv", (req, res) => {
  try {
    const tvNum = parseInt(req.params.tv, 10);
    if (Number.isNaN(tvNum)) {
      return res.status(400).json({
        ok: false,
        error: "Ongeldig tijdvaknummer",
      });
    }

    const item = TV_KA.find((v) => v.tv === tvNum);
    if (!item) {
      return res.status(404).json({
        ok: false,
        error: `Tijdvak ${tvNum} niet gevonden`,
      });
    }

    res.json({
      ok: true,
      item,
    });
  } catch (err) {
    console.error("[a29.tvKa] ERROR /tv-ka/:tv", err);
    res.status(500).json({
      ok: false,
      error: "Interne fout bij ophalen tijdvak",
    });
  }
});

module.exports = router;


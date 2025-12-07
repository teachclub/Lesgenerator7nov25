"use strict";

const express = require("express");
const router = express.Router();

/**
 * Eenvoudige preset-endpoint voor Kleio.
 *
 * Frontend verwacht:
 *   POST /api/search-preset
 *   → 200 met een lijst presets/chips of iets dergelijks.
 *
 * In deze migratiefase houden we het simpel: een paar
 * statische voorbeelden, zodat de UI weer werkt.
 */

const defaultPresets = [
  {
    id: "ka-all",
    label: "Alle KA's",
    query: "",
  },
  {
    id: "exam-thema",
    label: "Examengerelateerde bronnen",
    query: "examen OR centraal examen OR schoolexamen",
  },
  {
    id: "europese-expansie",
    label: "Europese expansie",
    query: "KA18 OR ontdekkingsreizen OR wereldhandel",
  },
];

router.post("/search-preset", (req, res) => {
  // Eventueel kun je body gebruiken (req.body.type / req.body.ka)
  // en daar slimme logica op bouwen. Voor nu sturen we gewoon
  // een vaste lijst terug zodat de frontend niet stukloopt.
  res.json({
    presets: defaultPresets,
  });
});

module.exports = router;


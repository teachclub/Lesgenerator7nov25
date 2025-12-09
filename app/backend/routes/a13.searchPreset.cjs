"use strict";

const express = require("express");
const router = express.Router();

/**
 * a13.searchPreset.cjs – MINIMALE VERSIE
 *
 * Alleen KA45 + een default-preset.
 */

const PRESET_KA_TERMS = {
  ka45: [
    "koude oorlog",
    "wapenwedloop",
    "atoomdreiging",
    "NAVO",
    "warszawpact",
    "blokvorming",
    "Harry Truman",
    "Joseph Stalin",
    "Winston Churchill",
    "John F. Kennedy",
    "Nikita Chroesjtsjov",
    "Leonid Brezjnev",
    "Ronald Reagan",
    "Michail Gorbatsjov",
    "Mao Zedong",
    "Ho Chi Minh"
  ]
};

const DEFAULT_PRESETS = [
  {
    id: "all",
    label: "Vrij zoeken (geen KA-filter)",
    terms: []
  }
];

function buildKaPreset(kaRaw) {
  if (!kaRaw) return null;

  const kaStr = String(kaRaw).trim();
  const key = `ka${kaStr}`;
  const terms = PRESET_KA_TERMS[key];

  if (!terms || !Array.isArray(terms) || terms.length === 0) {
    return null;
  }

  return {
    id: key,
    label: `KA${kaStr}`,
    terms
  };
}

router.post("/search-preset", (req, res) => {
  try {
    console.log("[a13.searchPreset] HIT", req.body);

    const { ka } = req.body || {};

    if (ka) {
      const preset = buildKaPreset(ka);
      if (!preset) {
        return res.json({ ok: true, presets: [] });
      }
      return res.json({ ok: true, presets: [preset] });
    }

    return res.json({
      ok: true,
      presets: DEFAULT_PRESETS
    });
  } catch (err) {
    console.error("[a13.searchPreset] ERROR", err);
    res.status(500).json({
      ok: false,
      error: "Interne fout in search-preset"
    });
  }
});

module.exports = router;


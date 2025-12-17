const express = require("express");
const router = express.Router();

const { filterSources } = require("../services/sourceFilter.cjs");

let citoService = null;
let kleioService = null;
let historiekService = null;

try {
  citoService = require("../services/a28.cito.cjs");
  console.log("[A12] cito loaded");
} catch (e) {
  console.error("[A12] cito require failed:", e && (e.stack || e.message || e));
}

try {
  kleioService = require("../services/a27.kleio.cjs");
  console.log("[A12] kleio loaded");
} catch (e) {
  console.error("[A12] kleio require failed:", e && (e.stack || e.message || e));
  kleioService = null;
}

try {
  historiekService = require("../services/a29.historiek.cjs");
  console.log("[A12] historiek loaded");
} catch (e) {
  console.error("[A12] historiek require failed:", e && (e.stack || e.message || e));
  historiekService = null;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function asArray(x) {
  if (Array.isArray(x)) return x.filter(Boolean);
  if (typeof x === "string" && x.trim()) return [x.trim()];
  return [];
}

function normalizeRequestBody(body) {
  const filters = body.filters && typeof body.filters === "object" ? { ...body.filters } : {};

  const queryArr = asArray(body.query);
  const qfArr = asArray(body.qf);
  const termsArray = queryArr.length ? queryArr : qfArr;

  const rows = Number.isFinite(Number(body.rows)) ? Number(body.rows) : null;
  const limit = Number.isFinite(Number(body.limit)) ? Number(body.limit) : null;
  const maxN = rows ?? limit ?? 40;
  const cap = Math.max(1, Math.min(80, maxN));

  const providerRaw = (body.provider || "").toString().toLowerCase().trim();

  if (providerRaw === "cito") {
    filters.cito = true;
    filters.kleio = false;
    filters.historiek = false;
  } else if (providerRaw === "kleio") {
    filters.cito = false;
    filters.kleio = true;
    filters.historiek = false;
  } else if (providerRaw === "historiek") {
    filters.cito = false;
    filters.kleio = false;
    filters.historiek = true;
  } else if (providerRaw === "europeana") {
    filters.cito = false;
    filters.kleio = false;
    filters.historiek = false;
  }

  return { termsArray, filters, cap, providerRaw };
}

router.post("/search", async (req, res) => {
  try {
    const { termsArray, filters, cap, providerRaw } = normalizeRequestBody(req.body || {});
    const queryString = termsArray.join(" ").trim();

    if (providerRaw === "kleio" && !kleioService) {
      console.error("[A12] provider=kleio gevraagd maar kleioService is null");
    }
    if (providerRaw === "historiek" && !historiekService) {
      console.error("[A12] provider=historiek gevraagd maar historiekService is null");
    }

    let allResults = [];
    const promises = [];

    if (filters?.cito !== false && citoService) {
      try {
        if (filters.ka && !Array.isArray(filters.ka)) filters.ka = [filters.ka];
        const citoQ = filters.ka ? "" : queryString;
        const citoRes = citoService.searchCito({ query: citoQ, filters }) || [];
        allResults.push(...citoRes);
      } catch (e) {
        console.error("[A12] Cito error:", e && (e.stack || e.message || e));
      }
    }

    if (filters?.kleio !== false && kleioService) {
      promises.push(
        kleioService
          .searchKleio({ query: termsArray, filters })
          .then((r) => {
            if (Array.isArray(r)) allResults.push(...r);
          })
          .catch((e) => console.error("[A12] Kleio error:", e && (e.stack || e.message || e)))
      );
    }

    if (filters?.historiek !== false && historiekService) {
      promises.push(
        historiekService
          .searchHistoriek({ query: termsArray, filters })
          .then((r) => {
            if (Array.isArray(r)) allResults.push(...r);
          })
          .catch((e) =>
            console.error("[A12] Historiek error:", e && (e.stack || e.message || e))
          )
      );
    }

    await Promise.all(promises);

    if (filters.images === false) allResults = allResults.filter((i) => i.type !== "IMAGE");
    if (filters.text === false) allResults = allResults.filter((i) => i.type !== "TEXT");

    const hasAnyQuery = queryString.length > 0;
    const hasKa = Array.isArray(filters.ka) ? filters.ka.length > 0 : !!filters.ka;
    if (!hasAnyQuery && !hasKa) {
      return res.json({ sources: [], meta: { count: 0, droppedKleioEmpty: 0, droppedKleioNoise: 0 } });
    }

    const filtered = filterSources(allResults, { minTextLen: 80 });
    console.log(
      "[A12] droppedKleioEmpty:",
      filtered.droppedKleioEmpty,
      "droppedKleioNoise:",
      filtered.droppedKleioNoise
    );

    allResults = filtered.sources;

    if (allResults.length > cap) {
      allResults = shuffleArray(allResults).slice(0, cap);
    }

    res.json({
      sources: allResults,
      meta: {
        count: allResults.length,
        droppedKleioEmpty: filtered.droppedKleioEmpty,
        droppedKleioNoise: filtered.droppedKleioNoise,
      },
    });
  } catch (error) {
    console.error("[A12] Fout:", error && (error.stack || error.message || error));
    res.status(500).json({ error: "Error" });
  }
});

module.exports = router;


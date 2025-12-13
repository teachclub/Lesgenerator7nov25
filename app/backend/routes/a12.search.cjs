const express = require("express");
const router = express.Router();

let citoService = null;
let kleioService = null;

try {
  citoService = require("../services/a28.cito.cjs");
  console.log("[A12] cito loaded");
} catch (e) {
  console.error("[A12] cito require failed:", e && (e.stack || e.message || e));
  citoService = null;
}

try {
  kleioService = require("../services/a27.kleio.cjs");
  console.log("[A12] kleio loaded");
} catch (e) {
  console.error("[A12] kleio require failed:", e && (e.stack || e.message || e));
  kleioService = null;
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
    filters.kleio = false;
    filters.cito = true;
  } else if (providerRaw === "kleio") {
    filters.cito = false;
    filters.kleio = true;
  } else if (providerRaw === "europeana") {
    filters.cito = false;
    filters.kleio = false;
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

    await Promise.all(promises);

    if (filters.images === false) allResults = allResults.filter((i) => i.type !== "IMAGE");
    if (filters.text === false) allResults = allResults.filter((i) => i.type !== "TEXT");

    const hasAnyQuery = queryString.length > 0;
    const hasKa = Array.isArray(filters.ka) ? filters.ka.length > 0 : !!filters.ka;
    if (!hasAnyQuery && !hasKa) {
      return res.json({ sources: [], meta: { count: 0 } });
    }

    if (allResults.length > cap) {
      allResults = shuffleArray(allResults).slice(0, cap);
    }

    res.json({ sources: allResults, meta: { count: allResults.length } });
  } catch (error) {
    console.error("[A12] Fout:", error && (error.stack || error.message || error));
    res.status(500).json({ error: "Error" });
  }
});

module.exports = router;


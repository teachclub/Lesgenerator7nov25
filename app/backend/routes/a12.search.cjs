const express = require("express");
const router = express.Router();

let citoService, kleioService;
try {
  citoService = require("../services/a28.cito.cjs");
} catch (e) {}
try {
  kleioService = require("../services/a27.kleio.cjs");
} catch (e) {}

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

/**
 * Body-normalisatie:
 * - Oud: { query, filters }
 * - Nieuw/werkend in jouw calls: { qf, rows, provider, start }
 */
function normalizeRequestBody(body) {
  const filters = body.filters && typeof body.filters === "object" ? { ...body.filters } : {};

  // query kan komen uit: body.query (oud) of body.qf (nieuw)
  const queryArr = asArray(body.query);
  const qfArr = asArray(body.qf);

  const termsArray = queryArr.length ? queryArr : qfArr;

  // limit kan komen uit rows of limit
  const rows = Number.isFinite(Number(body.rows)) ? Number(body.rows) : null;
  const limit = Number.isFinite(Number(body.limit)) ? Number(body.limit) : null;
  const maxN = rows ?? limit ?? 40;
  const cap = Math.max(1, Math.min(80, maxN));

  // provider mapping -> filters.cito / filters.kleio
  const providerRaw = (body.provider || "").toString().toLowerCase().trim();
  if (providerRaw === "cito") {
    filters.kleio = false;
  } else if (providerRaw === "kleio") {
    filters.cito = false;
  } else if (providerRaw === "all" || providerRaw === "mix" || providerRaw === "") {
    // niets: beide aan
  } else if (providerRaw === "europeana") {
    // Europeana is hier (nog) niet aangesloten; geef dan bewust leeg terug ipv “random Cito”
    filters.cito = false;
    filters.kleio = false;
  }

  return { termsArray, filters, cap };
}

router.post("/search", async (req, res) => {
  try {
    const { termsArray, filters, cap } = normalizeRequestBody(req.body || {});
    const queryString = termsArray.join(" ").trim();

    let allResults = [];
    const promises = [];

    // 1) CITO
    if (filters?.cito !== false && citoService) {
      try {
        if (filters.ka && !Array.isArray(filters.ka)) {
          filters.ka = [filters.ka];
        }

        const citoQ = filters.ka ? "" : queryString;
        const citoRes = citoService.searchCito({ query: citoQ, filters });
        allResults.push(...citoRes);
      } catch (e) {
        console.error("Cito error:", e.message);
      }
    }

    // 2) KLEIO
    if (filters?.kleio !== false && kleioService) {
      promises.push(
        kleioService
          .searchKleio({ query: termsArray, filters })
          .then((r) => allResults.push(...r))
          .catch((e) => console.error("Kleio error:", e.message))
      );
    }

    await Promise.all(promises);

    // 3) NABEWERKING
    if (filters.images === false) allResults = allResults.filter((i) => i.type !== "IMAGE");
    if (filters.text === false) allResults = allResults.filter((i) => i.type !== "TEXT");

    // Als er geen query is én geen KA-filter, geef dan leeg terug (niet random Cito)
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
    console.error("[A12] Fout:", error);
    res.status(500).json({ error: "Error" });
  }
});

module.exports = router;


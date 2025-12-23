const express = require("express");
const router = express.Router();

const { filterSources } = require("../services/sourceFilter.cjs");

const KLEIO_ENABLED = true;

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

function isKaToken(s) {
  return /^KA\s*\d{1,2}$/i.test(String(s || "").trim());
}

const STOP = new Set([
  "de","het","een","en","of","maar","dus","dat","dit","die","deze","daar","hier",
  "wat","wie","waar","wanneer","waarom","hoe","welke","welk","is","zijn","was","waren",
  "wordt","werden","worden","heb","heeft","hebben","had",
  "met","zonder","voor","van","in","op","aan","bij","naar","door","tot","als","dan",
  "om","te","ook","nog","al","alleen","meer","meeste","minder","veel"
]);

function normalizeTerm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-z0-9áàäâéèëêíìïîóòöôúùüûç\- ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shrinkForKleio(termsArrayIn) {
  const raw = asArray(termsArrayIn).map(normalizeTerm).filter(Boolean);

  const cleaned = [];
  for (const t of raw) {
    if (!t) continue;
    if (isKaToken(t)) continue;
    const parts = t.split(" ").filter(Boolean);
    for (const p of parts) {
      if (p.length < 4) continue;
      if (STOP.has(p)) continue;
      cleaned.push(p);
    }
  }

  const uniq = [...new Set(cleaned)];
  uniq.sort((a, b) => b.length - a.length);
  return uniq.slice(0, 2);
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

function withTimeout(promise, ms, label) {
  return new Promise((resolve) => {
    let done = false;

    const t = setTimeout(() => {
      if (done) return;
      done = true;
      resolve({ ok: false, timeout: true, label });
    }, ms);

    Promise.resolve()
      .then(() => promise)
      .then((value) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve({ ok: true, value });
      })
      .catch((err) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve({ ok: false, error: err, label });
      });
  });
}

async function doSearch(termsArrayIn, filtersIn, capIn) {
  const started = Date.now();

  const termsArray = asArray(termsArrayIn);
  const filters = filtersIn && typeof filtersIn === "object" ? { ...filtersIn } : {};
  const cap = Number.isFinite(Number(capIn)) ? Math.max(1, Math.min(80, Number(capIn))) : 40;

  const queryString = termsArray.join(" ").trim();
  const kaOnlyQuery = termsArray.length === 1 && isKaToken(termsArray[0]) && !!filters.ka;

  const meta = {
    count: 0,
    droppedKleioEmpty: 0,
    droppedKleioNoise: 0,
    timeouts: [],
    errors: [],
    ms: 0,
  };

  let allResults = [];

  if (filters?.cito !== false && citoService) {
    try {
      if (filters.ka && !Array.isArray(filters.ka)) filters.ka = [filters.ka];
      const citoQ = filters.ka ? "" : queryString;
      const citoRes = citoService.searchCito({ query: citoQ, filters }) || [];
      if (Array.isArray(citoRes)) allResults.push(...citoRes);
    } catch (e) {
      meta.errors.push({ provider: "cito", message: e?.message ? String(e.message) : "onbekend" });
      console.error("[A12] Cito error:", e && (e.stack || e.message || e));
    }
  }

  const tasks = [];
  const PROVIDER_TIMEOUT_MS = 12000;

  if (KLEIO_ENABLED && filters?.kleio !== false && kleioService) {
    const kleioQuery = kaOnlyQuery ? [] : shrinkForKleio(termsArray);
    if (kleioQuery.length > 0 || filters?.ka) {
      tasks.push(
        withTimeout(
          kleioService.searchKleio({ query: kleioQuery, filters }),
          PROVIDER_TIMEOUT_MS,
          "kleio"
        )
      );
    }
  }

  const historiekEnabled = false;
  if (historiekEnabled && filters?.historiek !== false && historiekService) {
    tasks.push(
      withTimeout(
        historiekService.searchHistoriek({ query: termsArray, filters }),
        PROVIDER_TIMEOUT_MS,
        "historiek"
      )
    );
  }

  const results = await Promise.all(tasks);

  for (const r of results) {
    if (r.ok && Array.isArray(r.value)) {
      allResults.push(...r.value);
    } else if (r.timeout) {
      meta.timeouts.push(r.label);
      console.error("[A12] timeout:", r.label);
    } else if (r.error) {
      meta.errors.push({ provider: r.label, message: r.error?.message ? String(r.error.message) : "onbekend" });
      console.error("[A12] provider error:", r.label, r.error && (r.error.stack || r.error.message || r.error));
    }
  }

  if (filters.images === false) allResults = allResults.filter((i) => i.type !== "IMAGE");
  if (filters.text === false) allResults = allResults.filter((i) => i.type !== "TEXT");

  const hasAnyQuery = queryString.length > 0;
  const hasKa = Array.isArray(filters.ka) ? filters.ka.length > 0 : !!filters.ka;
  if (!hasAnyQuery && !hasKa) {
    meta.ms = Date.now() - started;
    return { sources: [], meta };
  }

  const filtered = filterSources(allResults, { minTextLen: 80, minTextLenKleio: 250 });
  console.log("[A12] droppedKleioEmpty:", filtered.droppedKleioEmpty, "droppedKleioNoise:", filtered.droppedKleioNoise);

  allResults = filtered.sources;

  if (allResults.length > cap) {
    allResults = shuffleArray(allResults).slice(0, cap);
  }

  meta.count = allResults.length;
  meta.droppedKleioEmpty = filtered.droppedKleioEmpty;
  meta.droppedKleioNoise = filtered.droppedKleioNoise;
  meta.ms = Date.now() - started;

  return { sources: allResults, meta };
}

router.doSearch = doSearch;

router.post("/search", async (req, res) => {
  try {
    const { termsArray, filters, cap } = normalizeRequestBody(req.body || {});
    const r = await doSearch(termsArray, filters, cap);
    res.json({
      sources: r.sources,
      meta: {
        count: r.meta.count,
        droppedKleioEmpty: r.meta.droppedKleioEmpty,
        droppedKleioNoise: r.meta.droppedKleioNoise,
        timeouts: r.meta.timeouts,
        errors: r.meta.errors,
        ms: r.meta.ms,
      },
    });
  } catch (error) {
    console.error("[A12] Fout:", error && (error.stack || error.message || error));
    res.status(500).json({ error: "Error" });
  }
});

module.exports = router;


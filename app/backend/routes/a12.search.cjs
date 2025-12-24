"use strict";

const express = require("express");
const router = express.Router();

const { filterSources } = require("../services/sourceFilter.cjs");

const KLEIO_ENABLED = true;

let citoService = null;
let kleioService = null;
let historiekService = null;

let kleioCache = null;
try {
  kleioCache = require("../services/kleioCache.cjs");
  console.log("[A12] kleioCache loaded");
} catch (e) {
  console.error("[A12] kleioCache require failed:", e && (e.stack || e.message || e));
  kleioCache = null;
}

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

  const cacheFirst = body.cacheFirst === undefined ? true : !!body.cacheFirst;
  const cacheMin = Number.isFinite(Number(body.cacheMin)) ? Math.max(0, Math.min(80, Number(body.cacheMin))) : 8;
  const cacheLimit = Number.isFinite(Number(body.cacheLimit)) ? Math.max(1, Math.min(80, Number(body.cacheLimit))) : 18;

  return { termsArray, filters, cap, providerRaw, cacheFirst, cacheMin, cacheLimit };
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

async function doSearch(termsArrayIn, filtersIn, capIn, optsIn) {
  const started = Date.now();

  const termsArray = asArray(termsArrayIn);
  const filters = filtersIn && typeof filtersIn === "object" ? { ...filtersIn } : {};
  const cap = Number.isFinite(Number(capIn)) ? Math.max(1, Math.min(80, Number(capIn))) : 40;

  const opts = optsIn && typeof optsIn === "object" ? { ...optsIn } : {};
  const cacheFirst = opts.cacheFirst === undefined ? true : !!opts.cacheFirst;
  const cacheMin = Number.isFinite(Number(opts.cacheMin)) ? Math.max(0, Math.min(80, Number(opts.cacheMin))) : 8;
  const cacheLimit = Number.isFinite(Number(opts.cacheLimit)) ? Math.max(1, Math.min(80, Number(opts.cacheLimit))) : 18;

  const queryString = termsArray.join(" ").trim();
  const kaOnlyQuery = termsArray.length === 1 && isKaToken(termsArray[0]) && !!filters.ka;

  const meta = {
    count: 0,
    droppedKleioEmpty: 0,
    droppedKleioNoise: 0,
    timeouts: [],
    errors: [],
    ms: 0,
    cache: { used: false, count: 0, ms: 0, min: cacheMin },
    liveKleio: { used: false, ms: 0, addedToCache: 0 },
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

  const hasAnyQuery = queryString.length > 0;
  const hasKa = Array.isArray(filters.ka) ? filters.ka.length > 0 : !!filters.ka;
  if (!hasAnyQuery && !hasKa) {
    meta.ms = Date.now() - started;
    return { sources: [], meta };
  }

  const PROVIDER_TIMEOUT_MS = 25000;

  const wantKleio = KLEIO_ENABLED && filters?.kleio !== false && !!kleioService;

  let kleioFromCache = [];
  if (
    wantKleio &&
    cacheFirst &&
    kleioCache &&
    typeof kleioCache.cacheSearchKleio === "function"
  ) {
    const t0 = Date.now();
    try {
      const tvStr = filters.tv ? String(filters.tv) : "";
      const kaStr = Array.isArray(filters.ka) ? String(filters.ka[0] || "") : (filters.ka ? String(filters.ka) : "");

      const cacheTerms = kaOnlyQuery ? [] : shrinkForKleio(termsArray);

      kleioFromCache = kleioCache.cacheSearchKleio({
        terms: cacheTerms,
        tv: tvStr,
        ka: kaStr ? kaStr : "",
        limit: cacheLimit,
      }) || [];

      // Filter cache Kleio meteen (zodat cache ook schoon blijft in UI)
      const cachedFiltered = filterSources(kleioFromCache, {
        minTextLen: 80,
        minTextLenKleio: 800,
        allowShortKleioWithImage: true,
      });

      meta.droppedKleioEmpty += cachedFiltered.droppedKleioEmpty;
      meta.droppedKleioNoise += cachedFiltered.droppedKleioNoise;

      kleioFromCache = cachedFiltered.sources;

      meta.cache.used = true;
      meta.cache.count = Array.isArray(kleioFromCache) ? kleioFromCache.length : 0;
    } catch (e) {
      meta.errors.push({ provider: "kleioCache", message: e?.message ? String(e.message) : "onbekend" });
      console.error("[A12] kleioCache error:", e && (e.stack || e.message || e));
    } finally {
      meta.cache.ms = Date.now() - t0;
    }
  }

  if (Array.isArray(kleioFromCache) && kleioFromCache.length) {
    allResults.push(...kleioFromCache);
  }

  const cacheEnough =
    cacheFirst &&
    !!kleioCache &&
    meta.cache.used === true &&
    meta.cache.count >= cacheMin &&
    meta.cache.count > 0;

  const shouldFetchLiveKleio = wantKleio && !cacheEnough;

  if (shouldFetchLiveKleio) {
    const kleioQuery = kaOnlyQuery ? [] : shrinkForKleio(termsArray);
    if (kleioQuery.length > 0 || filters?.ka) {
      const t0 = Date.now();
      meta.liveKleio.used = true;

      const r = await withTimeout(
        kleioService.searchKleio({ query: kleioQuery, filters }),
        PROVIDER_TIMEOUT_MS,
        "kleio"
      );

      meta.liveKleio.ms = Date.now() - t0;

      if (r.timeout) meta.timeouts.push("kleio");
      if (!r.ok && r.error) {
        meta.errors.push({ provider: "kleio", message: r.error?.message ? String(r.error.message) : "onbekend" });
      }

      if (r.ok && Array.isArray(r.value)) {
        const live = r.value || [];

        // Filter LIVE Kleio meteen, vóór cacheUpsertMany
        const liveFiltered = filterSources(live, {
          minTextLen: 80,
          minTextLenKleio: 800,
          allowShortKleioWithImage: true,
        });

        meta.droppedKleioEmpty += liveFiltered.droppedKleioEmpty;
        meta.droppedKleioNoise += liveFiltered.droppedKleioNoise;

        allResults.push(...liveFiltered.sources);

        if (kleioCache && typeof kleioCache.cacheUpsertMany === "function") {
          try {
            const up = kleioCache.cacheUpsertMany(liveFiltered.sources);
            meta.liveKleio.addedToCache = up && typeof up.added === "number" ? up.added : 0;
          } catch (e) {
            meta.errors.push({ provider: "kleioCacheUpsert", message: e?.message ? String(e.message) : "onbekend" });
            console.error("[A12] kleioCache upsert error:", e && (e.stack || e.message || e));
          }
        }
      }
    }
  }

  // (Historiek staat hier bewust “passief”; vinkje kan later weer aan)
  if (filters?.historiek && historiekService && typeof historiekService.searchHistoriek === "function") {
    try {
      const t0 = Date.now();
      const r = await withTimeout(
        historiekService.searchHistoriek({ query: termsArray, filters }),
        PROVIDER_TIMEOUT_MS,
        "historiek"
      );
      if (r.timeout) meta.timeouts.push("historiek");
      if (!r.ok && r.error) meta.errors.push({ provider: "historiek", message: r.error?.message ? String(r.error.message) : "onbekend" });
      if (r.ok && Array.isArray(r.value)) allResults.push(...r.value);
      meta.historiekMs = Date.now() - t0;
    } catch (e) {
      meta.errors.push({ provider: "historiek", message: e?.message ? String(e.message) : "onbekend" });
    }
  }

  // Shuffle + cap
  const shuffled = shuffleArray(allResults.slice());
  const limited = shuffled.slice(0, cap);

  meta.count = limited.length;
  meta.ms = Date.now() - started;

  return { sources: limited, meta };
}

router.post("/search", async (req, res) => {
  try {
    const { termsArray, filters, cap, cacheFirst, cacheMin, cacheLimit } = normalizeRequestBody(req.body || {});
    const r = await doSearch(termsArray, filters, cap, { cacheFirst, cacheMin, cacheLimit });
    res.json(r);
  } catch (e) {
    res.status(500).json({
      sources: [],
      meta: {
        count: 0,
        droppedKleioEmpty: 0,
        droppedKleioNoise: 0,
        timeouts: [],
        errors: [{ provider: "api", message: e?.message ? String(e.message) : "onbekend" }],
        ms: 0,
        cache: { used: false, count: 0, ms: 0, min: 8 },
        liveKleio: { used: false, ms: 0, addedToCache: 0 },
      },
    });
  }
});

module.exports = router;


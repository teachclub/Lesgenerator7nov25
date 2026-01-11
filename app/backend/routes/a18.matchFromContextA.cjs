"use strict";

const express = require("express");

let _poolSingleton = null;
function getPool() {
  if (_poolSingleton) return _poolSingleton;

  const tryModules = [
    "../services/pgPool.cjs",
    "../services/dbPool.cjs",
    "../services/pg.cjs",
    "../services/db.cjs",
    "../services/postgres.cjs",
  ];

  for (const m of tryModules) {
    try {
      const mod = require(m);
      if (typeof mod.getPool === "function") {
        _poolSingleton = mod.getPool();
        return _poolSingleton;
      }
      if (mod.pool && typeof mod.pool.query === "function") {
        _poolSingleton = mod.pool;
        return _poolSingleton;
      }
    } catch (_) {}
  }

  const { Pool } = require("pg");
  _poolSingleton = new Pool({ connectionString: process.env.DATABASE_URL });
  return _poolSingleton;
}

function normStr(v) {
  return String(v ?? "").trim();
}

function safeJsonParse(v) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const k = String(x ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function normalizeVraagType(s) {
  const t = normStr(s).toLowerCase();
  if (!t) return "";
  if (t.includes("verklar")) return "verklarend";
  if (t.includes("vergelijk")) return "vergelijkend";
  if (t.includes("beoordeel")) return "beoordelend";
  if (t.includes("beschrijf")) return "beschrijvend";
  return t;
}

function extractKaCodes(ka) {
  const out = [];
  const push = (v) => {
    const s = normStr(v).toUpperCase();
    const m = s.match(/\bKA\s*([0-9]{1,2})\b/);
    if (m && m[1]) out.push(`KA${m[1]}`);
  };

  if (Array.isArray(ka)) {
    for (const x of ka) push(x);
  } else if (typeof ka === "string") {
    for (const part of ka.split(/[,;]+/)) push(part);
  } else if (ka && typeof ka === "object") {
    if (Array.isArray(ka.KA)) for (const x of ka.KA) push(x);
  }

  return uniq(out);
}

function likeArray(tokens) {
  const out = [];
  for (const t of tokens || []) {
    const s = normStr(t);
    if (!s) continue;
    if (s.length < 2) continue;
    out.push(`%${s}%`);
  }
  return uniq(out);
}

const STOPWORDS_EXCLUDE = new Set([
  "de",
  "het",
  "een",
  "van",
  "met",
  "en",
  "of",
  "in",
  "op",
  "aan",
  "voor",
  "door",
  "bij",
  "naar",
  "tot",
  "uit",
  "over",
  "onder",
  "tussen",
  "zonder",
  "tegen",
  "als",
  "dan",
  "dat",
  "die",
  "dit",
  "maar",
  "ook",
  "nog",
  "wel",
  "geen",
  "niet",
  "meer",
  "minder",
  "zeer",
  "veel",
  "gebruik",
]);

function tokenizeStrings(strs, maxTokens, opts) {
  const out = [];
  const seen = new Set();

  const maxT = Number(maxTokens) || 18;
  const minLen = Math.max(3, Number(opts?.minLen) || 3);
  const stop = opts?.stopwords || null;

  const push = (tok) => {
    const t = normStr(tok).toLowerCase();
    if (!t) return;
    if (t.length < minLen) return;
    if (stop && stop.has(t)) return;
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  for (const s0 of strs || []) {
    const s = normStr(
      typeof s0 === "string" ? s0 : s0?.value ?? s0?.term ?? s0?.name ?? ""
    );
    if (!s) continue;

    const parts = s
      .replace(/[’']/g, "")
      .split(/[^a-zA-Z0-9à-ÿ]+/g)
      .filter(Boolean);

    for (const p of parts) push(p);

    if (out.length >= maxT) break;
  }

  return out.slice(0, maxT);
}

function topTermsFromWeighted(arr, n) {
  const xs = Array.isArray(arr) ? arr : [];
  const sorted = xs
    .map((x) => ({
      term: normStr(x?.term ?? x?.value ?? x),
      weight: Number(x?.weight ?? 0),
    }))
    .filter((x) => x.term)
    .sort((a, b) => (b.weight || 0) - (a.weight || 0));
  return sorted.slice(0, Number(n) || 14).map((x) => x.term);
}

function mapContextDimToFrontendDim(raw) {
  const s = normStr(raw).toUpperCase();
  if (!s) return null;

  if (s.includes("POLIT")) return "POLITIEK";
  if (s.includes("SOCIAAL")) return "SOCIAAL";
  if (s.includes("ECON")) return "SOCIAAL";
  if (s.includes("CULT")) return "CULTUREEL";
  if (s.includes("MENTAAL")) return "CULTUREEL";
  if (s.includes("INDIV")) return "INDIVIDUEEL";
  if (s.includes("PERSOON")) return "INDIVIDUEEL";

  return null;
}

function frontendDimToSourcesDimLowerArr(frontDim) {
  const d = normStr(frontDim).toUpperCase();
  if (!d) return [];
  if (d === "POLITIEK") return ["politiek", "political", "politiek-institutioneel"];
  if (d === "SOCIAAL")
    return ["sociaal", "sociaal_economisch", "sociaal-economisch", "social", "economic"];
  if (d === "CULTUREEL")
    return ["cultureel", "cultureel_mentaal", "cultureel-mentaal", "cultural", "mental"];
  if (d === "INDIVIDUEEL") return ["individueel", "individual", "persoonlijk"];
  return [];
}

function parseTvNumber(tv) {
  const s = normStr(tv).toUpperCase();
  if (!s) return null;

  let m = s.match(/\bTV\s*([0-9]{1,2})\b/);
  if (m && m[1]) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 10) return n;
  }

  m = s.match(/\bTIJDVAK\s*([0-9]{1,2})\b/);
  if (m && m[1]) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 10) return n;
  }

  const nums = s.match(/\b([0-9]{1,2})\b/g) || [];
  for (const t of nums) {
    const n = Number(t);
    if (Number.isFinite(n) && n >= 1 && n <= 10) return n;
  }

  return null;
}

function tvLikeForNumber(n) {
  const nn = Number(n);
  if (!Number.isFinite(nn) || nn < 1 || nn > 10) return [];
  return [`%TV${nn}%`, `%TV ${nn}%`, `%TIJDVAK ${nn}%`, `%TIJDVAK${nn}%`];
}

function tvLikeFromTvWithLookback(tv, lookback) {
  const out = [];
  const n = parseTvNumber(tv);
  if (!n) {
    if (tv) out.push(`%${String(tv).toUpperCase().trim()}%`);
    return uniq(out);
  }
  const lb = Math.max(0, Math.min(3, Number(lookback) || 0));
  for (let k = 0; k <= lb; k++) out.push(...tvLikeForNumber(n - k));
  return uniq(out);
}

async function loadLatestContextA(pool, questionKey) {
  const q = `
    SELECT context_a, meta, created_at
    FROM lessie.question_context_a
    WHERE question_key = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const r = await pool.query(q, [questionKey]);
  if (!r.rows?.length) return null;

  const row = r.rows[0];

  const parsedMeta = safeJsonParse(row.meta) || null;
  const parsedCtx = safeJsonParse(row.context_a);

  let items = null;
  if (Array.isArray(parsedCtx)) items = parsedCtx;
  else if (parsedCtx && Array.isArray(parsedCtx.contextA)) items = parsedCtx.contextA;
  else if (parsedCtx && Array.isArray(parsedCtx.context_a)) items = parsedCtx.context_a;

  if (!Array.isArray(items)) items = null;

  return { created_at: row.created_at, meta: parsedMeta, items };
}

function containsAnyKeyword(hay, kws) {
  const s = normStr(hay).toLowerCase();
  if (!s) return false;
  for (const k of kws || []) {
    const kk = normStr(k).toLowerCase();
    if (!kk) continue;
    if (s.includes(kk)) return true;
  }
  return false;
}

function cultureKeywordsFromContext(items) {
  const cultItem = (items || []).find(
    (x) => mapContextDimToFrontendDim(x?.dimensie || x?.dimension || x?.dim) === "CULTUREEL"
  );
  const terms = topTermsFromWeighted(cultItem?.terms_weighted || cultItem?.termsWeighted || [], 18);
  const ents = uniq(
    (cultItem?.entities || [])
      .map((e) => (typeof e === "string" ? e : e?.value))
      .filter(Boolean)
  );
  const seed = [
    "wetenschap",
    "wetenschappelijk",
    "techniek",
    "technologie",
    "uitvinding",
    "uitvinder",
    "innovatie",
    "machine",
    "stoom",
    "stoommachine",
    "patent",
    "kennis",
    "engineering",
    "empirisme",
    "royal",
    "society",
    "watt",
    "arkwright",
    "newcomen",
  ];
  return uniq(tokenizeStrings([...seed, ...terms, ...ents], 40, { minLen: 4 }));
}

async function querySources(pool, opts) {
  const {
    limit,
    textLike,
    entityLike,
    excludeLike,
    dimLowerArr,
    tvLike,
    kaCodes,
    excludeIds,
    matchTier,
  } = opts;

  const sql = `
    SELECT
      s.id::text AS id,
      s.title,
      s.provider,
      s.source_type AS "type",
      s.url,
      COALESCE(s.intro_text, s.caption_text, s.main_text, s.full_text) AS "description",
      s.image_url AS "imageUrl",
      s.full_text AS "fullText",

      (
        CASE
          WHEN (upper(coalesce(s.tv,'')) ~ '^(TV[ ]?[0-9]+|TIJDVAK[ ]?[0-9]+)$')
            THEN coalesce(NULLIF(s.tv,''), NULLIF(s.tv_pred,''), '')
          ELSE coalesce(NULLIF(s.tv_pred,''), NULLIF(s.tv,''), '')
        END
      ) AS "tv",

      COALESCE(NULLIF(s.ka_code,''), NULLIF(s.ka_pred,''), NULLIF(s.ka,''), '') AS "ka",

      lower(coalesce(NULLIF(s.primary_dim,''), NULLIF(s.dim_primary,''), '')) AS "dimPrimary",
      lower(coalesce(NULLIF(s.secondary_dim,''), NULLIF(s.dim_secondary,''), '')) AS "dimSecondary",

      (
        SELECT COUNT(DISTINCT se.value)
        FROM lessie.source_entities se
        WHERE se.source_id = s.id
          AND se.kind IN ('TERM','PERSON','DIM')
          AND cardinality($2::text[]) > 0
          AND se.value ILIKE ANY($2::text[])
      ) AS entity_hits

    FROM lessie.sources s
    WHERE
      NOT (s.id::text = ANY($9::text[]))

      AND (
        cardinality($4::text[]) = 0
        OR NOT (
          s.primary_dim IS NOT NULL OR s.secondary_dim IS NOT NULL OR
          s.dim_primary IS NOT NULL OR s.dim_secondary IS NOT NULL
        )
        OR lower(coalesce(s.primary_dim,'')) = ANY($4::text[])
        OR lower(coalesce(s.secondary_dim,'')) = ANY($4::text[])
        OR lower(coalesce(s.dim_primary,'')) = ANY($4::text[])
        OR lower(coalesce(s.dim_secondary,'')) = ANY($4::text[])
      )

      AND (
        cardinality($6::text[]) = 0
        OR upper(
          CASE
            WHEN (upper(coalesce(s.tv,'')) ~ '^(TV[ ]?[0-9]+|TIJDVAK[ ]?[0-9]+)$')
              THEN coalesce(NULLIF(s.tv,''), NULLIF(s.tv_pred,''), '')
            ELSE coalesce(NULLIF(s.tv_pred,''), NULLIF(s.tv,''), '')
          END
        ) ILIKE ANY($6::text[])
      )

      AND (
        cardinality($7::text[]) = 0
        OR upper(coalesce(s.ka_code,'')) = ANY($7::text[])
        OR upper(coalesce(s.ka_pred,'')) = ANY($7::text[])
      )

      AND (
        (cardinality($1::text[]) > 0 AND (
          s.title ILIKE ANY($1::text[])
          OR s.intro_text ILIKE ANY($1::text[])
          OR s.main_text ILIKE ANY($1::text[])
          OR s.caption_text ILIKE ANY($1::text[])
          OR s.full_text ILIKE ANY($1::text[])
        ))
        OR (cardinality($2::text[]) > 0 AND EXISTS (
          SELECT 1
          FROM lessie.source_entities se
          WHERE se.source_id = s.id
            AND se.kind IN ('TERM','PERSON','DIM')
            AND se.value ILIKE ANY($2::text[])
        ))
        OR (cardinality($1::text[]) = 0 AND cardinality($2::text[]) = 0)
      )

      AND NOT (
        cardinality($3::text[]) > 0 AND (
          s.title ILIKE ANY($3::text[])
          OR s.intro_text ILIKE ANY($3::text[])
          OR s.main_text ILIKE ANY($3::text[])
          OR s.caption_text ILIKE ANY($3::text[])
          OR s.full_text ILIKE ANY($3::text[])
          OR EXISTS (
            SELECT 1
            FROM lessie.source_entities seX
            WHERE seX.source_id = s.id
              AND seX.kind IN ('TERM','PERSON','DIM')
              AND seX.value ILIKE ANY($3::text[])
          )
        )
      )

    ORDER BY entity_hits DESC, s.id DESC
    LIMIT $5::int
  `;

  const params = [
    textLike || [],
    entityLike || [],
    excludeLike || [],
    (dimLowerArr || []).map((x) => String(x).toLowerCase()).filter(Boolean),
    Number(limit) || 6,
    (tvLike || []).map((x) => String(x).toUpperCase()),
    (kaCodes || []).map((x) => String(x).toUpperCase()),
    0,
    (excludeIds || []).map((x) => String(x)),
  ];

  const r = await pool.query(sql, params);
  const rows = r.rows || [];
  for (const row of rows) row.matchTier = matchTier || "";
  return rows;
}

function scoreForDim(row, dimFront, cultureKeywords) {
  const dim = normStr(dimFront).toUpperCase();
  const dp = normStr(row?.dimPrimary).toLowerCase();
  const ds = normStr(row?.dimSecondary).toLowerCase();

  let score = 0;

  const dimHints = frontendDimToSourcesDimLowerArr(dim);
  if (dimHints.includes(dp) || dimHints.includes(ds)) score += 100;

  const eh = Number(row?.entity_hits || 0);
  score += Math.min(40, eh * 10);

  const tier = normStr(row?.matchTier);
  if (tier === "strict_tokens") score += 20;
  else if (tier) score += 6;

  if (dim === "CULTUREEL") {
    const blob = `${row?.title || ""} ${row?.description || ""} ${row?.fullText || ""}`.slice(0, 4000);
    if (containsAnyKeyword(blob, cultureKeywords)) score += 18;
  }

  return score;
}

function assignUniqueBalanced(acc, limit, cultureKeywords, debug) {
  const dims = ["POLITIEK", "SOCIAAL", "CULTUREEL", "INDIVIDUEEL"];
  const cap = {};
  for (const d of dims) cap[d] = Number(limit) || 6;

  const cand = new Map();

  for (const d of dims) {
    for (const row of acc[d] || []) {
      const id = String(row?.id ?? "");
      if (!id) continue;
      if (!cand.has(id)) cand.set(id, []);
      cand.get(id).push({ dim: d, row });
    }
  }

  const assigned = {};
  const assignedScores = {};
  for (const d of dims) {
    assigned[d] = [];
    assignedScores[d] = new Map();
  }

  const fillCount = () => {
    const out = {};
    for (const d of dims) out[d] = assigned[d].length;
    return out;
  };

  const ids = Array.from(cand.keys());

  const singleIds = [];
  const multiIds = [];
  for (const id of ids) {
    const xs = cand.get(id) || [];
    if (xs.length <= 1) singleIds.push(id);
    else multiIds.push(id);
  }

  for (const id of singleIds) {
    const xs = cand.get(id) || [];
    if (!xs.length) continue;
    const { dim, row } = xs[0];
    const sc = scoreForDim(row, dim, cultureKeywords);
    assigned[dim].push(row);
    assignedScores[dim].set(id, sc);
  }

  multiIds.sort((a, b) => {
    const ax = cand.get(a) || [];
    const bx = cand.get(b) || [];
    const aBest = Math.max(...ax.map((x) => scoreForDim(x.row, x.dim, cultureKeywords)));
    const bBest = Math.max(...bx.map((x) => scoreForDim(x.row, x.dim, cultureKeywords)));
    return (bBest || 0) - (aBest || 0);
  });

  for (const id of multiIds) {
    const xs = cand.get(id) || [];
    if (!xs.length) continue;

    const needs = fillCount();
    let best = null;

    for (const x of xs) {
      const d = x.dim;
      const sc = scoreForDim(x.row, d, cultureKeywords);
      const need = Math.max(0, (cap[d] || 0) - (needs[d] || 0));

      const key = { dim: d, row: x.row, score: sc, need };
      if (!best) best = key;
      else {
        if ((key.need || 0) > (best.need || 0)) best = key;
        else if ((key.need || 0) === (best.need || 0) && (key.score || 0) > (best.score || 0)) best = key;
      }
    }

    if (!best) continue;
    assigned[best.dim].push(best.row);
    assignedScores[best.dim].set(id, best.score);
  }

  for (const d of dims) {
    const before = (acc[d] || []).length;

    assigned[d].sort((a, b) => {
      const ida = String(a?.id ?? "");
      const idb = String(b?.id ?? "");
      const sa = Number(assignedScores[d].get(ida) || 0);
      const sb = Number(assignedScores[d].get(idb) || 0);
      if (sb !== sa) return sb - sa;
      const eha = Number(a?.entity_hits || 0);
      const ehb = Number(b?.entity_hits || 0);
      if (ehb !== eha) return ehb - eha;
      return Number(idb) - Number(ida);
    });

    if (assigned[d].length > cap[d]) assigned[d] = assigned[d].slice(0, cap[d]);

    const removed = before - assigned[d].length;
    if (!debug[d]) debug[d] = { steps: [] };
    debug[d].steps.push({ step: "dedupe_assign", removed: removed > 0 ? removed : 0, total: assigned[d].length });
  }

  return assigned;
}

function usedIdsFromAcc(acc) {
  const ids = [];
  for (const rows of Object.values(acc || {})) {
    for (const r of rows || []) ids.push(String(r?.id ?? ""));
  }
  return uniq(ids.filter(Boolean));
}

module.exports = function a18_matchFromContextA() {
  const router = express.Router();

  router.post("/match-from-context-a", async (req, res) => {
    try {
      const { question_key, limit_per_dim } = req.body || {};
      if (!question_key) return res.status(400).json({ ok: false, error: "missing_question_key" });

      const pool = getPool();

      const ctx = await loadLatestContextA(pool, question_key);
      if (!ctx || !Array.isArray(ctx.items)) {
        return res.status(404).json({ ok: false, error: "context_a_not_found" });
      }

      const meta = ctx.meta || {};
      const tv = normStr(meta.tv || meta.TV || meta?.labels?.TV || "") || null;
      const kaCodes = extractKaCodes(meta.ka || meta.KA || meta?.labels?.KA || []);

      const vraagType = normalizeVraagType(
        req.body?.question_type || req.body?.vraagType || meta.vraagType || meta.question_type || ""
      );

      const tvLookback = vraagType === "verklarend" ? 1 : 0;
      const tvLikePrimary = tvLikeFromTvWithLookback(tv, tvLookback);
      const tvLikeWide = tvLikeFromTvWithLookback(tv, 3);

      const limit = Number(limit_per_dim) || 6;
      const acc0 = { POLITIEK: [], SOCIAAL: [], CULTUREEL: [], INDIVIDUEEL: [] };
      const debug = {
        POLITIEK: { steps: [] },
        SOCIAAL: { steps: [] },
        CULTUREEL: { steps: [] },
        INDIVIDUEEL: { steps: [] },
      };

      for (const item of ctx.items) {
        const dimFront = mapContextDimToFrontendDim(item.dimensie || item.dimension || item.dim);
        if (!dimFront) continue;

        const dimLowerArr = frontendDimToSourcesDimLowerArr(dimFront);

        const rawTerms = topTermsFromWeighted(item.terms_weighted || item.termsWeighted || [], 14);
        const rawEnts = uniq(
          (item.entities || [])
            .map((e) => (typeof e === "string" ? e : e?.value))
            .filter(Boolean)
        );
        const rawExcl = uniq(
          (item.exclude || [])
            .map((e) => (typeof e === "string" ? e : e?.value ?? e?.term))
            .filter(Boolean)
        );

        const tokens = tokenizeStrings([...rawTerms, ...rawEnts], 18);
        const exclTokens = tokenizeStrings(rawExcl, 12, { minLen: 5, stopwords: STOPWORDS_EXCLUDE });

        const textLike = likeArray(tokens);
        const entityLike = likeArray(tokens);
        const excludeLike = likeArray(exclTokens);

        const rowsStrict = await querySources(pool, {
          limit,
          textLike,
          entityLike,
          excludeLike,
          dimLowerArr,
          tvLike: tvLikePrimary,
          kaCodes,
          excludeIds: [],
          matchTier: "strict_tokens",
        });

        acc0[dimFront].push(...rowsStrict);
        debug[dimFront].steps.push({ step: "strict_tokens", added: (rowsStrict || []).length, total: acc0[dimFront].length });

        if (acc0[dimFront].length < limit) {
          const more = await querySources(pool, {
            limit: limit - acc0[dimFront].length,
            textLike: [],
            entityLike: [],
            excludeLike,
            dimLowerArr,
            tvLike: tvLikePrimary,
            kaCodes,
            excludeIds: [],
            matchTier: "fallback_notokens",
          });

          acc0[dimFront].push(...more);
          debug[dimFront].steps.push({ step: "fallback_notokens", added: (more || []).length, total: acc0[dimFront].length });
        }
      }

      const cultureKeywords = cultureKeywordsFromContext(ctx.items);

      const acc = assignUniqueBalanced(acc0, limit, cultureKeywords, debug);

      const usedIds = usedIdsFromAcc(acc);

      const dimsOrder = ["POLITIEK", "SOCIAAL", "CULTUREEL", "INDIVIDUEEL"];

      for (const dimFront of dimsOrder) {
        let need = Math.max(0, limit - (acc[dimFront]?.length || 0));
        if (!need) continue;

        const dimLowerArr = frontendDimToSourcesDimLowerArr(dimFront);

        const addUnique = (rows) => {
          const before = acc[dimFront].length;
          for (const r of rows || []) {
            const id = String(r?.id ?? "");
            if (!id) continue;
            if (usedIds.includes(id)) continue;
            acc[dimFront].push(r);
            usedIds.push(id);
          }
          return acc[dimFront].length - before;
        };

        const extra1 = await querySources(pool, {
          limit: need,
          textLike: [],
          entityLike: [],
          excludeLike: [],
          dimLowerArr,
          tvLike: tvLikePrimary,
          kaCodes,
          excludeIds: usedIds,
          matchTier: "refill_notokens",
        });
        let added = addUnique(extra1);
        debug[dimFront].steps.push({ step: "refill_notokens", added, total: acc[dimFront].length });

        need = Math.max(0, limit - (acc[dimFront]?.length || 0));
        if (!need) continue;

        const extra2 = await querySources(pool, {
          limit: need,
          textLike: [],
          entityLike: [],
          excludeLike: [],
          dimLowerArr,
          tvLike: tvLikePrimary,
          kaCodes: [],
          excludeIds: usedIds,
          matchTier: "refill_relax_ka",
        });
        added = addUnique(extra2);
        debug[dimFront].steps.push({ step: "refill_relax_ka", added, total: acc[dimFront].length });

        need = Math.max(0, limit - (acc[dimFront]?.length || 0));
        if (!need) continue;

        const extra3 = await querySources(pool, {
          limit: need,
          textLike: [],
          entityLike: [],
          excludeLike: [],
          dimLowerArr,
          tvLike: tvLikeWide,
          kaCodes: [],
          excludeIds: usedIds,
          matchTier: "refill_relax_tv_ka",
        });
        added = addUnique(extra3);
        debug[dimFront].steps.push({ step: "refill_relax_tv_ka", added, total: acc[dimFront].length });

        need = Math.max(0, limit - (acc[dimFront]?.length || 0));
        if (!need) continue;

        const extra4 = await querySources(pool, {
          limit: need,
          textLike: [],
          entityLike: [],
          excludeLike: [],
          dimLowerArr: [],
          tvLike: tvLikeWide,
          kaCodes: [],
          excludeIds: usedIds,
          matchTier: "refill_anydim",
        });
        added = addUnique(extra4);
        debug[dimFront].steps.push({ step: "refill_anydim", added, total: acc[dimFront].length });

        need = Math.max(0, limit - (acc[dimFront]?.length || 0));
        if (!need) continue;

        if ((acc[dimFront]?.length || 0) === 0) {
          const dup1 = await querySources(pool, {
            limit: need,
            textLike: [],
            entityLike: [],
            excludeLike: [],
            dimLowerArr,
            tvLike: tvLikeWide,
            kaCodes: [],
            excludeIds: [],
            matchTier: "dup_allowed",
          });

          const before = acc[dimFront].length;
          acc[dimFront].push(...(dup1 || []));
          const addedDup = acc[dimFront].length - before;
          debug[dimFront].steps.push({ step: "dup_allowed", added: addedDup, total: acc[dimFront].length });

          need = Math.max(0, limit - (acc[dimFront]?.length || 0));

          if (need && (acc[dimFront]?.length || 0) === 0) {
            const dup2 = await querySources(pool, {
              limit: need,
              textLike: [],
              entityLike: [],
              excludeLike: [],
              dimLowerArr: [],
              tvLike: tvLikeWide,
              kaCodes: [],
              excludeIds: [],
              matchTier: "dup_allowed_anydim",
            });

            const before2 = acc[dimFront].length;
            acc[dimFront].push(...(dup2 || []));
            const addedDup2 = acc[dimFront].length - before2;
            debug[dimFront].steps.push({ step: "dup_allowed_anydim", added: addedDup2, total: acc[dimFront].length });
          }
        }
      }

      return res.json({
        ok: true,
        question_key,
        appliedFilters: { tv, ka: kaCodes, tvLookback },
        sourcesByDim: acc,
        debug,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "match_failed",
        message: String(err?.message || err),
      });
    }
  });

  return router;
};


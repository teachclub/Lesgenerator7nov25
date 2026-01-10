"use strict";

const express = require("express");
const { Pool } = require("pg");

function getPool() {
  if (global.__LESSIE_PG_POOL) return global.__LESSIE_PG_POOL;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ontbreekt (nodig voor Postgre connectie).");

  global.__LESSIE_PG_POOL = new Pool({ connectionString: url });
  return global.__LESSIE_PG_POOL;
}

function safeJsonParse(s) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean).map((x) => String(x).trim()).filter(Boolean))];
}

function likeArray(terms) {
  return (terms || []).map((t) => `%${t}%`);
}

function topTermsFromWeighted(termsWeighted, maxN) {
  const out = [];
  for (const t of termsWeighted || []) {
    if (!t) continue;
    if (typeof t === "string") out.push(t);
    else if (typeof t === "object" && t.term) out.push(t.term);
  }
  return uniq(out).slice(0, maxN);
}

function tokenizeStrings(list, maxTokens) {
  const raw = uniq(list || []);
  const tokens = [];
  for (const s of raw) {
    const parts = String(s)
      .replace(/[’'"]/g, " ")
      .split(/[^0-9A-Za-zÀ-ÿ]+/g)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const p of parts) {
      const isNum = /^[0-9]+$/.test(p);
      if (isNum) {
        if (p.length >= 4) tokens.push(p);
        continue;
      }
      if (p.length >= 4) tokens.push(p);
    }
  }
  return uniq(tokens).slice(0, maxTokens || 18);
}

function mapContextDimToFrontendDim(dimRaw) {
  const d = String(dimRaw || "").toUpperCase().trim();
  if (d === "POLITIEK") return "POLITIEK";
  if (d === "INDIVIDUEEL") return "INDIVIDUEEL";
  if (d === "SOCIAAL" || d === "SOCIAAL_ECONOMISCH") return "SOCIAAL";
  if (d === "CULTUREEL" || d === "CULTUREEL_MENTAAL" || d === "CULTUREEL-MENTAAL") return "CULTUREEL";
  return null;
}

function frontendDimToSourcesDimLower(frontDim) {
  const d = String(frontDim || "").toUpperCase().trim();
  if (d === "POLITIEK") return "politiek";
  if (d === "SOCIAAL") return "sociaal";
  if (d === "CULTUREEL") return "cultureel";
  if (d === "INDIVIDUEEL") return "individueel";
  return null;
}

function dedupeByIdKeepOrder(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows || []) {
    const id = r && r.id != null ? String(r.id) : null;
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

function extractKaCodes(metaKa) {
  const out = [];
  const addFromString = (s) => {
    const m = String(s || "").match(/KA\d+/gi);
    if (m) out.push(...m.map((x) => x.toUpperCase()));
  };
  if (Array.isArray(metaKa)) {
    for (const x of metaKa) addFromString(x);
  } else if (metaKa) {
    addFromString(metaKa);
  }
  return uniq(out);
}

function normalizeVraagType(x) {
  const s = String(x || "").trim().toLowerCase();
  if (!s) return "";
  if (s.startsWith("verklaar")) return "verklarend";
  if (s.includes("explain")) return "verklarend";
  if (s.includes("caus")) return "verklarend";
  return s;
}

function parseTvNumber(tv) {
  if (!tv) return null;
  const s = String(tv).toUpperCase();

  let m = s.match(/TV\s*([0-9]{1,2})/);
  if (m && m[1]) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 10) return n;
  }

  m = s.match(/TIJDVAK\s*([0-9]{1,2})/);
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
  return [
    `%TV${nn}%`,
    `%TV ${nn}%`,
    `%TIJDVAK ${nn}%`,
    `%TIJDVAK${nn}%`,
  ];
}

function tvLikeFromTvWithLookback(tv, lookback) {
  const out = [];
  const n = parseTvNumber(tv);
  if (!n) {
    if (tv) out.push(`%${String(tv).toUpperCase().trim()}%`);
    return uniq(out);
  }

  const lb = Math.max(0, Math.min(3, Number(lookback) || 0));
  for (let k = 0; k <= lb; k++) {
    out.push(...tvLikeForNumber(n - k));
  }
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
  if (!r.rows.length) return null;

  const row = r.rows[0];
  const parsed = safeJsonParse(row.context_a);

  let items = null;
  if (Array.isArray(parsed)) items = parsed;
  else if (parsed && Array.isArray(parsed.contextA)) items = parsed.contextA;
  else if (parsed && Array.isArray(parsed.context_a)) items = parsed.context_a;

  if (!Array.isArray(items)) items = null;

  return { created_at: row.created_at, meta: row.meta || null, items };
}

async function matchSourcesForDim(pool, opts) {
  const {
    limit,
    textLike,
    entityLike,
    excludeLike,
    dimLower,
    tvLike,
    kaCodes,
    kaLike,
  } = opts;

  const sql = `
    SELECT
      s.id,
      s.title,
      s.provider,
      s.source_type AS "type",
      s.url,
      COALESCE(s.intro_text, s.caption_text, s.main_text, s.full_text) AS "description",
      s.image_url AS "imageUrl",
      s.full_text AS "fullText",
      s.tv,
      s.ka,
      COUNT(DISTINCT se.value) FILTER (WHERE cardinality($2::text[]) > 0 AND se.value ILIKE ANY($2::text[])) AS entity_hits
    FROM lessie.sources s
    LEFT JOIN lessie.source_entities se
      ON se.source_id = s.id
     AND se.kind IN ('TERM','PERSON','DIM')
    WHERE
      (
        $4::text IS NULL
        OR NOT (
          s.primary_dim IS NOT NULL OR s.secondary_dim IS NOT NULL OR
          s.dim_primary IS NOT NULL OR s.dim_secondary IS NOT NULL
        )
        OR $4 = ANY(ARRAY[
          lower(coalesce(s.primary_dim,'')),
          lower(coalesce(s.secondary_dim,'')),
          lower(coalesce(s.dim_primary,'')),
          lower(coalesce(s.dim_secondary,''))
        ])
      )
      AND (
        cardinality($6::text[]) = 0
        OR upper(coalesce(s.tv,'')) ILIKE ANY($6::text[])
        OR upper(coalesce(s.tv_pred,'')) ILIKE ANY($6::text[])
      )
      AND (
        cardinality($7::text[]) = 0
        OR upper(coalesce(s.ka_code,'')) = ANY($7::text[])
        OR upper(coalesce(s.ka_pred,'')) = ANY($7::text[])
        OR upper(coalesce(s.ka,'')) ILIKE ANY($8::text[])
        OR upper(coalesce(s.ka_full,'')) ILIKE ANY($8::text[])
        OR upper(coalesce(s.ka_top3,'')) ILIKE ANY($8::text[])
      )
      AND (
        (cardinality($1::text[]) > 0 AND (
          s.title ILIKE ANY($1::text[])
          OR s.intro_text ILIKE ANY($1::text[])
          OR s.main_text ILIKE ANY($1::text[])
          OR s.caption_text ILIKE ANY($1::text[])
          OR s.full_text ILIKE ANY($1::text[])
        ))
        OR (cardinality($2::text[]) > 0 AND se.value ILIKE ANY($2::text[]))
      )
      AND NOT (
        cardinality($3::text[]) > 0 AND (
          s.title ILIKE ANY($3::text[])
          OR s.intro_text ILIKE ANY($3::text[])
          OR s.main_text ILIKE ANY($3::text[])
          OR s.caption_text ILIKE ANY($3::text[])
          OR s.full_text ILIKE ANY($3::text[])
          OR se.value ILIKE ANY($3::text[])
        )
      )
    GROUP BY s.id
    ORDER BY entity_hits DESC, s.id DESC
    LIMIT $5::int
  `;

  const params = [
    textLike || [],
    entityLike || [],
    excludeLike || [],
    dimLower || null,
    Number(limit) || 6,
    (tvLike || []).map((x) => String(x).toUpperCase()),
    (kaCodes || []).map((x) => String(x).toUpperCase()),
    (kaLike || []).map((x) => String(x).toUpperCase()),
  ];

  const r = await pool.query(sql, params);
  return r.rows || [];
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
      const tv = meta.tv || null;
      const kaCodes = extractKaCodes(meta.ka);

      const vraagType = normalizeVraagType(req.body?.question_type || req.body?.vraagType || meta.vraagType || meta.question_type || "");
      const tvLookback = vraagType === "verklarend" ? 1 : 0;

      const tvLikePrimary = tvLikeFromTvWithLookback(tv, tvLookback);
      const kaLikeStrict = likeArray(kaCodes);

      const limit = Number(limit_per_dim) || 6;
      const acc = { POLITIEK: [], SOCIAAL: [], CULTUREEL: [], INDIVIDUEEL: [] };

      for (const item of ctx.items) {
        const dimFront = mapContextDimToFrontendDim(item.dimensie || item.dimension || item.dim);
        if (!dimFront) continue;

        const rawTerms = topTermsFromWeighted(item.terms_weighted || item.termsWeighted || [], 14);
        const rawEnts = uniq(item.entities || []);
        const rawExcl = uniq(item.exclude || []);

        const tokens = tokenizeStrings([...rawTerms, ...rawEnts], 18);
        const exclTokens = tokenizeStrings(rawExcl, 12);

        const textLike = likeArray(tokens);
        const entityLike = likeArray(tokens);
        const excludeLike = likeArray(exclTokens);

        const dimLower = frontendDimToSourcesDimLower(dimFront);

        const run = async (tvLike, kaCodesRun, kaLikeRun) => {
          return matchSourcesForDim(pool, {
            limit,
            textLike,
            entityLike,
            excludeLike,
            dimLower,
            tvLike,
            kaCodes: kaCodesRun,
            kaLike: kaLikeRun,
          });
        };

        let rows = [];

        // 1) Strict: TV(+lookback) + KA
        rows = rows.concat(await run(tvLikePrimary, kaCodes, kaLikeStrict));

        // 2) Relax KA, maar blijf binnen TV(+lookback)
        if (rows.length < limit) {
          rows = rows.concat(await run(tvLikePrimary, [], []));
        }

        // 3) Pas als het nog niet vult: helemaal los
        if (rows.length < limit) {
          rows = rows.concat(await run([], [], []));
        }

        acc[dimFront].push(...rows);
      }

      const sourcesByDim = {
        POLITIEK: dedupeByIdKeepOrder(acc.POLITIEK).slice(0, limit),
        SOCIAAL: dedupeByIdKeepOrder(acc.SOCIAAL).slice(0, limit),
        CULTUREEL: dedupeByIdKeepOrder(acc.CULTUREEL).slice(0, limit),
        INDIVIDUEEL: dedupeByIdKeepOrder(acc.INDIVIDUEEL).slice(0, limit),
      };

      return res.json({
        ok: true,
        question_key,
        sourcesByDim,
        context_a_created_at: ctx.created_at,
        appliedFilters: {
          tv,
          ka: kaCodes,
          vraagType: vraagType || null,
          tvLookback,
        },
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "match_from_context_a_failed",
        message: String(err && err.message ? err.message : err),
      });
    }
  });

  return router;
};


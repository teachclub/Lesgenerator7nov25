"use strict";

const express = require("express");
const router = express.Router();

let _poolSingleton = null;

function getPool() {
  if (_poolSingleton) return _poolSingleton;

  const { Pool } = require("pg");

  if (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim() !== "") {
    _poolSingleton = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
    });
    return _poolSingleton;
  }

  _poolSingleton = new Pool({
    host: process.env.PGHOST || "127.0.0.1",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || undefined,
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE || "lessie2000",
  });

  return _poolSingleton;
}

const CANON_DIMS = ["POLITIEK", "SOCIAAL_ECONOMISCH", "CULTUREEL_MENTAAL", "INDIVIDUEEL"];

function normTV(tv) {
  const s = String(tv || "").toUpperCase();
  const m = s.match(/TV\s*([0-9]{1,2})/);
  return m ? `TV${m[1]}` : "";
}

function tvNum(tv) {
  const m = String(tv || "").toUpperCase().match(/TV\s*([0-9]{1,2})/);
  return m ? Number(m[1]) : null;
}

function buildAllowedTVs(tvNorm, lookback) {
  const n = tvNum(tvNorm);
  if (!n) return [];
  const lb = Number(lookback || 0) || 0;
  const out = [];
  for (let i = Math.max(1, n - lb); i <= n; i++) out.push(`TV${i}`);
  return out;
}

function normDim(d) {
  const s = String(d || "").trim();
  if (!s) return "";
  const u = s.toUpperCase();

  if (u === "SOCIAAL") return "SOCIAAL_ECONOMISCH";
  if (u === "CULTUREEL") return "CULTUREEL_MENTAAL";

  if (CANON_DIMS.includes(u)) return u;

  const l = s.toLowerCase();
  if (l.includes("polit")) return "POLITIEK";
  if (l.includes("sociaal") || l.includes("econom")) return "SOCIAAL_ECONOMISCH";
  if (l.includes("cultureel") || l.includes("mentaal")) return "CULTUREEL_MENTAAL";
  if (l.includes("individ")) return "INDIVIDUEEL";

  return "";
}

function initSourcesByDim() {
  return {
    POLITIEK: [],
    SOCIAAL_ECONOMISCH: [],
    CULTUREEL_MENTAAL: [],
    INDIVIDUEEL: [],
  };
}

function toText(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(" ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function pickTokens(meta) {
  const begr = meta && Array.isArray(meta.begrippen) ? meta.begrippen : [];
  return begr
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .slice(0, 25);
}

function tokenHits(text, tokensLower) {
  if (!tokensLower.length) return 0;
  const t = String(text || "").toLowerCase();
  let c = 0;
  for (const tok of tokensLower) {
    if (tok && t.includes(tok)) c += 1;
  }
  return c;
}

function kaUpperListFromAny(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim().toUpperCase()).filter(Boolean);
  const s = String(v || "").trim();
  return s ? [s.toUpperCase()] : [];
}

function kaHit(src, kaUpperList) {
  if (!kaUpperList.length) return false;

  const kaCode = String(src.ka_code || "").toUpperCase();
  if (kaUpperList.includes(kaCode)) return true;

  const predText = String(src.ka_pred || "").toUpperCase();
  for (const k of kaUpperList) {
    if (k && predText.includes(k)) return true;
  }

  const legacy = String(src.ka || "").toUpperCase();
  for (const k of kaUpperList) {
    if (k && legacy.includes(k)) return true;
  }

  return false;
}

function guessSourceDims(src) {
  const dims = new Set();

  const add = (v) => {
    const d = normDim(v);
    if (d) dims.add(d);
  };

  add(src.dim_primary);
  add(src.dim_secondary);
  add(src.primary_dim);
  add(src.secondary_dim);

  add(src.dimPrimary);
  add(src.dimSecondary);

  return dims;
}

function buildTextBlob(src) {
  const parts = [
    src.title,
    src.intro_text,
    src.main_text,
    src.caption_text,
    src.full_text,
    src.ka_full,
    src.terms,
    src.persons,
    src.years,
  ].map(toText);

  return parts.filter(Boolean).join("\n");
}

function summarize(text, maxLen) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

async function loadLatestContextA(pool, question_key) {
  const r = await pool.query(
    `select * from lessie.question_context_a
     where question_key = $1
     order by created_at desc, id desc
     limit 1`,
    [question_key]
  );
  return r.rows && r.rows[0] ? r.rows[0] : null;
}

async function loadQuestionMeta(pool, question_key) {
  const r = await pool.query(
    `select question_key, tv, ka
     from lessie.questions
     where question_key = $1
     limit 1`,
    [question_key]
  );
  return r.rows && r.rows[0] ? r.rows[0] : null;
}

router.post("/match-from-context-a", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    const pool = getPool();
    const body = req.body || {};
    const question_key = String(body.question_key || "").trim();

    if (!question_key) {
      return res.status(400).json({ ok: false, error: "question_key ontbreekt" });
    }

    const hardLimit = Math.max(1, Math.min(12, Number(body.hardLimit || 6) || 6));
    const tvLookback = Number(body.tvLookback || 0) || 0;

    const ca = await loadLatestContextA(pool, question_key);
    const qmeta = await loadQuestionMeta(pool, question_key);

    let meta = null;
    if (ca) {
      meta =
        ca.meta_json ||
        ca.meta ||
        ca.payload ||
        ca.data ||
        ca.context ||
        ca.metaJson ||
        ca.parsed ||
        null;

      if (typeof meta === "string") {
        try {
          meta = JSON.parse(meta);
        } catch (_) {
          meta = null;
        }
      }
    }

    const tv_norm =
      normTV(body.tv) ||
      normTV(meta && meta.tv) ||
      normTV(ca && ca.tv) ||
      normTV(qmeta && qmeta.tv) ||
      "";

    const kaUpperList =
      kaUpperListFromAny(body.ka) ||
      kaUpperListFromAny(meta && meta.ka) ||
      kaUpperListFromAny(ca && ca.ka) ||
      kaUpperListFromAny(qmeta && qmeta.ka) ||
      [];

    const tokens = Array.isArray(body.tokens)
      ? body.tokens.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 25)
      : pickTokens(meta);

    const tokensLower = tokens.map((t) => String(t).toLowerCase()).filter(Boolean);

    const allowedTVs = buildAllowedTVs(tv_norm, tvLookback);
    const tvFilterArray = allowedTVs.length ? allowedTVs : tv_norm ? [tv_norm] : [];

    const srcRes = await pool.query(
      `
      select s.*
      from lessie.sources s
      where
        ($1::text[] is null)
        or (upper(coalesce(s.tv_pred, s.tv, '')) = any($1::text[]))
      limit 2500
      `,
      [tvFilterArray.length ? tvFilterArray : null]
    );

    const sources = Array.isArray(srcRes.rows) ? srcRes.rows : [];

    const scored = sources.map((src) => {
      const blob = buildTextBlob(src);
      const hits = tokenHits(blob, tokensLower);
      const hasKa = kaHit(src, kaUpperList);

      let tier = "tv_only";
      if (hasKa && hits > 0) tier = "ka_tokens_tv";
      else if (hasKa) tier = "strict_ka_tv";
      else if (hits > 0) tier = "relax_ka_tokens_tv";

      const score = (hasKa ? 2 : 0) + hits;

      return {
        src,
        score,
        hits,
        tier,
        blob,
        hasKa,
        dims: guessSourceDims(src),
      };
    });

    const out = initSourcesByDim();
    const usedIds = new Set();

    const scoredSortedAll = scored
      .slice()
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.src.id).localeCompare(String(b.src.id));
      });

    for (const dim of CANON_DIMS) {
      let list = scored
        .filter((x) => x.dims.has(dim))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return String(a.src.id).localeCompare(String(b.src.id));
        })
        .filter((x) => !usedIds.has(String(x.src.id)))
        .slice(0, hardLimit);

      while (list.length < hardLimit) {
        const next = scoredSortedAll.find((x) => {
          const id = String(x.src.id);
          if (usedIds.has(id)) return false;
          if (!x.hasKa && x.hits < 1) return false;
          return true;
        });
        if (!next) break;
        list = list.concat([next]);
        usedIds.add(String(next.src.id));
      }

      const mapped = list
        .slice(0, hardLimit)
        .map((x) => {
          const s = x.src;
          const tvOut = normTV(s.tv_pred || s.tv) || tv_norm;
          const kaOut = String(s.ka_code || "").toUpperCase();

          return {
            id: String(s.id),
            title: s.title || "",
            provider: s.provider || "",
            type: s.source_type || "",
            url: s.url || null,
            tv: tvOut,
            ka: kaOut,
            dimPrimary: s.dim_primary || "",
            dimSecondary: s.dim_secondary || "",
            entity_hits: String(x.hits),
            matchTier: x.tier,
            description: summarize(x.blob, 320),
            fullText: summarize(x.blob, 1200),
            imageUrl: s.image_url || null,
          };
        });

      for (const row of list) usedIds.add(String(row.src.id));
      out[dim] = mapped;
    }

    return res.json({
      ok: true,
      question_key,
      appliedFilters: {
        tv: tv_norm,
        ka: kaUpperList,
        tvLookback,
      },
      sourcesByDim: out,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "match-from-context-a faalde",
      details: err && err.message ? err.message : String(err),
    });
  }
});

module.exports = router;


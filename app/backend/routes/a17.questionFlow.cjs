"use strict";

/*
routes/a17.questionFlow.cjs

Implementeert 4 endpoints:
- POST /api/main/suggest
- POST /api/main/commit
- POST /api/sub/suggest
- POST /api/sub/commit-and-profile

Extra (nieuw):
- /sub/commit-and-profile triggert nu óók automatisch Context_A via interne POST naar /api/context-a
  (dus: je hoeft niet meer handmatig /api/context-a te curl’en)

Gebruikt:
- prompts/questionFlow.prompts.cjs
- services/a05.gemini.cjs (getGeminiSuggestions)
- services/questionEntities.cjs (makeQuestionKey, extractEntitiesWithGemini, upsertQuestionEntities)

DB:
- lessie.questions (MAIN/SUB)
- lessie.question_entities
- lessie.question_profiles
- lessie.question_context_a (via /api/context-a route)
*/

const express = require("express");
const { Pool } = require("pg");

const { getGeminiSuggestions } = require("../services/a05.gemini.cjs");
const {
  makeQuestionKey,
  extractEntitiesWithGemini,
  upsertQuestionEntities,
} = require("../services/questionEntities.cjs");

const {
  mainSuggestPrompt,
  subSuggestPrompt,
  profileBuildPrompt,
} = require("../prompts/questionFlow.prompts.cjs");

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function safeJsonParse(s) {
  const txt = String(s || "").trim();

  try {
    return JSON.parse(txt);
  } catch (_) {}

  const m = txt.match(/\{[\s\S]*\}$/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch (_) {}
  }

  const m2 =
    txt.match(/```json\s*([\s\S]*?)```/i) || txt.match(/```\s*([\s\S]*?)```/);
  if (m2) {
    try {
      return JSON.parse(String(m2[1] || "").trim());
    } catch (_) {}
  }

  return null;
}

function normDim(d) {
  const x = String(d || "").trim().toUpperCase();
  if (x === "POLITIEK") return "POLITIEK";
  if (x === "SOCIAAL" || x === "SOCIAAL_ECONOMISCH") return "SOCIAAL_ECONOMISCH";
  if (x === "CULTUREEL" || x === "CULTUREEL_MENTAAL") return "CULTUREEL_MENTAAL";
  if (x === "INDIVIDUEEL") return "INDIVIDUEEL";
  return null;
}


function buildPool() {
  const cs =
    process.env.DATABASE_URL ||
    process.env.PGURL ||
    process.env.PG_CONNECTION_STRING ||
    "postgresql:///lessie2000";
  return new Pool({ connectionString: cs });
}

function toKaList(ka) {
  if (!ka) return [];
  if (Array.isArray(ka)) return ka.map((x) => String(x || "").trim()).filter(Boolean);
  const s = String(ka || "").trim();
  return s ? [s] : [];
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(arr) ? arr : []) {
    const s = String(v || "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function buildBegrippenFromProfile(profile) {
  const sig = profile?.signals || {};
  const out = [];
  const pushMany = (arr, maxN) => {
    for (const v of Array.isArray(arr) ? arr : []) {
      if (out.length >= maxN) break;
      const s = String(v || "").trim();
      if (!s) continue;
      out.push(s);
    }
  };

  pushMany(sig.keywords, 6);
  if (out.length < 6) pushMany(sig.orgs, 6);
  if (out.length < 6) pushMany(sig.persons, 6);

  return uniq(out).slice(0, 6);
}

async function upsertQuestion({
  pool,
  question_key,
  scope,
  parent_key,
  text,
  dim,
  ka,
  tv,
  fingerprint,
}) {
  const client = await pool.connect();
  try {
    await client.query(
      `
      INSERT INTO lessie.questions(question_key, scope, parent_key, text, dim, ka, tv, fingerprint)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (question_key) DO UPDATE SET
        scope = EXCLUDED.scope,
        parent_key = EXCLUDED.parent_key,
        text = EXCLUDED.text,
        dim = EXCLUDED.dim,
        ka = EXCLUDED.ka,
        tv = EXCLUDED.tv,
        fingerprint = EXCLUDED.fingerprint,
        updated_at = now()
      `,
      [
        question_key,
        scope,
        parent_key || null,
        text || null,
        dim || null,
        ka || null,
        tv || null,
        fingerprint || null,
      ]
    );
  } finally {
    client.release();
  }
}

async function upsertProfile({ pool, question_key, profile, model }) {
  const dim = profile?.dim || {};
  const signals = profile?.signals || {};
  const yearBack = clamp(Number(signals.year_window_back ?? 0), 0, 50);
  const yearFwd = clamp(Number(signals.year_window_forward ?? 0), 0, 50);

  const client = await pool.connect();
  try {
    await client.query(
      `
      INSERT INTO lessie.question_profiles(
        question_key,
        dim_politiek_text,
        dim_sociaal_text,
        dim_cultureel_text,
        dim_individueel_text,
        conclusie_text,
        afweging_text,
        year_window_back,
        year_window_forward,
        model,
        raw_json
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
      ON CONFLICT (question_key) DO UPDATE SET
        dim_politiek_text = EXCLUDED.dim_politiek_text,
        dim_sociaal_text = EXCLUDED.dim_sociaal_text,
        dim_cultureel_text = EXCLUDED.dim_cultureel_text,
        dim_individueel_text = EXCLUDED.dim_individueel_text,
        conclusie_text = EXCLUDED.conclusie_text,
        afweging_text = EXCLUDED.afweging_text,
        year_window_back = EXCLUDED.year_window_back,
        year_window_forward = EXCLUDED.year_window_forward,
        model = EXCLUDED.model,
        raw_json = EXCLUDED.raw_json,
        updated_at = now()
      `,
      [
        question_key,
        dim.POLITIEK?.answer || null,
        dim.SOCIAAL?.answer || null,
        dim.CULTUREEL?.answer || null,
        dim.INDIVIDUEEL?.answer || null,
        profile?.conclusie || null,
        profile?.afweging || null,
        yearBack,
        yearFwd,
        model || null,
        JSON.stringify(profile || {}),
      ]
    );
  } finally {
    client.release();
  }

  return { year_window_back: yearBack, year_window_forward: yearFwd };
}

function entitiesFromSignals(signals) {
  const out = [];
  const addMany = (kind, arr, conf) => {
    for (const v of Array.isArray(arr) ? arr : []) {
      const s = String(v || "").trim();
      if (!s) continue;
      out.push({ kind, value: s, confidence: conf });
    }
  };

  addMany("TERM", signals.keywords, 0.8);
  addMany("PERSON", signals.persons, 0.8);
  addMany("ORG", signals.orgs, 0.8);
  addMany("PLACE", signals.places, 0.8);

  const years = Array.isArray(signals.years) ? signals.years : [];
  for (const y of years) {
    const s = String(y || "").trim();
    if (!s) continue;
    out.push({ kind: "YEAR", value: s, confidence: 0.8 });
  }

  return out;
}

async function postContextAInternal(payload, timeoutMs) {
  const port = Number(process.env.PORT || 8080);
  const url = `http://127.0.0.1:${port}/api/context-a`;

  if (typeof fetch !== "function") {
    return { ok: false, error: "fetch_not_available" };
  }

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), Math.max(1000, Number(timeoutMs || 20000)));

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload || {}),
      signal: ac.signal,
    });

    const txt = await r.text();
    const parsed = safeJsonParse(txt);

    if (!r.ok) {
      return { ok: false, status: r.status, raw: txt, parsed };
    }
    return { ok: true, parsed: parsed || null, raw: txt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  } finally {
    clearTimeout(to);
  }
}

module.exports = function questionFlowRouterFactory() {
  const router = express.Router();
  const pool = buildPool();

  router.post(
    "/main/suggest",
    express.json({ limit: "1mb" }),
    async (req, res) => {
      try {
        const seedText = String(req.body?.seedText || "").trim();
        const chips = Array.isArray(req.body?.chips) ? req.body.chips : [];
        const prefilter = req.body?.prefilter || {};
        const bijprompt = req.body?.bijprompt || null;

        if (!seedText) {
          return res.status(400).json({ ok: false, error: "seedText ontbreekt" });
        }

        const prompt = mainSuggestPrompt({
          seedText,
          chips,
          prefilter,
          bijprompt,
        });

        const raw = await getGeminiSuggestions(prompt, {
          timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 45000),
        });

        const parsed = safeJsonParse(raw);
        const candidates = Array.isArray(parsed?.candidates) ? parsed.candidates : [];

        const cleaned = candidates
          .map((c) => ({
            text: String(c?.text || "").trim(),
            label: String(c?.label || "").trim(),
          }))
          .filter((c) => c.text)
          .slice(0, 3);

        if (cleaned.length !== 3) {
          return res.status(502).json({
            ok: false,
            error: "Gemini gaf geen 3 candidates",
            raw,
          });
        }

        return res.json({ ok: true, candidates: cleaned });
      } catch (e) {
        return res.status(500).json({
          ok: false,
          error: "main/suggest failed",
          message: e?.message || String(e),
        });
      }
    }
  );

  router.post(
    "/main/commit",
    express.json({ limit: "1mb" }),
    async (req, res) => {
      try {
        const text = String(req.body?.text || "").trim();
        const prefilter = req.body?.prefilter || {};
        const bijprompt = req.body?.bijprompt || null;

        const tv = prefilter?.tv || null;
        const ka = prefilter?.ka || null;

        if (!text) {
          return res.status(400).json({ ok: false, error: "text ontbreekt" });
        }

        const main_key = makeQuestionKey({ text, dim: null, ka, tv });

        await upsertQuestion({
          pool,
          question_key: main_key,
          scope: "MAIN",
          parent_key: null,
          text,
          dim: null,
          ka,
          tv,
          fingerprint: null,
        });

        const ents = await extractEntitiesWithGemini({
          questionText: text,
          dim: null,
          ka,
          tv,
          bijprompt: bijprompt || null,
        });

        await upsertQuestionEntities({
          pool,
          question_key: main_key,
          dim: null,
          entities: ents,
        });

        return res.json({ ok: true, main_key, stored: true });
      } catch (e) {
        return res.status(500).json({
          ok: false,
          error: "main/commit failed",
          message: e?.message || String(e),
        });
      }
    }
  );

  async function getMainQuestionText(main_key) {
    const r = await pool.query(
      "SELECT text, tv, ka FROM lessie.questions WHERE question_key=$1",
      [main_key]
    );
    const row = r.rows && r.rows[0] ? r.rows[0] : null;
    if (!row) return null;
    return {
      text: String(row.text || "").trim(),
      tv: row.tv || null,
      ka: row.ka || null,
    };
  }

  router.post(
    "/sub/suggest",
    express.json({ limit: "1mb" }),
    async (req, res) => {
      try {
        const main_key = String(req.body?.main_key || "").trim();
        const bijprompt = req.body?.bijprompt || null;

        if (!main_key) {
          return res.status(400).json({ ok: false, error: "main_key ontbreekt" });
        }

        const main = await getMainQuestionText(main_key);
        if (!main || !main.text) {
          return res.status(404).json({
            ok: false,
            error: "main_key niet gevonden in lessie.questions",
            main_key,
          });
        }

        const prompt = subSuggestPrompt({
          mainQuestionText: main.text,
          bijprompt: bijprompt || null,
          tv: main.tv,
          ka: main.ka,
        });

        const raw = await getGeminiSuggestions(prompt, {
          timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 45000),
        });

        const parsed = safeJsonParse(raw);
        const sc = parsed?.subCandidates || {};

        const dims = ["POLITIEK", "SOCIAAL_ECONOMISCH", "CULTUREEL_MENTAAL", "INDIVIDUEEL"];
        const alias = {
          POLITIEK: ["POLITIEK"],
          SOCIAAL_ECONOMISCH: ["SOCIAAL_ECONOMISCH", "SOCIAAL"],
          CULTUREEL_MENTAAL: ["CULTUREEL_MENTAAL", "CULTUREEL"],
          INDIVIDUEEL: ["INDIVIDUEEL"],
        };
        const out = {};
        for (const d of dims) {
          let arr = [];
          for (const k of alias[d] || []) {
            if (Array.isArray(sc[k])) {
              arr = sc[k];
              break;
            }
          }
          out[d] = arr
            .map((x) => ({
              text: String(x?.text || "").trim(),
              dim: d,
            }))
            .filter((x) => x.text)
            .slice(0, 2);
          if (out[d].length < 1) {
            return res.status(502).json({
              ok: false,
              error: `Gemini gaf geen deelvraag voor dimensie ${d}`,
              raw,
            });
          }
        }

        return res.json({ ok: true, subCandidates: out });
      } catch (e) {
        return res.status(500).json({
          ok: false,
          error: "sub/suggest failed",
          message: e?.message || String(e),
        });
      }
    }
  );

  router.post(
    "/sub/commit-and-profile",
    express.json({ limit: "2mb" }),
    async (req, res) => {
      try {
        const main_key = String(req.body?.main_key || "").trim();
        const selectedSubs = Array.isArray(req.body?.selectedSubs) ? req.body.selectedSubs : [];

        if (!main_key) {
          return res.status(400).json({ ok: false, error: "main_key ontbreekt" });
        }
        if (selectedSubs.length !== 4) {
          return res.status(400).json({
            ok: false,
            error: "selectedSubs moet precies 4 items hebben (1 per dimensie)",
          });
        }

        const main = await getMainQuestionText(main_key);
        if (!main || !main.text) {
          return res.status(404).json({
            ok: false,
            error: "main_key niet gevonden in lessie.questions",
            main_key,
          });
        }

        const used = [];
        const sub_keys = [];

        for (const item of selectedSubs) {
          const dim = normDim(item?.dim);
          const text = String(item?.text || "").trim();
          if (!dim || !text) {
            return res.status(400).json({
              ok: false,
              error: "Elke selectedSubs entry vereist dim + text",
            });
          }
          used.push({ dim, text });
        }

        for (const it of used) {
          const sub_key = makeQuestionKey({
            text: it.text,
            dim: it.dim,
            ka: main.ka,
            tv: main.tv,
          });

          await upsertQuestion({
            pool,
            question_key: sub_key,
            scope: "SUB",
            parent_key: main_key,
            text: it.text,
            dim: it.dim,
            ka: main.ka,
            tv: main.tv,
            fingerprint: null,
          });

          const ents = await extractEntitiesWithGemini({
            questionText: it.text,
            dim: it.dim,
            ka: main.ka,
            tv: main.tv,
            bijprompt: null,
          });

          await upsertQuestionEntities({
            pool,
            question_key: sub_key,
            dim: it.dim,
            entities: ents,
          });

          sub_keys.push({ dim: it.dim, sub_key });
        }

        const pPrompt = profileBuildPrompt({
          mainQuestionText: main.text,
          selectedSubs: used,
          tv: main.tv,
          ka: main.ka,
        });

        const raw = await getGeminiSuggestions(pPrompt, {
          timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 45000),
        });

        const profile = safeJsonParse(raw);
        if (!profile || typeof profile !== "object") {
          return res.status(502).json({
            ok: false,
            error: "Gemini gaf geen geldig JSON profiel",
            raw,
          });
        }

        const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
        const yw = await upsertProfile({
          pool,
          question_key: main_key,
          profile,
          model,
        });

        const sigEnts = entitiesFromSignals(profile?.signals || {});
        if (sigEnts.length > 0) {
          await upsertQuestionEntities({
            pool,
            question_key: main_key,
            dim: null,
            entities: sigEnts,
          });
        }

        let context_a_saved = false;
        let context_a_id = null;
        let context_a_error = null;

        try {
          const dimsOrdered = ["POLITIEK", "SOCIAAL_ECONOMISCH", "CULTUREEL_MENTAAL", "INDIVIDUEEL"];
          const byDim = {};
          for (const u of used) byDim[u.dim] = u.text;

          const payload = {
            question_key: main_key,
            hoofdvraag: main.text,
            tv: main.tv || null,
            ka: toKaList(main.ka),
            begrippen: buildBegrippenFromProfile(profile),
            deelvragen: dimsOrdered
              .map((d, idx) => ({
                id: idx + 1,
                tekst: byDim[d] || "",
                dimensie: d,
                subdimensie: "",
              }))
              .filter((x) => x.tekst),
          };

          const ca = await postContextAInternal(payload, 20000);
          if (ca.ok && ca.parsed && ca.parsed.saved) {
            context_a_saved = true;
            context_a_id = ca.parsed?.saved_info?.id || null;
          } else if (!ca.ok) {
            context_a_error = ca.error || (ca.status ? `http_${ca.status}` : "context_a_failed");
          } else {
            context_a_error = "context_a_not_saved";
          }
        } catch (e) {
          context_a_error = e?.message || String(e);
        }

        return res.json({
          ok: true,
          sub_keys,
          profile_stored: true,
          year_window_back: yw.year_window_back,
          year_window_forward: yw.year_window_forward,
          context_a_saved,
          context_a_id,
          context_a_error,
        });
      } catch (e) {
        return res.status(500).json({
          ok: false,
          error: "sub/commit-and-profile failed",
          message: e?.message || String(e),
        });
      }
    }
  );

  return router;
};


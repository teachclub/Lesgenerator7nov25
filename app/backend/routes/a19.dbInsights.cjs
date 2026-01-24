"use strict";

/*
  Insights (lokaal) — DB/kwaliteitssignalen + 1-click snapshot->clipboard bundle + match preview

  UI:            GET  /insights
  Summary:        GET  /api/insights/summary
  Snapshot:      POST  /api/insights/snapshot     body: { name?: string }
  Snapshots list: GET  /api/insights/snapshots
  Snapshot read:  GET  /api/insights/snapshots/:id
  Wordreport:     GET  /api/insights/wordreport/local
  Wordreport G:   GET  /api/insights/wordreport/gemini
  Bundle (copy):  GET  /api/insights/bundle       (includes summary + local wordreport + match preview (short))
  Label check:    GET  /api/insights/label-check  (KA vs entities + dekking per TV)
*/

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");

function jsonOk(res, obj) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function jsonErr(res, e, status = 500) {
  const msg = e && e.message ? e.message : String(e);
  res.statusCode = status;
  jsonOk(res, { ok: false, error: "insights faalde", message: msg });
}

function textOk(res, text) {
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(String(text || ""));
}

function safeInt(x, d = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

function safeNum(x, d = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function snapDir() {
  const dir = path.join(process.cwd(), "data", "insights_snapshots");
  ensureDir(dir);
  return dir;
}

function snapPath(id) {
  return path.join(snapDir(), `${id}.json`);
}

function makeId() {
  const rand = crypto.randomBytes(6).toString("hex");
  return `${Date.now()}_${rand}`;
}

function readJsonFile(fp) {
  const s = fs.readFileSync(fp, "utf8");
  return JSON.parse(s);
}

function writeJsonFile(fp, obj) {
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2), "utf8");
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on("data", (d) => chunks.push(d));
    req.on("end", resolve);
    req.on("error", reject);
  });
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function listColumns(pool, schema, table) {
  const q = await pool.query(
    `
    select column_name, data_type
    from information_schema.columns
    where table_schema=$1 and table_name=$2
    order by ordinal_position asc
  `,
    [schema, table]
  );
  return (q.rows || []).map((r) => ({ name: r.column_name, type: r.data_type }));
}

async function pickCol(pool, schema, table, candidates) {
  try {
    const cols = await listColumns(pool, schema, table);
    const set = new Set(cols.map((c) => c.name));
    for (const c of candidates) {
      if (set.has(c)) return c;
    }
  } catch (e) {}
  return null;
}

function pct1(n, total) {
  const nn = safeInt(n, 0);
  const tt = safeInt(total, 0);
  if (!tt) return "0.0%";
  const p = Math.round((1000 * nn) / tt) / 10;
  return `${p.toFixed(1)}%`;
}

function pctNum(n, total) {
  const nn = safeInt(n, 0);
  const tt = safeInt(total, 0);
  if (!tt) return 0.0;
  return Math.round((1000 * nn) / tt) / 10;
}

function bar28(value, max) {
  const v = safeInt(value, 0);
  const m = Math.max(1, safeInt(max, 1));
  const filled = Math.max(0, Math.min(28, Math.round((28 * v) / m)));
  return "█".repeat(filled);
}

function topNProviders(providers, n = 3) {
  const arr = Array.isArray(providers) ? providers.slice() : [];
  arr.sort((a, b) => safeInt(b.n, 0) - safeInt(a.n, 0));
  return arr.slice(0, Math.max(0, n));
}

function asciiCharts(summary) {
  const s = summary || {};
  const total = safeInt(s.sources, 0);
  const providers = topNProviders(s.providers, 3);

  const cov = s.coverage || {};
  const tvSet = safeInt(cov.tv_set, 0);
  const tvPred = safeInt(cov.tv_pred_set, 0);
  const kaSet = safeInt(cov.ka_set, 0);
  const kaPred = safeInt(cov.ka_pred_set, 0);
  const covMax = Math.max(tvSet, tvPred, kaSet, kaPred, 1);

  const qm = s.questions_main || {};
  const nMain = safeInt(qm.n_main, 0);
  const nUni = safeInt(qm.n_main_unique_text, 0);
  const nSmoke = safeInt(qm.n_main_smoke, 0);
  const qMax = Math.max(nMain, nUni, nSmoke, 1);

  const lines = [];
  lines.push("1) Providers (aantal bronnen)");
  if (!providers.length) {
    lines.push("Geen data (0)");
  } else {
    const pMax = providers.reduce((m, x) => Math.max(m, safeInt(x.n, 0)), 1);
    for (const p of providers) {
      const name = String(p.provider || "—").slice(0, 12).padEnd(12);
      const b = bar28(p.n, pMax).padEnd(28, " ");
      lines.push(`${name} ${b} ${safeInt(p.n, 0)}`);
    }
  }

  lines.push("");
  lines.push("2) Dekking set vs pred (aantal en % van totaal)");
  const tvSetBar = bar28(tvSet, covMax).padEnd(28, " ");
  const tvPredBar = bar28(tvPred, covMax).padEnd(28, " ");
  const kaSetBar = bar28(kaSet, covMax).padEnd(28, " ");
  const kaPredBar = bar28(kaPred, covMax).padEnd(28, " ");
  lines.push(
    `TV_set  ${tvSetBar} ${tvSet} (${pct1(tvSet, total)}) | TV_pred ${tvPredBar} ${tvPred} (${pct1(
      tvPred,
      total
    )})`
  );
  lines.push(
    `KA_set  ${kaSetBar} ${kaSet} (${pct1(kaSet, total)}) | KA_pred ${kaPredBar} ${kaPred} ${pct1(
      kaPred,
      total
    )}`
  );

  lines.push("");
  lines.push("3) MAIN-vragen (aantal)");
  lines.push(`n_main        ${bar28(nMain, qMax).padEnd(28, " ")} ${nMain}`);
  lines.push(`unique_text   ${bar28(nUni, qMax).padEnd(28, " ")} ${nUni}`);
  lines.push(`n_smoke       ${bar28(nSmoke, qMax).padEnd(28, " ")} ${nSmoke}`);

  return lines.join("\n");
}

function resolveGeminiConfig() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GENERATIVE_AI_API_KEY ||
    "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  return { apiKey, model };
}

async function callGeminiText(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: String(prompt || "") }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1200,
    },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const txt = await r.text();
  let j = null;
  try {
    j = JSON.parse(txt);
  } catch (e) {}

  if (!r.ok) {
    const m =
      (j && j.error && j.error.message) ||
      (j && j.message) ||
      txt ||
      `${r.status} ${r.statusText}`;
    throw new Error(m);
  }

  const out =
    j &&
    j.candidates &&
    j.candidates[0] &&
    j.candidates[0].content &&
    j.candidates[0].content.parts &&
    j.candidates[0].content.parts[0] &&
    j.candidates[0].content.parts[0].text;

  return { text: out || "" };
}

function buildGeminiJsonPrompt(summary) {
  const s = summary || {};
  return [
    "Geef EXACT één geldig JSON-object terug (geen Markdown, geen codeblock).",
    "Gebruik uitsluitend de DATA hieronder. Geen aannames. Geen externe kennis.",
    "",
    "Het JSON-object heeft EXACT deze keys:",
    '- "stand_van_zaken": string met 5–7 zinnen (compact, zakelijk). Als iets 0 is: schrijf letterlijk "Geen data (0)".',
    '- "datapunten": array met 6–10 strings (elk 1 bullet; elk bevat concrete cijfers of percentages).',
    '- "actiepunten": array met EXACT 8 objecten. Elk object heeft EXACT keys: "prio", "waarom", "meten".',
    '  - "prio" is één van: "P0", "P1", "P2".',
    '  - "waarom" is 1 zin, met minstens 1 concreet cijfer uit DATA.',
    '  - "meten" is 1 zin, liefst met endpoint of SQL-idee.',
    "",
    "DATA:",
    JSON.stringify(s, null, 2),
  ].join("\n");
}

function buildLabelCheckReport(summary) {
  const s = summary || {};
  const rows = Array.isArray(s.label_coverage_by_tv) ? s.label_coverage_by_tv : [];
  const qsum = Array.isArray(s.label_queue_summary) ? s.label_queue_summary : [];
  const qex = Array.isArray(s.label_queue_examples) ? s.label_queue_examples : [];

  const lines = [];
  lines.push(`# Label-check (KA vs entities)`);
  lines.push(`Datum: ${nowIso()}`);
  lines.push("");
  lines.push(`## 1) Dekking per TV (KA + entities)`);
  if (!rows.length) {
    lines.push(`Geen data (0)`);
  } else {
    lines.push(
      `tv_norm | n_total | KA n(%) | TERM n(%) | YEAR n(%) | PERSON n(%) | DIM n(%) | ANY n(%)`
    );
    lines.push(`-------+---------+---------+----------+----------+------------+---------+--------`);
    for (const r of rows) {
      const tv = (r.tv_norm || "").padEnd(5, " ");
      const nt = String(safeInt(r.n_total, 0)).padStart(7, " ");
      const ka = `${String(safeInt(r.n_with_ka, 0)).padStart(4, " ")} (${String(safeNum(r.pct_with_ka, 0)).padStart(
        4,
        " "
      )})`.padEnd(9, " ");
      const term = `${String(safeInt(r.n_with_term, 0)).padStart(4, " ")} (${String(
        safeNum(r.pct_with_term, 0)
      ).padStart(4, " ")})`.padEnd(10, " ");
      const year = `${String(safeInt(r.n_with_year, 0)).padStart(4, " ")} (${String(
        safeNum(r.pct_with_year, 0)
      ).padStart(4, " ")})`.padEnd(10, " ");
      const person = `${String(safeInt(r.n_with_person, 0)).padStart(4, " ")} (${String(
        safeNum(r.pct_with_person, 0)
      ).padStart(4, " ")})`.padEnd(12, " ");
      const dim = `${String(safeInt(r.n_with_dim, 0)).padStart(4, " ")} (${String(
        safeNum(r.pct_with_dim, 0)
      ).padStart(4, " ")})`.padEnd(9, " ");
      const any = `${String(safeInt(r.n_with_any, 0)).padStart(4, " ")} (${String(
        safeNum(r.pct_with_any, 0)
      ).padStart(4, " ")})`.padEnd(8, " ");
      lines.push(
        `${tv} | ${nt} | ${ka} | ${term} | ${year} | ${person} | ${dim} | ${any}`
      );
    }
    lines.push("");
    lines.push(`Interpretatie: als ANY hoog is maar KA laag, dan is de KA-labeling de bottleneck (relabel_KA).`);
    lines.push(`Omgekeerd (KA hoog maar ANY laag) wijst op ontbrekende entities (relabel_ENTITIES).`);
  }

  lines.push("");
  lines.push(`## 2) Queue (mismatch KA vs entities)`);
  if (!qsum.length) {
    lines.push(`Geen data (0)`);
  } else {
    lines.push(`reason | provider | tv_norm | n`);
    lines.push(`-------+----------+---------+---`);
    for (const r of qsum) {
      lines.push(
        `${String(r.reason || "").padEnd(19)} | ${String(r.provider || "").padEnd(8)} | ${String(
          r.tv_norm || ""
        ).padEnd(7)} | ${String(safeInt(r.n, 0)).padStart(4, " ")}`
      );
    }
  }

  lines.push("");
  lines.push(`## 3) Voorbeelden (eerste 60)`);
  if (!qex.length) {
    lines.push(`Geen data (0)`);
  } else {
    for (const r of qex.slice(0, 60)) {
      lines.push(
        `- ${r.reason} | ${r.provider || "?"} | ${r.tv_norm || "?"} | id=${r.id} | ${r.title || ""} | ${r.suggested_action}`
      );
    }
  }

  return lines.join("\n");
}

function buildLocalReport(summary) {
  const s = summary || {};
  const totalSources = safeInt(s.sources, 0);
  const totalQuestions = safeInt(s.questions, 0);
  const qm = s.questions_main || {};
  const cov = s.coverage || {};
  const providers = s.providers || [];
  const dups = s.main_duplicates || [];

  const tvSet = safeInt(cov.tv_set, 0);
  const tvPred = safeInt(cov.tv_pred_set, 0);
  const kaSet = safeInt(cov.ka_set, 0);
  const kaPred = safeInt(cov.ka_pred_set, 0);

  const nMain = safeInt(qm.n_main, 0);
  const nMainUnique = safeInt(qm.n_main_unique_text, 0);
  const nSmoke = safeInt(qm.n_main_smoke, 0);

  const topDup = dups && dups.length ? dups[0] : null;

  const lines = [];
  lines.push(`# Insights woordrapport (lokaal)`);
  lines.push(`Datum: ${nowIso()}`);
  lines.push("");
  lines.push("## 1) Stand van zaken");
  lines.push(
    `We hebben ${totalSources} bronnen en ${totalQuestions} vragen in de database. De basis (data + pipeline) is dus aanwezig.`
  );
  lines.push(
    `Voor matching is vooral belangrijk: (a) labeldekking (TV/KA), (b) kwaliteit/variatie van MAIN-vragen, (c) Context_A per dimensie, en (d) jaarvensters via question_profiles.`
  );
  lines.push("");
  lines.push(
    `Op dit moment is de bottleneck vooral “kwaliteitssignaal”: MAIN heeft ${nMain} items maar slechts ${nMainUnique} unieke teksten en ${nSmoke} smoke-tests. Dat maakt hergebruik- en kwaliteitsmetingen nu onbetrouwbaar.`
  );
  lines.push("");

  lines.push("## 2) Datapunten die opvallen");
  lines.push(`- Providers: ${providers.map((p) => `${p.provider}=${p.n}`).join(", ") || "n.v.t."}`);
  lines.push(
    `- TV dekking: gezet ${tvSet} (${pct1(tvSet, totalSources)}), voorspeld ${tvPred} (${pct1(
      tvPred,
      totalSources
    )})`
  );
  lines.push(
    `- KA dekking: gezet ${kaSet} (${pct1(kaSet, totalSources)}), voorspeld ${kaPred} (${pct1(
      kaPred,
      totalSources
    )})`
  );
  lines.push(`- MAIN: ${nMain} totaal, ${nMainUnique} unieke teksten, smoke=${nSmoke}`);

  const ca = s.contextA || {};
  const caBy = s.contextA_byDim || [];
  const miss = s.contextA_missing || [];
  if (safeInt(ca.n_question_keys, 0) > 0) {
    lines.push(`- Context_A (distinct question_keys): ${safeInt(ca.n_question_keys, 0)}`);
    if (caBy.length) {
      lines.push(
        `- Context_A per dimensie: ${caBy
          .map((x) => `${x.dim} ${safeInt(x.n_questions, 0)}q/${safeInt(x.n_items, 0)}i`)
          .join(", ")}`
      );
    }
    lines.push(
      `- Context_A compleetheid: complete_sets=${safeInt(
        ca.n_complete_sets,
        0
      )}, incomplete_sets=${safeInt(ca.n_incomplete_sets, 0)}`
    );
    if (miss.length) {
      lines.push(
        `- Context_A missing: ${miss
          .slice(0, 3)
          .map((m) => `${m.question_key} -> ${Array.isArray(m.missing_dims) ? m.missing_dims.join(",") : "?"}`)
          .join(" | ")}`
      );
    }
  } else {
    lines.push(`- Context_A: Geen data (0)`);
  }

  lines.push(`- question_profiles: ${safeInt(s.question_profiles, 0)} (jaarvensters vrijwel afwezig)`);
  if (topDup) lines.push(`- Grootste duplicate MAIN: "${topDup.text140}" (${topDup.n}×, tv=${topDup.tv || "?"})`);

  const qsum = Array.isArray(s.label_queue_summary) ? s.label_queue_summary : [];
  if (qsum.length) {
    const totalQueue = qsum.reduce((acc, x) => acc + safeInt(x.n, 0), 0);
    lines.push(`- Label-queue (KA vs entities mismatch): ${totalQueue} bronnen (zie /api/insights/label-check)`);
  }

  lines.push("");
  lines.push("## 3) Grafieken (ASCII)");
  lines.push("");
  lines.push("```");
  lines.push(asciiCharts(s));
  lines.push("```");
  lines.push("");

  lines.push("## 4) Aanbevelingen (8 actiepunten)");
  lines.push("");
  const actions = [
    {
      p: "P0",
      why: `Verwijder/markeer smoke-vragen: ${nSmoke}/${Math.max(1, nMain)} MAIN vervuilt hergebruik en elke KPI.`,
      how: `Meet: count MAIN where question_key like '__smoke%'. Doel: 0 in “productie”-runs.`,
    },
    {
      p: "P0",
      why: `Vul question_profiles (jaarvensters): nu slechts ${safeInt(s.question_profiles, 0)}; zonder tijdscontext blijft matching grof.`,
      how: `Meet: MAIN met bijbehorend question_profile. Doel: ~100%.`,
    },
    {
      p: "P0",
      why: `Vergroot unieke MAIN-vragen: ${nMainUnique} unieke teksten op ${nMain} MAIN wijst op herhaling.`,
      how: `Meet: n_main_unique_text / n_main. Doel: stijgende trend.`,
    },
    {
      p: "P1",
      why: `Verhoog KA_pred dekking: ${kaPred}/${totalSources} is een harde bottleneck voor KA-gestuurde matching.`,
      how: `Meet: ka_pred_set en gap (total-ka_pred_set) via /api/insights/summary.`,
    },
    {
      p: "P1",
      why: `Verhoog TV_pred dekking: nog ${Math.max(0, totalSources - tvPred)} bronnen zonder TV_pred vallen uit bij tv-filtering.`,
      how: `Meet: tv_pred_set en gap via /api/insights/summary.`,
    },
    {
      p: "P1",
      why: `Borg “compleetheid” van Context_A: ${safeInt(ca.n_complete_sets, 0)}/${safeInt(
        ca.n_question_keys,
        0
      )} sets zijn compleet.`,
      how: `Meet: contextA_missing in /api/insights/summary. Doel: 100% complete sets.`,
    },
    {
      p: "P2",
      why: `Introduceer een match-KPI (precision@k): anders optimaliseer je op gevoel.`,
      how: `Meet: laat 20 MAIN de top-10 matches scoren (1–5) en reken precision@10.`,
    },
    {
      p: "P2",
      why: `Log bijprompt/iteraties: zonder zicht op bijprompten bouw je “prompt debt” op.`,
      how: `Meet: presence/length bijprompt per run; toon median + top.`,
    },
  ];
  for (const a of actions) {
    lines.push(`- ${a.p} — Waarom: ${a.why} Hoe meten: ${a.how}`);
  }

  return lines.join("\n");
}

function normalizeMatchForBundle(matchJson, maxFullText = 240) {
  const out = { ok: false };
  if (!matchJson || typeof matchJson !== "object") return out;

  out.ok = Boolean(matchJson.ok);
  out.question_key = matchJson.question_key || null;
  out.appliedFilters = matchJson.appliedFilters || null;
  out.debug = matchJson.debug || null;
  out.sourcesByDim = {};

  const sbd = matchJson.sourcesByDim || {};
  for (const dim of Object.keys(sbd)) {
    const arr = Array.isArray(sbd[dim]) ? sbd[dim] : [];
    out.sourcesByDim[dim] = arr.map((x) => {
      const fullText = x && x.fullText ? String(x.fullText) : "";
      const short = fullText.length > maxFullText ? fullText.slice(0, maxFullText) + "…" : fullText;
      return {
        id: x.id,
        title: x.title,
        provider: x.provider,
        type: x.type,
        url: x.url,
        tv: x.tv,
        ka: x.ka,
        dimPrimary: x.dimPrimary,
        dimSecondary: x.dimSecondary,
        entity_hits: x.entity_hits,
        matchTier: x.matchTier,
        description: x.description ? String(x.description).slice(0, 280) : null,
        fullText: short || null,
        imageUrl: x.imageUrl || null,
      };
    });
  }

  return out;
}

function buildLatestMatchDebug(matchJson) {
  if (!matchJson || typeof matchJson !== "object" || !matchJson.ok) {
    return {
      ok: false,
      error: matchJson && matchJson.error ? matchJson.error : "no match preview",
    };
  }

  const sbd = matchJson.sourcesByDim || {};
  const dims = Object.keys(sbd);

  const countsByDim = {};
  const tiersByDim = {};

  for (const dim of dims) {
    const arr = Array.isArray(sbd[dim]) ? sbd[dim] : [];
    countsByDim[dim] = arr.length;

    const tierCounts = {};
    for (const x of arr) {
      const t = (x && x.matchTier) ? String(x.matchTier) : "<null>";
      tierCounts[t] = (tierCounts[t] || 0) + 1;
    }
    tiersByDim[dim] = tierCounts;
  }

  return {
    ok: true,
    question_key: matchJson.question_key || null,
    appliedFilters: matchJson.appliedFilters || null,
    debug: matchJson.debug || null,
    countsByDim,
    tiersByDim,
  };
}

async function buildSummary(pool) {
  const generatedAt = nowIso();

  const empty = {
    ok: true,
    generatedAt,
    summary: {
      sources: 0,
      questions: 0,
      questions_main: { n_main: 0, n_main_unique_text: 0, n_main_smoke: 0 },
      question_profiles: 0,
      question_context_a: 0,
      latest_context_a: null,
      latest_match_debug: null,
      providers: [],
      coverage: { total: 0, tv_set: 0, tv_pred_set: 0, ka_set: 0, ka_pred_set: 0 },
      label_coverage_by_tv: [],
      label_queue_summary: [],
      label_queue_examples: [],
      contextA_byDim: [],
      contextA_missing: [],
      contextA: { n_question_keys: 0, n_complete_sets: 0, n_incomplete_sets: 0 },
      main_duplicates: [],
      recent_main_questions: [],
    },
  };

  if (!pool || typeof pool.query !== "function") return empty;

  const textColQ = await pickCol(pool, "lessie", "questions", ["text", "hoofdvraag", "question_text", "vraag"]);
  const tvColQ = await pickCol(pool, "lessie", "questions", ["tv"]);
  const dimColQ = await pickCol(pool, "lessie", "questions", ["dim", "dimension", "dimensie"]);
  const kaColQ = await pickCol(pool, "lessie", "questions", ["ka", "ka_code"]);
  const createdColQ = await pickCol(pool, "lessie", "questions", ["created_at", "createdAt"]);
  const parentColQ = await pickCol(pool, "lessie", "questions", ["parent_key", "parentKey"]);
  const qkColQ = await pickCol(pool, "lessie", "questions", ["question_key", "questionKey"]);
  const scopeColQ = await pickCol(pool, "lessie", "questions", ["scope"]);

  const tvColS = await pickCol(pool, "lessie", "sources", ["tv"]);
  const tvPredColS = await pickCol(pool, "lessie", "sources", ["tv_pred", "tv_pred_code"]);
  const kaColS = await pickCol(pool, "lessie", "sources", ["ka_code", "ka"]);
  const kaPredColS = await pickCol(pool, "lessie", "sources", ["ka_pred", "ka_pred_code"]);
  const providerColS = await pickCol(pool, "lessie", "sources", ["provider"]);
  const titleColS = await pickCol(pool, "lessie", "sources", ["title", "name"]);
  const introColS = await pickCol(pool, "lessie", "sources", ["intro_text", "intro"]);
  const captionColS = await pickCol(pool, "lessie", "sources", ["caption_text", "caption"]);

  const qSources = await pool.query(`select count(*)::int as n from lessie.sources`);
  const qQuestions = await pool.query(`select count(*)::int as n from lessie.questions`);
  const totalSources = safeInt(qSources.rows[0] && qSources.rows[0].n, 0);
  const totalQuestions = safeInt(qQuestions.rows[0] && qQuestions.rows[0].n, 0);

  const providers = [];
  if (providerColS) {
    const qp = await pool.query(
      `select ${providerColS} as provider, count(*)::int as n
       from lessie.sources
       group by ${providerColS}
       order by n desc`
    );
    for (const r of qp.rows || []) providers.push({ provider: r.provider, n: safeInt(r.n, 0) });
  }

  const coverage = { total: totalSources, tv_set: 0, tv_pred_set: 0, ka_set: 0, ka_pred_set: 0 };
  if (tvColS) {
    const q = await pool.query(`select count(*)::int as n from lessie.sources where ${tvColS} is not null`);
    coverage.tv_set = safeInt(q.rows[0] && q.rows[0].n, 0);
  }
  if (tvPredColS) {
    const q = await pool.query(`select count(*)::int as n from lessie.sources where ${tvPredColS} is not null`);
    coverage.tv_pred_set = safeInt(q.rows[0] && q.rows[0].n, 0);
  }
  if (kaColS) {
    const q = await pool.query(`select count(*)::int as n from lessie.sources where ${kaColS} is not null`);
    coverage.ka_set = safeInt(q.rows[0] && q.rows[0].n, 0);
  }
  if (kaPredColS) {
    const q = await pool.query(`select count(*)::int as n from lessie.sources where ${kaPredColS} is not null`);
    coverage.ka_pred_set = safeInt(q.rows[0] && q.rows[0].n, 0);
  }

  const label_coverage_by_tv = [];
  const label_queue_summary = [];
  const label_queue_examples = [];

  try {
    const tvNormParts = [];
    if (tvPredColS) {
      tvNormParts.push(`when coalesce(${tvPredColS}::text,'') ~ '^TV[0-9]+$' then ${tvPredColS}::text`);
    }
    if (tvColS) {
      tvNormParts.push(`when coalesce(${tvColS}::text,'') ~ '^TV[0-9]+$' then ${tvColS}::text`);
      tvNormParts.push(
        `when coalesce(${tvColS}::text,'') ilike 'Tijdvak %' then 'TV' || regexp_replace(${tvColS}::text,'[^0-9]','','g')`
      );
    }
    const tvNormExpr = tvNormParts.length ? `case ${tvNormParts.join(" ")} else null end` : `null::text`;

    const hasKaParts = [];
    if (kaColS) hasKaParts.push(`nullif(coalesce(${kaColS}::text,''),'') is not null`);
    if (kaPredColS) hasKaParts.push(`coalesce(${kaPredColS}::text,'') ~ 'KA[0-9]+'`);
    const hasKaExpr = hasKaParts.length ? `(${hasKaParts.join(" or ")})` : `false`;

    const providerExpr = providerColS ? `coalesce(${providerColS}::text,'')` : `''::text`;

    const titleParts = [];
    if (titleColS) titleParts.push(`${titleColS}::text`);
    if (introColS) titleParts.push(`${introColS}::text`);
    if (captionColS) titleParts.push(`${captionColS}::text`);
    const titleExpr = titleParts.length ? `left(coalesce(${titleParts.join(", ")},''), 90)` : `''::text`;

    const qTv = await pool.query(
      `
      with s as (
        select
          id,
          ${providerExpr} as provider,
          ${tvNormExpr} as tv_norm,
          case when ${hasKaExpr} then 1 else 0 end as has_ka
        from lessie.sources
      ),
      e as (
        select
          source_id,
          max((kind='DIM')::int) as has_dim,
          max((kind='TERM')::int) as has_term,
          max((kind='YEAR')::int) as has_year,
          max((kind='PERSON')::int) as has_person
        from lessie.source_entities
        group by source_id
      ),
      q as (
        select
          s.tv_norm,
          s.has_ka,
          coalesce(e.has_dim,0) as has_dim,
          coalesce(e.has_term,0) as has_term,
          coalesce(e.has_year,0) as has_year,
          coalesce(e.has_person,0) as has_person,
          case
            when coalesce(e.has_dim,0)+coalesce(e.has_term,0)+coalesce(e.has_year,0)+coalesce(e.has_person,0) > 0 then 1
            else 0
          end as has_any
        from s
        left join e on e.source_id=s.id
      )
      select
        tv_norm,
        count(*)::int as n_total,
        sum(has_ka)::int as n_with_ka,
        sum(has_term)::int as n_with_term,
        sum(has_year)::int as n_with_year,
        sum(has_person)::int as n_with_person,
        sum(has_dim)::int as n_with_dim,
        sum(has_any)::int as n_with_any
      from q
      group by tv_norm
      order by tv_norm nulls last
      `
    );

    for (const r of qTv.rows || []) {
      const n_total = safeInt(r.n_total, 0);
      const n_with_ka = safeInt(r.n_with_ka, 0);
      const n_with_term = safeInt(r.n_with_term, 0);
      const n_with_year = safeInt(r.n_with_year, 0);
      const n_with_person = safeInt(r.n_with_person, 0);
      const n_with_dim = safeInt(r.n_with_dim, 0);
      const n_with_any = safeInt(r.n_with_any, 0);
      label_coverage_by_tv.push({
        tv_norm: r.tv_norm,
        n_total,
        n_with_ka,
        pct_with_ka: pctNum(n_with_ka, n_total),
        n_with_term,
        pct_with_term: pctNum(n_with_term, n_total),
        n_with_year,
        pct_with_year: pctNum(n_with_year, n_total),
        n_with_person,
        pct_with_person: pctNum(n_with_person, n_total),
        n_with_dim,
        pct_with_dim: pctNum(n_with_dim, n_total),
        n_with_any,
        pct_with_any: pctNum(n_with_any, n_total),
      });
    }

    const qQueue = await pool.query(
      `
      with s as (
        select
          id,
          ${providerExpr} as provider,
          ${tvNormExpr} as tv_norm,
          ${titleExpr} as title,
          case when ${hasKaExpr} then 1 else 0 end as has_ka
        from lessie.sources
      ),
      e as (
        select
          source_id,
          max((kind='DIM')::int) as has_dim,
          max((kind='TERM')::int) as has_term,
          max((kind='YEAR')::int) as has_year,
          max((kind='PERSON')::int) as has_person
        from lessie.source_entities
        group by source_id
      ),
      q as (
        select
          s.*,
          coalesce(e.has_dim,0) as has_dim,
          coalesce(e.has_term,0) as has_term,
          coalesce(e.has_year,0) as has_year,
          coalesce(e.has_person,0) as has_person,
          case
            when coalesce(e.has_dim,0)+coalesce(e.has_term,0)+coalesce(e.has_year,0)+coalesce(e.has_person,0) > 0 then 1
            else 0
          end as has_any
        from s
        left join e on e.source_id=s.id
      ),
      queue as (
        select
          id::text as id,
          provider,
          tv_norm,
          title,
          has_dim,
          has_term,
          has_year,
          has_person,
          case
            when has_any=1 and has_ka=0 then 'HAS_ENTITIES_NO_KA'
            when has_ka=1 and has_any=0 then 'HAS_KA_NO_ENTITIES'
            else 'OK'
          end as reason,
          case
            when has_any=1 and has_ka=0 then 'relabel_KA'
            when has_ka=1 and has_any=0 then 'relabel_ENTITIES'
            else null
          end as suggested_action
        from q
        where (has_any=1 and has_ka=0) or (has_ka=1 and has_any=0)
      )
      select
        'SUMMARY' as section,
        reason,
        provider,
        tv_norm,
        count(*)::int as n,
        null::text as id,
        null::text as title,
        null::text as suggested_action,
        null::int as has_dim,
        null::int as has_term,
        null::int as has_year,
        null::int as has_person
      from queue
      group by reason, provider, tv_norm

      union all

      select
        'DETAIL' as section,
        reason,
        provider,
        tv_norm,
        null::int as n,
        id,
        title,
        suggested_action,
        has_dim,
        has_term,
        has_year,
        has_person
      from queue
      order by
        section desc,
        n desc nulls last,
        reason asc,
        provider asc,
        tv_norm asc nulls last,
        id asc
      limit 180
      `
    );

    for (const r of qQueue.rows || []) {
      if (r.section === "SUMMARY") {
        label_queue_summary.push({
          reason: r.reason,
          provider: r.provider,
          tv_norm: r.tv_norm,
          n: safeInt(r.n, 0),
        });
      } else {
        label_queue_examples.push({
          reason: r.reason,
          provider: r.provider,
          tv_norm: r.tv_norm,
          id: r.id,
          title: r.title,
          suggested_action: r.suggested_action,
          has_dim: Boolean(r.has_dim),
          has_term: Boolean(r.has_term),
          has_year: Boolean(r.has_year),
          has_person: Boolean(r.has_person),
        });
      }
    }
  } catch (e) {
    // keep empty arrays
  }

  const questions_main = { n_main: 0, n_main_unique_text: 0, n_main_smoke: 0 };
  const recent_main_questions = [];
  const main_duplicates = [];

  if (scopeColQ && qkColQ) {
    const qMain = await pool.query(
      `select count(*)::int as n
       from lessie.questions
       where ${scopeColQ}='MAIN'`
    );
    questions_main.n_main = safeInt(qMain.rows[0] && qMain.rows[0].n, 0);

    if (textColQ) {
      const qUni = await pool.query(
        `select count(distinct ${textColQ})::int as n
         from lessie.questions
         where ${scopeColQ}='MAIN' and ${textColQ} is not null`
      );
      questions_main.n_main_unique_text = safeInt(qUni.rows[0] && qUni.rows[0].n, 0);
    }

    const qSmoke = await pool.query(
      `select count(*)::int as n
       from lessie.questions
       where ${scopeColQ}='MAIN' and ${qkColQ} like '__smoke%'`
    );
    questions_main.n_main_smoke = safeInt(qSmoke.rows[0] && qSmoke.rows[0].n, 0);

    const cols = [];
    cols.push(`${qkColQ} as question_key`);
    cols.push(`${scopeColQ} as scope`);
    if (parentColQ) cols.push(`${parentColQ} as parent_key`);
    else cols.push("null::text as parent_key");
    if (dimColQ) cols.push(`${dimColQ} as dim`);
    else cols.push("null::text as dim");
    if (tvColQ) cols.push(`${tvColQ} as tv`);
    else cols.push("null::text as tv");
    if (kaColQ) cols.push(`${kaColQ} as ka`);
    else cols.push("null::text as ka");
    if (textColQ) cols.push(`${textColQ} as text`);
    else cols.push("null::text as text");
    if (createdColQ) cols.push(`${createdColQ} as created_at`);
    else cols.push("null::timestamptz as created_at");

    const qr = await pool.query(
      `select ${cols.join(", ")}
       from lessie.questions
       where ${scopeColQ}='MAIN'
       order by ${createdColQ || qkColQ} desc
       limit 12`
    );
    for (const r of qr.rows || []) recent_main_questions.push(r);

    if (textColQ && tvColQ && createdColQ) {
      const qd = await pool.query(
        `
        select
          ${tvColQ} as tv,
          left(${textColQ}, 140) as text140,
          count(*)::int as n,
          min(${createdColQ}) as first,
          max(${createdColQ}) as last
        from lessie.questions
        where ${scopeColQ}='MAIN' and ${textColQ} is not null
        group by ${tvColQ}, left(${textColQ}, 140)
        having count(*) > 1
        order by n desc
        limit 10
        `
      );
      for (const r of qd.rows || []) main_duplicates.push(r);
    }
  }

  let question_profiles = 0;
  try {
    const qp = await pool.query(`select count(*)::int as n from lessie.question_profiles`);
    question_profiles = safeInt(qp.rows[0] && qp.rows[0].n, 0);
  } catch (e) {}

  let question_context_a = 0;
  try {
    const qc = await pool.query(`select count(distinct question_key)::int as n from lessie.question_context_a`);
    question_context_a = safeInt(qc.rows[0] && qc.rows[0].n, 0);
  } catch (e) {}

  let latest_context_a = null;
  try {
    const ql = await pool.query(
      `select id, question_key, created_at, meta
       from lessie.question_context_a
       order by created_at desc
       limit 1`
    );
    if (ql.rows && ql.rows[0]) {
      latest_context_a = {
        id: String(ql.rows[0].id),
        question_key: ql.rows[0].question_key,
        created_at: ql.rows[0].created_at,
        meta: ql.rows[0].meta || null,
      };
    }
  } catch (e) {}

  const contextA_byDim = [];
  const contextA_missing = [];
  const contextA = { n_question_keys: 0, n_complete_sets: 0, n_incomplete_sets: 0 };

  try {
    const qKeys = await pool.query(`select count(distinct question_key)::int as n from lessie.question_context_a`);
    contextA.n_question_keys = safeInt(qKeys.rows[0] && qKeys.rows[0].n, 0);

    const qBy = await pool.query(
      `
      select
        coalesce(item->>'dimensie','<null>') as dim,
        count(*)::int as n_items,
        count(distinct q.question_key)::int as n_questions
      from lessie.question_context_a q
      cross join lateral jsonb_array_elements((q.context_a::jsonb)->'contextA') item
      where trim(q.context_a) like '{%'
      group by 1
      order by n_questions desc
      `
    );
    for (const r of qBy.rows || []) contextA_byDim.push(r);

    const qMiss = await pool.query(
      `
      with dims as (
        select q.question_key, item->>'dimensie' as dim
        from lessie.question_context_a q
        cross join lateral jsonb_array_elements((q.context_a::jsonb)->'contextA') item
        where trim(q.context_a) like '{%'
      ),
      need as (
        select unnest(array['POLITIEK','SOCIAAL_ECONOMISCH','CULTUREEL_MENTAAL','INDIVIDUEEL']) as dim
      ),
      missing as (
        select d.question_key, n.dim
        from (select distinct question_key from lessie.question_context_a) d
        cross join need n
        left join dims x on x.question_key=d.question_key and x.dim=n.dim
        where x.dim is null
      )
      select question_key, array_agg(dim order by dim) as missing_dims
      from missing
      group by question_key
      order by question_key
      `
    );
    for (const r of qMiss.rows || []) contextA_missing.push(r);

    contextA.n_incomplete_sets = contextA_missing.length;
    contextA.n_complete_sets = Math.max(0, contextA.n_question_keys - contextA.n_incomplete_sets);
  } catch (e) {}

  let latest_match_debug = null;
  try {
    const qk = latest_context_a && latest_context_a.question_key ? String(latest_context_a.question_key) : "";
    if (qk) {
      const match = await trySelfMatchPreview(qk, true);
      latest_match_debug = buildLatestMatchDebug(match);
    }
  } catch (e) {
    latest_match_debug = { ok: false, error: e && e.message ? e.message : String(e) };
  }

  return {
    ok: true,
    generatedAt,
    summary: {
      sources: totalSources,
      questions: totalQuestions,
      questions_main,
      question_profiles,
      question_context_a,
      latest_context_a,
      latest_match_debug,
      providers,
      coverage,
      label_coverage_by_tv,
      label_queue_summary,
      label_queue_examples,
      contextA_byDim,
      contextA_missing,
      contextA,
      main_duplicates,
      recent_main_questions,
    },
  };
}

async function trySelfMatchPreview(question_key, debugFlag) {
  if (!question_key) return { ok: false, error: "no question_key" };
  const port = process.env.PORT ? Number(process.env.PORT) : 8080;
  const url = `http://127.0.0.1:${port}/api/match-from-context-a`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question_key, debug: Boolean(debugFlag) }),
    });
    const txt = await r.text();
    let j = null;
    try {
      j = JSON.parse(txt);
    } catch (e) {
      return { ok: false, error: `match returned non-json: ${txt.slice(0, 200)}` };
    }
    return j;
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

function buildBundleText(summaryObj, localReportText, matchPreviewShort) {
  const lines = [];
  lines.push(`# Insights bundle`);
  lines.push(`Datum: ${nowIso()}`);
  lines.push("");

  lines.push(`## 1) /api/insights/summary (JSON)`);
  lines.push("```json");
  lines.push(JSON.stringify(summaryObj, null, 2));
  lines.push("```");
  lines.push("");

  lines.push(`## 2) Woordrapport (lokaal)`);
  lines.push(localReportText || "Geen data (0)");
  lines.push("");

  lines.push(`## 3) Match preview (laatste Context_A, short)`);
  if (matchPreviewShort && matchPreviewShort.ok) {
    lines.push("```json");
    lines.push(JSON.stringify(matchPreviewShort, null, 2));
    lines.push("```");
  } else {
    lines.push(
      `Geen data (0)${matchPreviewShort && matchPreviewShort.error ? ` — ${matchPreviewShort.error}` : ""}`
    );
  }
  lines.push("");

  const qk =
    summaryObj && summaryObj.summary && summaryObj.summary.latest_context_a
      ? summaryObj.summary.latest_context_a.question_key
      : null;

  if (qk) {
    lines.push(`## 4) Repro (curl)`);
    lines.push("```bash");
    lines.push(`BASE="http://127.0.0.1:8080"`);
    lines.push(
      `curl -sS -X POST -H "content-type: application/json" -d '{"question_key":"${qk}"}' "$BASE/api/match-from-context-a" | python3 -m json.tool | sed -n '1,260p'`
    );
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function renderInsightsHtml() {
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Insights</title>
  <style>
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color:#111;}
    h1{font-size: 44px; margin: 0 0 10px;}
    .muted{color:#555;}
    .row{display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin: 14px 0;}
    button, input{font-size:16px; padding:10px 12px; border-radius:12px; border:1px solid #ddd; background:#fff;}
    button{cursor:pointer;}
    button.primary{border-color:#111;}
    input{min-width:260px;}
    .box{margin-top:16px; padding:14px 16px; background:#0b0b0b; color:#f5f5f5; border-radius:14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; white-space: pre-wrap;}
    .status{margin-top:10px; color:#0a6; font-weight:600;}
    .warn{color:#b80;}
    .err{color:#c33;}
    .small{font-size:13px; color:#666;}
  </style>
</head>
<body>
  <h1>Insights</h1>
  <div class="muted">Lokaal dashboard voor DB/kwaliteitssignalen. Endpoints staan onder <code>/api/insights/*</code>.</div>

  <div class="row">
    <button id="btnRefresh" class="primary">Refresh summary</button>
    <button id="btnLabelCheck" class="primary">Label check (KA vs entities)</button>
    <input id="snapName" placeholder="snapshot naam (optioneel)" />
    <button id="btnSnapshot" class="primary">Maak snapshot (kopieer ALLES)</button>
    <button id="btnWordLocal">Woordrapport (lokaal)</button>
    <button id="btnWordGemini">Woordrapport (Gemini)</button>
    <button id="btnCopyAll">Copy ALL (zonder snapshot)</button>
  </div>

  <div id="status" class="status"></div>
  <div id="out" class="box">Klik op Refresh summary…</div>
  <div class="small">
    Tip: “Maak snapshot (kopieer ALLES)” doet 3 dingen in één klik: snapshot opslaan → bundle bouwen (incl. match-preview) → naar klembord kopiëren.
  </div>

<script>
  const outEl = document.getElementById("out");
  const stEl = document.getElementById("status");
  const snapNameEl = document.getElementById("snapName");

  function setStatus(msg, kind){
    stEl.className = "status";
    if(kind==="warn") stEl.classList.add("warn");
    if(kind==="err") stEl.classList.add("err");
    stEl.textContent = msg || "";
  }

  function setOut(text){
    outEl.textContent = text || "";
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){
      return false;
    }
  }

  async function fetchText(url, opts){
    const r = await fetch(url, opts || {});
    const t = await r.text();
    if(!r.ok) throw new Error(t || (r.status + " " + r.statusText));
    return t;
  }

  async function fetchJson(url, opts){
    const r = await fetch(url, opts || {});
    const t = await r.text();
    let j = null;
    try{ j = JSON.parse(t); }catch(e){}
    if(!r.ok) throw new Error((j && (j.message||j.error)) || t || (r.status + " " + r.statusText));
    return j || {};
  }

  async function refreshSummary(){
    setStatus("Bezig: summary ophalen…");
    const j = await fetchJson("/api/insights/summary");
    setOut(JSON.stringify(j, null, 2));
    setStatus("OK: summary opgehaald.");
    return j;
  }

  async function showLabelCheck(){
    setStatus("Bezig: label-check ophalen…");
    const t = await fetchText("/api/insights/label-check");
    setOut(t);
    setStatus("OK: label-check.");
  }

  async function bundleToClipboard(){
    setStatus("Bezig: bundle ophalen…");
    const t = await fetchText("/api/insights/bundle");
    setOut(t);
    const ok = await copyText(t);
    setStatus(ok ? "OK: bundle gekopieerd naar klembord." : "Kon niet automatisch kopiëren (browser blokkade). Output staat in het zwarte vlak.", ok ? "" : "warn");
  }

  async function snapshotAndCopy(){
    setStatus("Bezig: snapshot maken…");
    const name = (snapNameEl.value || "").trim() || null;
    const j = await fetchJson("/api/insights/snapshot", {
      method:"POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ name })
    });
    setStatus("Bezig: bundle bouwen + kopiëren…");
    const t = await fetchText("/api/insights/bundle?snapshot_id=" + encodeURIComponent((j.snapshot && j.snapshot.id) || ""));
    setOut(t);
    const ok = await copyText(t);
    const sid = (j.snapshot && j.snapshot.id) ? (" (" + j.snapshot.id + ")") : "";
    setStatus(ok ? ("OK: snapshot+bundle gekopieerd" + sid) : ("Snapshot gemaakt" + sid + ", maar kopiëren werd geblokkeerd. Output staat in het zwarte vlak."), ok ? "" : "warn");
  }

  document.getElementById("btnRefresh").addEventListener("click", () => refreshSummary().catch(e => setStatus("FOUT: " + e.message, "err")));
  document.getElementById("btnLabelCheck").addEventListener("click", () => showLabelCheck().catch(e => setStatus("FOUT: " + e.message, "err")));
  document.getElementById("btnWordLocal").addEventListener("click", async () => {
    try{
      setStatus("Bezig: woordrapport (lokaal)…");
      const t = await fetchText("/api/insights/wordreport/local");
      setOut(t);
      setStatus("OK: woordrapport (lokaal).");
    }catch(e){ setStatus("FOUT: " + e.message, "err"); }
  });
  document.getElementById("btnWordGemini").addEventListener("click", async () => {
    try{
      setStatus("Bezig: woordrapport (Gemini)…");
      const t = await fetchText("/api/insights/wordreport/gemini");
      setOut(t);
      setStatus("OK: woordrapport (Gemini).");
    }catch(e){ setStatus("FOUT: " + e.message, "err"); }
  });
  document.getElementById("btnCopyAll").addEventListener("click", () => bundleToClipboard().catch(e => setStatus("FOUT: " + e.message, "err")));
  document.getElementById("btnSnapshot").addEventListener("click", () => snapshotAndCopy().catch(e => setStatus("FOUT: " + e.message, "err")));

</script>
</body>
</html>`;
}

function mountInsights(a, b) {
  let app = null;
  let pool = null;

  const isApp = (x) => x && typeof x.use === "function" && typeof x.get === "function";

  if (isApp(a)) {
    app = a;
    pool = b || null;
  } else if (isApp(b)) {
    app = b;
    pool = a || null;
  } else {
    pool = a || null;
  }

  const router = express.Router();

  router.get("/insights", (req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(renderInsightsHtml());
  });

  router.get("/api/insights/summary", async (req, res) => {
    try {
      const r = await buildSummary(pool);
      jsonOk(res, r);
    } catch (e) {
      jsonErr(res, e);
    }
  });

  router.get("/api/insights/label-check", async (req, res) => {
    try {
      const r = await buildSummary(pool);
      const t = buildLabelCheckReport(r.summary);
      textOk(res, t);
    } catch (e) {
      jsonErr(res, e);
    }
  });

  router.post("/api/insights/snapshot", async (req, res) => {
    try {
      const body = await getJsonBody(req);
      const name = body && typeof body.name === "string" ? body.name.trim() : null;

      const sum = await buildSummary(pool);
      const id = makeId();
      const snapshot = { id, name: name || null, createdAt: nowIso() };

      const payload = { ok: true, snapshot, summary: sum.summary };
      writeJsonFile(snapPath(id), payload);

      jsonOk(res, { ok: true, snapshot });
    } catch (e) {
      jsonErr(res, e);
    }
  });

  router.get("/api/insights/snapshots", (req, res) => {
    try {
      const dir = snapDir();
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      const items = [];
      for (const f of files) {
        const fp = path.join(dir, f);
        try {
          const j = readJsonFile(fp);
          if (j && j.snapshot && j.snapshot.id) items.push(j.snapshot);
        } catch (e) {}
      }
      items.sort((x, y) => String(y.createdAt || "").localeCompare(String(x.createdAt || "")));
      jsonOk(res, { ok: true, snapshots: items });
    } catch (e) {
      jsonErr(res, e);
    }
  });

  router.get("/api/insights/snapshots/:id", (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      if (!id) return jsonOk(res, { ok: false, error: "missing id" });
      const fp = snapPath(id);
      if (!fs.existsSync(fp)) return jsonOk(res, { ok: false, error: "snapshot not found" });
      const j = readJsonFile(fp);
      jsonOk(res, j);
    } catch (e) {
      jsonErr(res, e);
    }
  });

  router.get("/api/insights/wordreport/local", async (req, res) => {
    try {
      const s = await buildSummary(pool);
      const t = buildLocalReport(s.summary);
      textOk(res, t);
    } catch (e) {
      jsonErr(res, e);
    }
  });

  router.get("/api/insights/wordreport/gemini", async (req, res) => {
    try {
      const s = await buildSummary(pool);
      const { apiKey, model } = resolveGeminiConfig();
      if (!apiKey) {
        res.statusCode = 400;
        return textOk(res, "GEMINI_API_KEY ontbreekt (of GOOGLE_API_KEY / GENERATIVE_AI_API_KEY).");
      }
      const prompt = buildGeminiJsonPrompt(s.summary);
      const r = await callGeminiText(apiKey, model, prompt);

      let j = null;
      try {
        j = JSON.parse(String(r.text || "").trim());
      } catch (e) {
        res.statusCode = 502;
        return textOk(res, `Gemini gaf geen geldig JSON terug.\n\n${String(r.text || "").slice(0, 2000)}`);
      }

      const lines = [];
      lines.push(`# Insights woordrapport (Gemini)`);
      lines.push(`Datum: ${nowIso()}`);
      lines.push("");
      lines.push(`## 1) Stand van zaken`);
      lines.push(j.stand_van_zaken || "Geen data (0)");
      lines.push("");
      lines.push(`## 2) Datapunten die opvallen`);
      if (Array.isArray(j.datapunten) && j.datapunten.length) {
        for (const x of j.datapunten) lines.push(`- ${x}`);
      } else {
        lines.push(`- Geen data (0)`);
      }
      lines.push("");
      lines.push(`## 3) Grafieken (ASCII)`);
      lines.push("```");
      lines.push(asciiCharts(s.summary));
      lines.push("```");
      lines.push("");
      lines.push(`## 4) Actiepunten`);
      if (Array.isArray(j.actiepunten) && j.actiepunten.length) {
        for (const a of j.actiepunten) {
          lines.push(
            `- ${a.prio || "P2"} — Waarom: ${a.waarom || "n.v.t."} Hoe meten: ${a.meten || "n.v.t."}`
          );
        }
      } else {
        lines.push(`- Geen data (0)`);
      }

      textOk(res, lines.join("\n"));
    } catch (e) {
      jsonErr(res, e);
    }
  });

  router.get("/api/insights/bundle", async (req, res) => {
    try {
      const snapId = req.query && req.query.snapshot_id ? String(req.query.snapshot_id) : "";
      const sumObj = await buildSummary(pool);
      const localReport = buildLocalReport(sumObj.summary);

      const qk =
        sumObj && sumObj.summary && sumObj.summary.latest_context_a
          ? sumObj.summary.latest_context_a.question_key
          : null;

      let match = null;
      if (qk) {
        match = await trySelfMatchPreview(qk, true);
      } else {
        match = { ok: false, error: "no latest_context_a.question_key" };
      }
      const matchShort = match && match.ok ? normalizeMatchForBundle(match, 240) : match;

      let header = "";
      if (snapId) header = `Snapshot_id: ${snapId}\n\n`;

      const bundle = header + buildBundleText(sumObj, localReport, matchShort);
      textOk(res, bundle);
    } catch (e) {
      jsonErr(res, e);
    }
  });

  if (app) {
    app.use(router);
  }

  return router;
}

module.exports = mountInsights;


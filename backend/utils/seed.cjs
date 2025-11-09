// utils/boost.cjs
// Score- & select-hulpfuncties voor chips (boost seeds, demote stops, mix AI + facets)
// CommonJS, geen externe deps.

/////////////////////////////
// Kleine helpers
/////////////////////////////

const asArr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const uniqBy = (arr, keyFn) => {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const k = keyFn(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
};

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s\-().,']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenSetSim = (a, b) => {
  const A = new Set(norm(a).split(" ").filter(Boolean));
  const B = new Set(norm(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const uni = new Set([...A, ...B]).size;
  return inter / uni;
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/////////////////////////////
// Type/label heuristiek
/////////////////////////////

function guessKind(label, facet) {
  const L = norm(label);
  if (facet === "COUNTRY" || /city|stadt|ville|plaats|wittenberg|rome|paris/.test(L))
    return "place";
  if (facet === "PROVIDER" || facet === "DATA_PROVIDER" || /museum|library|archive|universiteit|instituut/.test(L))
    return "institution";
  if (facet === "MIME_TYPE" || facet === "TYPE") return "format";
  // heel ruwe persoonsheuristiek
  if (/^[a-z ,.'-]+$/i.test(label) && /^(martin|maarten|johannes|karel|leo|katharina|thomas|philipp)\b/.test(L))
    return "person";
  return "concept";
}

/////////////////////////////
// Stoplist & seed utilities
/////////////////////////////

function isStopped(label, stop = {}) {
  const L = norm(label);
  if (stop.labels) {
    for (const s of asArr(stop.labels)) {
      if (norm(s) === L) return true;
    }
  }
  if (stop.prefixes) {
    for (const p of asArr(stop.prefixes)) {
      if (L.startsWith(norm(p))) return true;
    }
  }
  if (stop.regex) {
    for (const r of asArr(stop.regex)) {
      try {
        const rx = r instanceof RegExp ? r : new RegExp(r, "i");
        if (rx.test(label)) return true;
      } catch {}
    }
  }
  return false;
}

function isSeed(label, seeds = []) {
  const L = norm(label);
  for (const s of asArr(seeds)) {
    if (norm(s.label || s) === L) return true;
  }
  return false;
}

/////////////////////////////
// TF-IDF light (voor facet frequentie)
/////////////////////////////

function computeTFIDF(items = []) {
  // items: [{label, facet, count}]
  const byFacet = new Map();
  for (const it of items) {
    const f = it.facet || "_";
    if (!byFacet.has(f)) byFacet.set(f, []);
    byFacet.get(f).push(it);
  }
  const docCount = byFacet.size || 1;
  const df = new Map(); // label -> #facets
  for (const [_, arr] of byFacet) {
    const seen = new Set();
    for (const it of arr) seen.add(norm(it.label));
    for (const k of seen) df.set(k, (df.get(k) || 0) + 1);
  }
  const scored = [];
  for (const it of items) {
    const key = norm(it.label);
    const idf = Math.log((docCount + 1) / ((df.get(key) || 0) + 1) + 1);
    const tf = Math.log((it.count || 0) + 1);
    scored.push({ ...it, tfidf: tf * idf, tf, idf });
  }
  return scored;
}

/////////////////////////////
// Scoring
/////////////////////////////

function baseScore({ count = 0, tfidf = 0 }) {
  // combinatie van raw volume en "uniekheid" per facet
  // count-log dempt extreem grote providers/landen
  return Math.log(count + 1) * 0.6 + tfidf * 0.8;
}

function applyBoosts(item, { term, seeds = [], stop = {}, aiMatch = false }) {
  let score = baseScore(item);
  const L = norm(item.label);
  const T = norm(term || "");

  // Seed-boost
  if (isSeed(item.label, seeds)) score += 2.5;

  // AI-kruisboost (kwam ook uit AI-lijst)
  if (aiMatch) score += 1.8;

  // Term-echo: als label ≈ term, iets dempen om variatie te houden
  const echo = tokenSetSim(L, T);
  if (echo > 0.85) score -= 1.0;

  // Stoplist straf
  if (isStopped(item.label, stop)) score -= 3.0;

  // Bevorder "persoon" en "event-achtige" concepten licht
  if (item.kind === "person") score += 0.6;
  if (item.kind === "concept" && /\b(oorlog|opstand|reformatie|confessie|edict|bijbel|stelling|diet|dag|concilie|synode)\b/.test(L))
    score += 0.4;

  return score;
}

/////////////////////////////
// Selectie (quota + ranking)
/////////////////////////////

function rankAndSelect(cands, {
  perKindLimit = { person: 10, event: 10, concept: 10, place: 10, institution: 8, format: 4 },
  globalLimit = 60,
  minScore = -Infinity
} = {}) {
  const byKind = new Map();
  for (const it of cands) {
    if (it.score < minScore) continue;
    const k = it.kind || "concept";
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push(it);
  }
  const out = [];
  for (const [k, arr] of byKind) {
    const cap = perKindLimit[k] ?? 0;
    arr.sort((a, b) => b.score - a.score || (b.count || 0) - (a.count || 0));
    out.push(...arr.slice(0, cap));
  }
  // Als er ruimte over is, vul aan met rest
  if (out.length < globalLimit) {
    const pool = cands
      .filter((x) => x.score >= minScore && !out.some((y) => y.key === x.key))
      .sort((a, b) => b.score - a.score || (b.count || 0) - (a.count || 0));
    const need = Math.max(0, globalLimit - out.length);
    out.push(...pool.slice(0, need));
  }
  // Sorteer eindresultaat: person → event → concept → place → institution → format
  const order = { person: 0, event: 1, concept: 2, place: 3, institution: 4, format: 5 };
  out.sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9) || b.score - a.score);
  return out;
}

/////////////////////////////
// Hoofdfunctie: boost + mix
/////////////////////////////

/**
 * @param {Object} input
 * @param {string} input.term
 * @param {Array}  input.aiItems       // [{label, kind?}]
 * @param {Array}  input.facetItems    // [{label, facet, count}]
 * @param {Array}  input.seedItems     // [{label, kind?}]
 * @param {Object} input.stop          // {labels:[], prefixes:[], regex:[]}
 * @param {Object} opts                // { perKindLimit, globalLimit }
 * @returns {{chips: Array, debug: Object}}
 */
function boostAndSelect(input = {}, opts = {}) {
  const term = input.term || "";
  const aiItems = asArr(input.aiItems).filter((x) => x && x.label);
  const facetRaw = asArr(input.facetItems).filter((x) => x && x.label);
  const seeds = asArr(input.seedItems);
  const stop = input.stop || {};

  // Index AI labels voor snelle lookup
  const aiSet = new Set(aiItems.map((x) => norm(x.label)));

  // TF-IDF op facetitems
  const facetItems = computeTFIDF(
    facetRaw.map((x) => ({
      ...x,
      label: String(x.label),
      kind: x.kind || guessKind(x.label, x.facet),
      count: Number.isFinite(x.count) ? x.count : 0,
    }))
  );

  // Combineer AI + facet tot gezamenlijke kandidaten
  const fromAI = aiItems.map((x) => ({
    key: `ai::${norm(x.label)}::${x.kind || "concept"}`,
    label: x.label,
    kind: x.kind || "concept",
    facet: x.facet || null,
    count: 0,
    source: "AI",
  }));

  const fromFacet = facetItems.map((x) => ({
    key: `facet::${norm(x.label)}::${x.kind}`,
    label: x.label,
    kind: x.kind,
    facet: x.facet || null,
    count: x.count || 0,
    tfidf: x.tfidf || 0,
    source: "FACET",
  }));

  // Dedup op label/kind, maar bewaar de hoogste count/tfidf/source-combo
  const merged = uniqBy([...fromFacet, ...fromAI], (x) => `${norm(x.label)}::${x.kind}`).map((k) => ({ ...k }));
  // Als iets in beide zit, markeer aiMatch
  const withFlags = merged.map((it) => ({
    ...it,
    aiMatch: aiSet.has(norm(it.label)),
  }));

  // Score berekenen
  const scored = withFlags.map((it) => ({
    ...it,
    score: applyBoosts(it, { term, seeds, stop, aiMatch: it.aiMatch }),
  }));

  // Extra: “klassiekers” die enkel in AI zitten maar niet in facets (count=0)
  // geef een mini-count, zodat ze niet wegvallen tegen pure count-sorted facet noise.
  for (const it of scored) {
    if (it.source === "AI" && !it.count) it.count = 1;
  }

  // Selectie per soort (quota), dan globale bijvulling
  const selected = rankAndSelect(scored, {
    perKindLimit: opts.perKindLimit || {
      person: 10,
      event: 10,
      concept: 10,
      place: 10,
      institution: 8,
      format: 4,
    },
    globalLimit: opts.globalLimit || 60,
    minScore: opts.minScore ?? -Infinity,
  });

  // Output normaliseren naar chipvorm
  const chips = selected.map((x) => ({
    label: x.label,
    kind: x.kind,
    count: x.count || 0,
    facet: x.facet || null,
    source: x.source,
    score: Number(x.score?.toFixed?.(3) ?? x.score),
  }));

  return {
    chips,
    debug: {
      in: {
        term,
        aiItems: aiItems.length,
        facetItems: facetItems.length,
        seeds: seeds.length,
      },
      out: {
        total: chips.length,
        byKind: chips.reduce((acc, c) => {
          acc[c.kind] = (acc[c.kind] || 0) + 1;
          return acc;
        }, {}),
      },
    },
  };
}

module.exports = {
  norm,
  tokenSetSim,
  computeTFIDF,
  baseScore,
  boostAndSelect,
  isSeed,
  isStopped,
  guessKind,
  rankAndSelect,
};


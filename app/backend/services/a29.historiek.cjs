"use strict";

const fs = require("fs");
const path = require("path");

let KA_MAPPING = {};
try {
  const m = require("./a22.ka-mapping.cjs");
  KA_MAPPING = m && m.KA_MAPPING ? m.KA_MAPPING : {};
} catch {
  KA_MAPPING = {};
}

let KA_TREF = {};
try {
  KA_TREF = require("../data/ka-trefwoorden.cjs") || {};
} catch {
  KA_TREF = {};
}

let THESAURUS = null;
try {
  THESAURUS = require("./a22.thesaurus.cjs") || null;
} catch {
  THESAURUS = null;
}

const yrRe = /(?:1[0-9]{3}|20[0-9]{2})/g;

function squashWs(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function normKey(s) {
  return squashWs(s).toLowerCase();
}

function uniqueKeepOrder(arr) {
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(arr) ? arr : []) {
    const s = squashWs(v);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function toIntOrNull(x) {
  const n = Number(String(x || "").trim());
  return Number.isInteger(n) ? n : null;
}

function extractYears(text) {
  const hits = squashWs(text).match(yrRe) || [];
  return hits
    .map(Number)
    .filter((y) => Number.isInteger(y) && y >= 0 && y <= 2100);
}

function tvRange(tvNum) {
  return (
    {
      5: [1500, 1600],
      6: [1600, 1700],
      7: [1700, 1800],
      8: [1800, 1900],
      9: [1900, 1950],
      10: [1950, 2000],
    }[tvNum] || null
  );
}

function medianYear(years) {
  if (!Array.isArray(years) || years.length === 0) return null;
  const sorted = [...years].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.floor(sorted.length / 2)];
}

// true=in-range (label), false=out(drop), null=noYear(keep)
function tvDecisionByMedian(years, range) {
  if (!range) return true;
  const mid = medianYear(years);
  if (!Number.isFinite(mid)) return null;
  const [a, b] = range;
  return mid >= a && mid <= b;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  function pushField() {
    row.push(field);
    field = "";
  }
  function pushRow() {
    rows.push(row);
    row = [];
  }

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\n") {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  pushField();
  pushRow();

  if (!rows.length) return [];
  const header = rows[0].map((h) => squashWs(h));
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const arr = rows[r];
    if (!arr || (arr.length === 1 && !squashWs(arr[0]))) continue;
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = arr[c] === undefined ? "" : arr[c];
    }
    out.push(obj);
  }
  return out;
}

function loadCsv(relPath) {
  const p = path.join(__dirname, "..", "data", relPath);
  const raw = fs.readFileSync(p, "utf8");
  return parseCsv(raw);
}

function expandFromKaTrefwoorden(term, n = 6) {
  const t = normKey(term);
  if (!t) return [];
  if (/^ka\d+$/i.test(t)) return [];

  const counts = new Map();
  let found = 0;

  for (const ka of Object.keys(KA_TREF || {})) {
    const arr = Array.isArray(KA_TREF[ka]) ? KA_TREF[ka] : [];
    if (!arr.length) continue;

    const lower = arr.map((x) => normKey(x)).filter(Boolean);
    if (!lower.includes(t)) continue;

    found++;
    for (let i = 0; i < arr.length; i++) {
      const kw = squashWs(arr[i]);
      const k = normKey(kw);
      if (!k || k === t) continue;
      counts.set(kw, (counts.get(kw) || 0) + 1);
    }
  }

  if (found === 0 || counts.size === 0) return [];

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map((x) => x[0]);
}

function normalizeAndExpandTerm(term) {
  const t = squashWs(term);
  if (!t) return [];
  if (!THESAURUS) return [t];

  const n1 =
    typeof THESAURUS.normalizeTerm === "function"
      ? THESAURUS.normalizeTerm(t)
      : t;
  const out = [n1];

  if (typeof THESAURUS.expandTerm === "function") {
    const exp = THESAURUS.expandTerm(n1);
    if (Array.isArray(exp) && exp.length) out.push(...exp);
  }

  const parts = n1.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) out.push(parts.slice(0, 2).join(" "));

  return uniqueKeepOrder(out);
}

function asKaKey(x) {
  const s = String(x || "").trim();
  if (!s) return "";
  return s.toLowerCase().startsWith("ka") ? s.toLowerCase() : "ka" + s.replace(/\D/g, "");
}

function splitTop3(s) {
  const t = squashWs(s);
  if (!t) return [];
  return t.split(/\s*[|,]\s*/g).map(squashWs).filter(Boolean);
}

function matchAnyTerm(hay, terms) {
  const h = normKey(hay);
  if (!h) return { score: 0, hits: [] };
  let score = 0;
  const hits = [];
  for (const term of terms) {
    const k = normKey(term);
    if (!k) continue;
    if (h.includes(k)) {
      const w = k.length >= 12 ? 4 : k.length >= 8 ? 3 : k.length >= 5 ? 2 : 1;
      score += w;
      hits.push(term);
    }
  }
  return { score, hits: uniqueKeepOrder(hits) };
}

function personUrlLooksConsistent(title, url) {
  const t = squashWs(title);
  const u = normKey(url);
  if (!t || !u) return true;
  if (!t.includes(",")) return true;

  const surname = squashWs(t.split(",")[0]);
  const sn = normKey(surname);
  if (sn.length < 3) return true;

  return u.includes(sn);
}

// Extra guard: “persoon” maar inhoud lijkt object/gebouw/kerk én geen jaartallen → drop.
function personLooksLikeObject(type, wikiSummary, years) {
  if (type !== "persoon") return false;
  const hasYears = Array.isArray(years) && years.length > 0;
  if (hasYears) return false;

  const t = normKey(wikiSummary || "");
  if (!t) return true;

  // sterke signalen voor object/gebouw i.p.v. persoon
  const bad = [
    "kerk",
    "kathedraal",
    "basiliek",
    "abdij",
    "moskee",
    "synagoge",
    "kasteel",
    "paleis",
    "gebouw",
    "brug",
    "toren",
    "museum",
    "stad",
    "dorp",
    "rivier",
    "eiland",
    "slag",
    "veldslag",
    "verdrag",
    "organisatie",
    "vereniging",
    "bedrijf",
  ];

  let hits = 0;
  for (const w of bad) if (t.includes(w)) hits++;

  // 1 hit is al verdacht; 2+ is zeker fout.
  return hits >= 1;
}

const PERSONEN = loadCsv("historiek_personen_omzet_final.csv");
const BEGRIPPEN = loadCsv("historiek_begrippen_omzet.csv");

function buildItem(row) {
  const type = squashWs(row.type);
  const title = squashWs(row.title);
  const url = squashWs(row.url);

  if (!title || !url) return null;

  const kaBest = squashWs(row.ka_best);
  const kaTop3 = splitTop3(row.ka_top3);
  const conf = Number(row.confidence || 0);

  const wikiSummary = squashWs(
    row.wiki_summary ||
      row.wiki_extract ||
      row.wiki_intro ||
      row.summary ||
      ""
  );

  const matchedTerms = squashWs(row.matched_terms_bestka);

  const activeYear = toIntOrNull(row.active_year);
  const histMid = toIntOrNull(row.hist_mid);
  const wikiMedian = toIntOrNull(row.wiki_year_median);

  const textForYears = [title, wikiSummary].filter(Boolean).join(" ");
  const yearsFromText = extractYears(textForYears);

  const years = uniqueKeepOrder(
    [...yearsFromText, activeYear, histMid, wikiMedian]
      .filter((x) => Number.isFinite(x))
      .map((x) => String(x))
  )
    .map((x) => Number(x))
    .filter((y) => Number.isFinite(y) && y >= 0 && y <= 2100);

  if (type === "persoon" && !personUrlLooksConsistent(title, url)) {
    return null;
  }

  if (personLooksLikeObject(type, wikiSummary, years)) {
    return null;
  }

  return {
    type,
    title,
    url,
    kaBest,
    kaTop3,
    confidence: Number.isFinite(conf) ? conf : 0,
    matchedTerms,
    wikiSummary,
    years,
  };
}

const INDEX = [...PERSONEN, ...BEGRIPPEN].map(buildItem).filter(Boolean);

function buildSeedTerms(queryArr, filters) {
  let seedTerms = [];
  const q = Array.isArray(queryArr) ? queryArr.map(squashWs).filter(Boolean) : [];

  if (q.length === 1 && !filters?.ka) {
    const base = q[0];
    const extra6 = expandFromKaTrefwoorden(base, 6);
    seedTerms = uniqueKeepOrder([base, ...extra6]);
  } else if (q.length > 0) {
    seedTerms = uniqueKeepOrder(q);
  }

  if (seedTerms.length === 0 && filters?.ka) {
    const key = asKaKey(filters.ka);
    if (key && KA_MAPPING[key]) seedTerms = uniqueKeepOrder(KA_MAPPING[key]);
  }

  seedTerms = uniqueKeepOrder(seedTerms.flatMap(normalizeAndExpandTerm));
  return seedTerms;
}

function buildRequiredQueryTerms(queryArr) {
  const q = Array.isArray(queryArr) ? queryArr.map(squashWs).filter(Boolean) : [];
  if (!q.length) return [];
  let parts = q;
  if (q.length === 1) {
    parts = q[0].split(/[\s,()\-]+/g).map(squashWs).filter(Boolean);
  }
  return parts.map(normKey).filter(Boolean);
}

function buildFilterKaSet(filters) {
  const set = new Set();
  if (!filters?.ka) return set;
  const key = asKaKey(filters.ka);
  if (key) set.add(key.toUpperCase());
  return set;
}

function isConfirmedForKa(it, kaSet) {
  if (!kaSet || kaSet.size === 0) return true;

  const conf = Number.isFinite(it.confidence) ? it.confidence : 0;
  if (conf < 0.25) return false;

  const kb = squashWs(it.kaBest).toUpperCase();
  if (kb && kaSet.has(kb)) return true;

  return false;
}

async function searchHistoriek({ query, filters }) {
  if (filters?.historiek === false) return [];

  const seedTerms = buildSeedTerms(query, filters);
  if (!seedTerms.length && !filters?.ka) return [];

  const requiredTerms = buildRequiredQueryTerms(query);

  const tvNum = filters?.tv ? Number(String(filters.tv).replace(/\D/g, "")) : null;
  const range = tvNum ? tvRange(tvNum) : null;

  const kaSet = buildFilterKaSet(filters);

  const scored = [];
  for (const it of INDEX) {
    if (kaSet.size) {
      if (!isConfirmedForKa(it, kaSet)) continue;
    }

    const hay = [it.title, it.wikiSummary, it.matchedTerms].filter(Boolean).join(" ");
    const hayNorm = normKey(hay);

    if (requiredTerms.length >= 2) {
      let okAll = true;
      for (const rt of requiredTerms) {
        if (!hayNorm.includes(rt)) {
          okAll = false;
          break;
        }
      }
      if (!okAll) continue;
    }

    const { score, hits } = matchAnyTerm(hay, seedTerms);

    if (!kaSet.size) {
      if (score <= 0) continue;
    }

    let keep = true;
    let labelTv = false;

    if (range) {
      const decision = tvDecisionByMedian(it.years || [], range);
      if (decision === false) keep = false;
      if (decision === true) labelTv = true;
    }

    if (!keep) continue;

    const desc =
      it.wikiSummary ||
      (it.matchedTerms ? `Match: ${it.matchedTerms}` : "") ||
      "Historiek";

    scored.push({
      score: score + (it.confidence >= 0.5 ? 2 : it.confidence >= 0.25 ? 1 : 0),
      hits,
      it,
      labelTv,
      tvNum,
      desc,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  const out = [];
  for (const s of scored.slice(0, 200)) {
    out.push({
      id: `historiek-${s.it.url}`,
      provider: "Historiek",
      title: s.it.title,
      description: squashWs(s.desc).slice(0, 900),
      fullText: squashWs(s.desc).slice(0, 900),
      url: s.it.url,
      imageUrl: null,
      type: "TEXT",
      tv: s.labelTv && s.tvNum ? String(s.tvNum) : undefined,
      tvLabel: s.labelTv && s.tvNum ? `Tijdvak ${s.tvNum}` : undefined,
      historiekType: s.it.type,
      kaBest: s.it.kaBest || undefined,
      kaTop3: s.it.kaTop3 && s.it.kaTop3.length ? s.it.kaTop3 : undefined,
    });
  }

  return out;
}

module.exports = { searchHistoriek };


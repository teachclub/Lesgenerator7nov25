// services/a06.chips.cjs
// Hybride Chips v8 — per categorie 10+ chips met echte Europeana-counts.
// Verbeteringen t.o.v. v7:
// 1) Neemt SKOS_CONCEPT mee als pool (beter voor personen/termen).
// 2) Alias-sets uitgebreid + fuzzy-drempel verlaagd.
// 3) Fallback "query count" per label als facet-match 0 oplevert (rows=0).

const fetch = global.fetch;
const { URLSearchParams } = require("url");

// ---------- utils ----------
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s\-()]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqBy = (arr, keyer) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = keyer(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
};

const tokenSetSim = (a, b) => {
  const A = new Set(norm(a).split(" ").filter(Boolean));
  const B = new Set(norm(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / new Set([...A, ...B]).size;
};

// ---------- seeds ----------
const SEEDS = {
  person: [
    "Maarten Luther",
    "Philipp Melanchthon",
    "Thomas Müntzer",
    "Katharina von Bora",
    "Paus Leo X",
    "Johannes Calvijn",
    "Justus Jonas",
    "Huldrych Zwingli",
    "Jan Hus",
    "Erasmus",
    "Johannes Gutenberg",
    "Karel V",
  ],
  event: [
    "Rijksdag van Worms (1521)",
    "Boerenoorlog (1524-1525)",
    "Rijksdag van Augsburg (1530)",
    "Edict van Worms (1521)",
  ],
  concept: [
    "95 stellingen",
    "Reformatie",
    "Augsburgse Confessie",
    "Bijbelvertaling",
    "Aflaat",
    "Luthers theologie",
    "Protestantisme",
    "Kerkhervorming",
    "Luthers roos",
    "De captivitate Babylonica ecclesiae praeludium",
    "Von der Freiheit eines Christenmenschen",
    "Deutsche Katechismus",
  ],
  place: ["Wittenberg", "Wartburg", "Erfurt", "Worms", "Heilig Roomse Rijk", "Augustijnenklooster"],
};

// ---------- alias mapping ----------
const ALIAS = {
  "maarten luther": ["martin luther", "luther, martin"],
  "philipp melanchthon": ["philip melanchthon", "melanchthon, philipp"],
  "thomas müntzer": ["thomas muntzer", "müntzer, thomas", "muntzer, thomas"],
  "katharina von bora": ["catharina von bora", "katharina luther"],
  "paus leo x": ["pope leo x", "leo x"],
  "johannes calvijn": ["john calvin", "jean calvin", "calvijn, johannes"],
  "justus jonas": ["jonas, justus"],
  "huldrych zwingli": ["ulrich zwingli", "zwingli, huldrych"],
  "jan hus": ["john hus", "jan husz"],
  erasmus: ["desiderius erasmus", "erasmus van rotterdam"],
  "johannes gutenberg": ["gutenberg, johannes"],
  "karel v": ["charles v", "karl v.", "carolus v"],

  "boerenoorlog (1524-1525)": ["german peasants' war", "bauernkrieg (1524–1525)"],
  "rijksdag van worms (1521)": ["diet of worms (1521)", "reichstag zu worms 1521"],
  "rijksdag van augsburg (1530)": ["diet of augsburg (1530)"],
  "edict van worms (1521)": ["edict of worms (1521)"],

  "luthers roos": ["luther rose"],
  "heilig roomse rijk": ["holy roman empire"],
  "bijbelvertaling": ["bible translation"],
  "aflaat": ["indulgence", "indulgences"],
  "kerk": ["church"],
};

// ---------- Europeana: facets ----------
async function fetchEuropeanaFacets(term) {
  const key = process.env.EUROPEANA_WSKEY;
  const qs = new URLSearchParams({
    wskey: key,
    query: String(term || "").trim(),
    rows: "0",
    profile: "facets",
    media: "true",
    "facet-limit": "160",
  });

  // LET OP: skos_concept weer toegevoegd!
  const FACETS = [
    "skos_concept",
    "proxy_dc_subject",
    "proxy_dc_coverage",
    "COUNTRY",
    "DATA_PROVIDER",
    "PROVIDER",
    "TYPE",
    "MIME_TYPE",
  ];
  FACETS.forEach((f) => qs.append("facet", f));

  const url = `https://api.europeana.eu/record/v2/search.json?${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("[A06][EU] facets http", res.status);
    return { byFacet: {}, total: 0 };
  }
  const json = await res.json();
  const byFacet = {};
  for (const f of json.facets || []) {
    byFacet[f.name] = (f.fields || []).map((x) => ({
      label: x.label,
      count: x.count,
      facet: f.name,
      _n: norm(x.label),
    }));
  }
  const flatLen = (json?.facets || []).reduce((a, f) => a + (f.fields?.length || 0), 0);
  console.log(
    "[A06][EU] facets fields:",
    Object.keys(byFacet).length,
    "totalResults:",
    json?.totalResults || 0,
    "flatten:",
    flatLen
  );
  return { byFacet, total: json?.totalResults || 0 };
}

// ---------- Europeana: fallback query count ----------
async function europeanaCountForLabel(label) {
  const key = process.env.EUROPEANA_WSKEY;
  const base = String(label || "").trim();
  if (!base) return 0;

  // probeer label + aliasvarianten; neem hoogste count
  const variants = [base, ...(ALIAS[norm(base)] || [])];
  let best = 0;
  for (const v of variants.slice(0, 3)) {
    const qs = new URLSearchParams({
      wskey: key,
      query: `"${v}"`,
      rows: "0",
      profile: "minimal",
      media: "true",
    });
    const url = `https://api.europeana.eu/record/v2/search.json?${qs}`;
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const j = await r.json();
      const n = j?.totalResults || 0;
      if (n > best) best = n;
      if (best > 0) break; // early exit op eerste hit
    } catch {}
  }
  return best;
}

// ---------- AI suggesties ----------
async function aiSuggest(term) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash-lite";
  if (!key) return { items: { persons: [], events: [], concepts: [], places: [] }, model: null };

  const body = {
    contents: [
      {
        parts: [
          {
            text:
              `Geef voor zoekterm "${term}" STRIKT JSON met maximaal 12 personen, 8 gebeurtenissen, 12 concepten en 10 plaatsen.\n` +
              `Formaat:\n` +
              `{"persons":[{"label":"..."}],"events":[{"label":"..."}],"concepts":[{"label":"..."}],"places":[{"label":"..."}]}\n` +
              `Geen codefences, geen uitleg, alleen JSON.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
      response_mime_type: "application/json",
    },
  };

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    const json = await resp.json();
    let txt =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      json?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data ||
      "";

    if (txt && (txt.includes("```") || !txt.trim().startsWith("{"))) {
      const m = txt.match(/\{[\s\S]*\}$/);
      if (m) txt = m[0];
    }

    let parsed = {};
    try {
      parsed = JSON.parse(txt);
    } catch {
      parsed = {};
    }

    const out = {
      persons: (parsed.persons || []).map((x) => String(x.label || "").trim()).filter(Boolean),
      events: (parsed.events || []).map((x) => String(x.label || "").trim()).filter(Boolean),
      concepts: (parsed.concepts || []).map((x) => String(x.label || "").trim()).filter(Boolean),
      places: (parsed.places || []).map((x) => String(x.label || "").trim()).filter(Boolean),
    };
    return { items: out, model };
  } catch (e) {
    console.warn("[A06][AI] suggest error", e?.message);
    return { items: { persons: [], events: [], concepts: [], places: [] }, model: null };
  }
}

// ---------- helpers ----------
function aliasesFor(label) {
  const base = norm(label);
  return [label, ...(ALIAS[base] || [])];
}

function bestCountFor(label, pools, threshold = 0.62) {
  const candidates = pools || [];
  // 1) exact norm-match / alias
  for (const l of aliasesFor(label)) {
    const n = norm(l);
    const hit = candidates.find((c) => c._n === n);
    if (hit) return hit.count || 0;
  }
  // 2) fuzzy
  let best = 0;
  for (const c of candidates) {
    const s = tokenSetSim(label, c.label);
    if (s >= threshold && (c.count || 0) > best) best = c.count || 0;
  }
  return best;
}

function enrichCounts(kind, labels, byFacet) {
  // Pools per soort (nu met skos_concept erbij)
  let pools = [];
  if (kind === "person" || kind === "concept" || kind === "event") {
    pools = [
      ...(byFacet["proxy_dc_subject"] || []).slice(0, 600),
      ...(byFacet["skos_concept"] || []).slice(0, 600),
    ];
  } else if (kind === "place") {
    pools = [
      ...(byFacet["proxy_dc_coverage"] || []).slice(0, 300),
      ...(byFacet["COUNTRY"] || []).slice(0, 300),
    ];
  }

  return labels.map((label) => ({
    label,
    kind,
    count: bestCountFor(label, pools),
  }));
}

// ---------- hoofd ----------
async function hybridChips({ term }) {
  const q = String(term || "").trim();
  if (!q) return { model: process.env.GEMINI_MODEL_CHIPS || null, chips: [] };

  // 1) facets
  const { byFacet } = await fetchEuropeanaFacets(q);

  // 2) AI + seeds
  const { items: aiItems, model } = await aiSuggest(q);
  const persons = uniqBy([...(aiItems.persons || []), ...SEEDS.person], (s) => norm(s));
  const events = uniqBy([...(aiItems.events || []), ...SEEDS.event], (s) => norm(s));
  const concepts = uniqBy([...(aiItems.concepts || []), ...SEEDS.concept], (s) => norm(s));
  const places = uniqBy([...(aiItems.places || []), ...SEEDS.place], (s) => norm(s));

  // 3) verrijk counts uit facets
  let perKind = {
    person: enrichCounts("person", persons, byFacet),
    event: enrichCounts("event", events, byFacet),
    concept: enrichCounts("concept", concepts, byFacet),
    place: enrichCounts("place", places, byFacet),
  };

  // 4) fallback query-count voor 0's (max ~40 labels om API te sparen)
  const MAX_FALLBACK = 40;
  const zeroTargets = [];
  for (const k of Object.keys(perKind)) {
    for (const x of perKind[k]) {
      if ((x.count || 0) === 0) zeroTargets.push(x);
    }
  }
  const targets = zeroTargets.slice(0, MAX_FALLBACK);
  for (const x of targets) {
    x.count = await europeanaCountForLabel(x.label);
  }

  // 5) per soort minimaal 10, sorteer op count
  const MIN = 10;
  for (const k of Object.keys(perKind)) {
    const withCount = perKind[k].filter((x) => (x.count || 0) > 0);
    const zeroes = perKind[k].filter((x) => (x.count || 0) === 0);
    if (withCount.length < MIN) {
      perKind[k] = [...withCount, ...zeroes.slice(0, MIN - withCount.length)];
    } else {
      perKind[k] = withCount;
    }
    perKind[k].sort((a, b) => (b.count || 0) - (a.count || 0));
  }

  // 6) combineer in vaste volgorde
  const order = ["person", "event", "concept", "place"];
  const chips = [];
  for (const k of order) for (const x of perKind[k]) chips.push({ label: x.label, kind: k, count: x.count || 0 });

  return { model: model || process.env.GEMINI_MODEL_CHIPS || null, chips };
}

module.exports = { hybridChips };


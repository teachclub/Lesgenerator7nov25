// utils/boost.cjs
// Scoring & selectie voor hybride chips (AI + Europeana facets)

const WORD_RE = /[\p{L}\p{N}]+/gu;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s) {
  return (String(s).match(WORD_RE) || []).map((t) => norm(t)).filter(Boolean);
}

function tokenSetSim(a, b) {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const uni = new Set([...A, ...B]).size;
  return inter / uni;
}

function isLikelyYearLabel(label) {
  const n = norm(label);
  // enkele jaartallen of compacte ranges
  return /^\d{3,4}(-\d{2,4})?$/.test(n) || /^\d{4}$/.test(n);
}

function startsWithAny(label, prefixes) {
  const L = String(label || "");
  return (prefixes || []).some((p) => L.startsWith(p));
}

function matchesAnyRegex(label, regexList) {
  const n = norm(label);
  return (regexList || []).some((rx) => new RegExp(rx, "i").test(n));
}

// ---- kind mapping vanuit Europeana facet ----
function kindFromFacet(facetName, label) {
  switch (facetName) {
    case "proxy_dc_coverage":
    case "COUNTRY":
      return "place";
    case "PROVIDER":
    case "DATA_PROVIDER":
      return "institution";
    case "TYPE":
    case "MIME_TYPE":
      return "format";
    case "proxy_dc_subject":
    case "proxy_dc_title":
      // heuristiek: als 'luther', 'calvijn', 'paus' etc. → person
      if (/\b(luther|melanchthon|calvijn|muntzer|paus|leo\s*x|karel\s*v|charles\s*v)\b/i.test(label)) {
        return "person";
      }
      return "concept";
    case "YEAR":
      return "year";
    default:
      return "concept";
  }
}

// ---- dedup ----
function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

// ---- hoofd-boost & selectie ----
/**
 * boostAndSelect
 * @param {{term:string, aiItems:Array, facetItems:Array, seedItems:Array, stop:Object}} input
 * @param {{perKindLimit:Object, globalLimit:number}} cfg
 * @returns {{chips:Array}}
 */
function boostAndSelect(input, cfg) {
  const term = input.term || "";
  const aiItems = Array.isArray(input.aiItems) ? input.aiItems : [];
  const facetItems = Array.isArray(input.facetItems) ? input.facetItems : [];
  const seedItems = Array.isArray(input.seedItems) ? input.seedItems : [];
  const stop = input.stop || { labels: [], prefixes: [], regex: [] };

  const perKindLimit = (cfg && cfg.perKindLimit) || {
    person: 10,
    event: 10,
    concept: 10,
    place: 10,
    institution: 6,
    format: 4,
  };
  const globalLimit = (cfg && cfg.globalLimit) || 40;

  const normTerm = norm(term);

  // 1) Zet facetItems om naar gestandaardiseerde items met kind
  const facetStd = facetItems.map((f) => {
    const kind = kindFromFacet(f.facet, f.label);
    return {
      label: f.label,
      kind,
      facet: f.facet,
      count: Number(f.count || 0),
      source: "FACET",
    };
  });

  // 2) Sanitize/filters (stoplist, urls, pure jaarlabels -> eruit)
  function keepItem(x) {
    if (!x || !x.label) return false;
    if (startsWithAny(x.label, stop.prefixes)) return false;
    if (matchesAnyRegex(x.label, stop.regex)) return false;
    if (isLikelyYearLabel(x.label)) return false;
    return true;
  }

  let aiClean = aiItems.filter(keepItem);
  let facetClean = facetStd.filter(keepItem);

  // 3) Merge AI + facets op label (case-insensitive) om counts toe te kennen aan AI
  // key: kind::norm(label) zodat person Luther ≠ concept Luther
  function keyOf(x) {
    return `${x.kind || "concept"}::${norm(x.label)}`;
  }

  const map = new Map();

  // Start met facets (zij hebben counts)
  for (const f of facetClean) {
    const k = keyOf(f);
    map.set(k, { ...f });
  }

  // Voeg AI toe, combineer waar mogelijk (boost AI met facet-counts)
  for (const a of aiClean) {
    const k = keyOf(a);
    if (map.has(k)) {
      const prev = map.get(k);
      map.set(k, {
        ...prev,
        source: prev.source === "FACET" ? "AI+FACET" : prev.source,
        // bewaar hoogste count
        count: Math.max(Number(prev.count || 0), Number(a.count || 0)),
      });
    } else {
      // AI heeft geen count → 0, maar krijgt straks seed/relevance boost
      map.set(k, { ...a, count: 0 });
    }
  }

  // 4) Voeg seeds toe en forceer dat ze zichtbaar kunnen worden
  for (const s of seedItems) {
    const k = keyOf(s);
    if (!map.has(k)) {
      map.set(k, { ...s, count: 0, source: "SEED" });
    } else {
      const prev = map.get(k);
      map.set(k, { ...prev, source: prev.source === "FACET" ? "SEED+FACET" : prev.source });
    }
  }

  let all = Array.from(map.values());

  // 5) Relevance score
  //    - base op count (genormaliseerd)
  //    - + AI/SEED boosts
  //    - + semantic similarity met zoekterm
  const maxCount = Math.max(1, ...all.map((x) => Number(x.count || 0)));

  function baseScore(x) {
    const c = Number(x.count || 0) / maxCount; // 0..1
    const sim = tokenSetSim(x.label, normTerm); // 0..1
    let srcBoost = 0;
    if (x.source && String(x.source).includes("AI")) srcBoost += 0.25;   // AI heeft relevante voorstellen
    if (x.source && String(x.source).includes("SEED")) srcBoost += 0.3;  // seeds moeten zichtbaar zijn
    // concepten zonder count krijgen klein startpunt
    const floor = x.count ? 0 : 0.05;
    return floor + 0.6 * c + 0.3 * sim + srcBoost;
  }

  // 6) Sort per kind en pas perKindLimit toe
  const buckets = new Map();
  for (const x of all) {
    const k = x.kind || "concept";
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(x);
  }

  for (const [k, arr] of buckets) {
    arr.sort((a, b) => baseScore(b) - baseScore(a));
    const limit = perKindLimit[k] || 8;
    buckets.set(k, arr.slice(0, limit));
  }

  // 7) Combineer, sorteer globaal en knip op globalLimit
  const order = { person: 0, event: 1, concept: 2, place: 3, institution: 4, format: 5 };
  let chips = [];
  for (const [k, arr] of buckets) chips.push(...arr);

  // laatste schoonmaak: label trim & zonder kale urls
  chips = chips
    .map((x) => ({ ...x, label: String(x.label).trim() }))
    .filter((x) => x.label && !/^https?:\/\//i.test(x.label));

  // dedup op (kind,label)
  chips = uniqBy(chips, (x) => `${x.kind}::${norm(x.label)}`);

  chips.sort((a, b) => {
    const oa = order[a.kind] ?? 9;
    const ob = order[b.kind] ?? 9;
    if (oa !== ob) return oa - ob;
    return baseScore(b) - baseScore(a);
  });

  if (chips.length > globalLimit) chips = chips.slice(0, globalLimit);

  return { chips };
}

module.exports = {
  norm,
  boostAndSelect,
};


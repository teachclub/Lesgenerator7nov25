const fetch = global.fetch;
const { URLSearchParams } = require("url");
const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
const arr = (v) => Array.isArray(v) ? v : [];
const safe = (v, d) => (v === undefined || v === null ? d : v);
const log = (...args) => console.log(...args);
const norm = (s) => String(s || "").toLowerCase()
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ").trim();
function tokenSetSim(a, b) {
  const A = new Set(norm(a).split(" ").filter(Boolean));
  const B = new Set(norm(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const t of A) if (B.has(t)) inter++;
  const uni = new Set([...A, ...B]).size;
  return inter / uni;
}
const FACET_FIELDS = [
  "skos_concept", "proxy_dc_subject", "proxy_dc_title", "proxy_dc_coverage",
  "DATA_PROVIDER", "PROVIDER", "AGGREGATION_PROVIDER",
  "COUNTRY", "LANGUAGE",
  "TYPE", "MIME_TYPE",
  "RIGHTS",
  "YEAR",
];
async function fetchEuropeanaFacets({ term }) {
  const key = process.env.EUROPEANA_WSKEY;
  const params = new URLSearchParams({
    wskey: key,
    query: String(term || "").trim(),
    rows: "0",
    profile: "facets",
    media: "true",
    'facet-limit': "50",
  });
  for (const f of FACET_FIELDS) params.append("facet", f);

  const url = `https://api.europeana.eu/record/v2/search.json?${params}`;
  log("[A06][EU] URL:", url);
  const res = await fetch(url);
  if (!res.ok) {
    console.log("[A06][EU] HTTP", res.status, await res.text().catch(()=>"(no body)"));
    return { ok:false, status:res.status, facets:[] };
  }
  const json = await res.json().catch(e => (console.log("[A06][EU] JSON parse fail", e.message), null));
  if (!json) return { ok:false, status:502, facets:[] };
  
  const facets = Array.isArray(json.facets) ? json.facets : [];
  console.log("[A06][EU] facets fields:", facets.length, "totalResults:", json.totalResults);
  return { ok:true, status:200, facets, raw:json };
}
function parseAiJson(text) {
  if (!text) return null;
  
  let jsonString = text;
  
  const fenceMatch = jsonString.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    jsonString = fenceMatch[1];
  } else {
    const braceMatch = jsonString.match(/\{[\s\S]*\}/);
    if (braceMatch && braceMatch[0]) {
      jsonString = braceMatch[0];
    }
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.log("[A06][AI] Definitieve JSON parse mislukt:", e.message);
    return null;
  }
}
async function fetchAiCandidates({ term, limit = 30 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model  = process.env.GEMINI_MODEL_CHIPS || "gemini-2.0-flash";
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `
Je krijgt de zoekterm: "${term}".
Geef maximaal ${limit} zeer relevante suggesties als STRIKT JSON:
{
  "items": [
    { "label": "Karel V", "kind": "person", "aliases": ["Charles V","Carlos V"] },
    { "label": "Rijksdag van Worms (1521)", "kind": "event" }
  ]
}
Toegestane kind: "person","event","place","concept". GEEN extra tekst. Alleen JSON.
`.trim();

  const body = {
    contents: [{ parts: [{ text: prompt }]}],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  };

  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.log("[A06][AI] HTTP", res.status, await res.text().catch(()=>"(no body)"));
    return { ok: false, status: res.status, items: [] };
  }

  const json = await res.json().catch(e => (console.log("[A06][AI] JSON parse fail", e.message), null));
  if (!json) return { ok:false, status:502, items:[] };

  const parts = (json.candidates?.[0]?.content?.parts ?? []).filter(Boolean);
  const merged = parts.map(p => p.text).filter(Boolean).join("\n");
  if (!merged) {
    console.log("[A06][AI] leeg parts-tekst; keys:", Object.keys(json));
    return { ok:true, status:200, items:[] };
  }

  const parsed = parseAiJson(merged);
  
  if (!parsed) {
    console.log("[A06][AI] Kon JSON niet parsen uit:", merged);
    return { ok: true, status: 200, items: [] };
  }

  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  const clean = items.map(x => ({
    label: String(x?.label || "").trim(),
    kind:  String(x?.kind  || "concept").trim(),
    aliases: (Array.isArray(x?.aliases) ? x.aliases : []).map(s => String(s||"").trim()).filter(Boolean),
  })).filter(x => x.label);

  return { ok: true, status: 200, items: clean };
}
function bestMatch(label, facetLabels) {
  const n = norm(label);
  let best = null;
  for (const f of facetLabels) {
    const sim = tokenSetSim(n, f.nlabel);
    const starts = f.nlabel.startsWith(n) ? 1 : 0;
    const score = 0.7 * sim + 0.25 * starts + 0.05 * Math.log10((f.count||0)+1);
    if (!best || score > best.score) best = { score, item: f };
  }
  return best;
}
function flattenFacetLabels(facets = []) {
  const out = [];
  for (const f of facets) {
    const name = f?.name || "UNKNOWN";
    const fields = arr(f?.fields);
    for (const field of fields) {
      const label = String(field?.label ?? "").trim();
      const count = Number(field?.count ?? 0) || 0;
      if (!label || count === 0) continue;
      out.push({ facet: name, label, nlabel: norm(label), count });
    }
  }
  return out;
}
async function hybridChips({ term = "", limit = 20 }) {
  const t = String(term || "").trim();
  log("[A06 Hybride v2] Starten... term=", JSON.stringify(t));

  if (t.length < 2) {
    log("[A06 Hybride v2] Te korte/lege term -> geen AI/facets call");
    return { ok: true, model: process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash", chips: [] };
  }

  const [ai, ef] = await Promise.all([
    fetchAiCandidates({ term: t, limit: 30 }),
    fetchEuropeanaFacets({ term: t }),
  ]);

  if (!ai.ok) log("[A06] AI status:", ai.status);
  if (!ef.ok) log("[A06] Facets status:", ef.status);

  const aiItems   = arr(ai.items);
  const facetFlat = flattenFacetLabels(arr(ef.facets));
  log(`[A06 Hybride v2] AI items: ${aiItems.length}`);
  log(`[A06 Hybride v2] Facet labels: ${facetFlat.length}`);

  if (!aiItems.length && !facetFlat.length) {
    log("[A06] AI en facets leeg → probeer fallback via searchRaw");
    const subs = await fallbackSubjectsFromSearchRaw({ term: t, rows: 50 });
    const chips = subs.slice(0, limit).map(s => ({ label: s.label, kind:"concept", count: s.count, facet:"FALLBACK_SUBJECT" }));
    return { ok:true, model: process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash", chips };
  }

  const taken = new Set();
  const matched = [];
  for (const it of aiItems) {
    const cand = [it.label, ...it.aliases];
    let best = null;
    for (const c of cand) {
      const m = bestMatch(c, facetFlat);
      if (m && (!best || m.score > best.score)) best = m;
    }
    if (!best) continue;
    if (best.score < 0.60) continue;
    const key = `${it.kind}|${best.item.nlabel}`;
    if (taken.has(key)) continue;
    taken.add(key);
    matched.push({
      label: it.label,
      alias: best.item.label !== it.label ? best.item.label : undefined,
      kind: it.kind || "concept",
      count: best.item.count,
      facet: best.item.facet,
    });
  }

  if (matched.length) {
    return {
      ok: true,
      model: process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash",
      chips: capPerKind(matched, undefined, limit),
    };
  }

  const SUBJECT_FACETS = new Set(["skos_concept","proxy_dc_subject","proxy_dc_title"]);
  const subjectOnly = facetFlat
    .filter(f => SUBJECT_FACETS.has(f.facet))
    .filter(f => norm(f.label) !== norm(term) && !/^luther(\b|$)/i.test(f.label));

  const top = subjectOnly.sort((a,b)=>b.count-a.count).slice(0, limit).map(f => ({
    label: f.label,
    kind: "concept",
    count: f.count,
    facet: f.facet,
  }));

  return {
    ok: true,
    model: process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash",
    chips: top,
  };
}
function capPerKind(list, caps = { person:6, event:6, place:4, concept:4 }, limit = 20) {
  const per = {};
  const out = [];
  for (const x of list.sort((a,b)=>b.count-a.count)) {
    const k = x.kind || "concept";
    per[k] = (per[k]||0) + 1;
    if ((per[k] <= (caps[k]||4)) && out.length < limit) out.push(x);
  }
  return out;
}
module.exports = { hybridChips };

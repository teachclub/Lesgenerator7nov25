/**
 * @typedef {Object} Chip
 * @property {string} label
 * @property {("person"|"event"|"concept"|"place"|"institution"|"format")} kind
 * @property {number=} count
 */

function apiBase() {
  const raw = (import.meta?.env && import.meta.env.VITE_API_BASE) || "http://localhost:8080";
  return String(raw).trim().replace(/\/+$/, "");
}

function norm(s) {
  return String(s || "").normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}

const CANON = new Map([
  ["maarten luther", "Maarten Luther"],
  ["martin luther", "Maarten Luther"],
  ["erasmus", "Erasmus"],
  ["desiderius erasmus", "Erasmus"],
  ["john calvin", "Johannes Calvijn"],
  ["johannes calvin", "Johannes Calvijn"],
  ["jean calvin", "Johannes Calvijn"],
  ["calvijn", "Johannes Calvijn"],
  ["philip melanchthon", "Philipp Melanchthon"],
  ["melanchthon", "Philipp Melanchthon"],
  ["95 theses", "95 stellingen"],
  ["augsburg confession", "Augsburgse Confessie"],
  ["edict of worms (1521)", "Edict van Worms (1521)"],
  ["diet of worms (1521)", "Rijksdag van Worms (1521)"],
  ["diet of augsburg (1530)", "Rijksdag van Augsburg (1530)"],
  ["holy roman empire", "Heilig Roomse Rijk"],
  ["wittenberg", "Wittenberg"],
  ["wartburg", "Wartburg"],
  ["worms", "Worms"],
  ["erfurt", "Erfurt"],
]);

function preferNlLabel(label) {
  const n = norm(label);
  return CANON.get(n) || (label ?? "");
}

function dedupChips(chips) {
  const seen = new Map();
  for (const c of chips || []) {
    const canon = preferNlLabel(c.label);
    const key = `${c.kind}::${norm(canon)}`;
    const prev = seen.get(key);
    if (!prev || (Number(c.count || 0) > Number(prev.count || 0))) {
      seen.set(key, { ...c, label: canon });
    }
  }
  return [...seen.values()];
}

function filterZeroCounts(chips, { hideZero = true } = {}) {
  if (!hideZero) return chips || [];
  return (chips || []).filter((ch) => (ch.count ?? 0) > 0);
}

const TOPIC_SEEDS = [
  {
    when: /(^|\b)luther(s)?(\b|$)/i,
    boost: new Map([
      ["person::maarten luther", 50],
      ["concept::95 stellingen", 20],
      ["concept::augsburgse confessie", 18],
      ["place::wittenberg", 16],
      ["place::wartburg", 15],
      ["event::rijksdag van worms (1521)", 14],
      ["event::edict van worms (1521)", 12],
      ["person::philipp melanchthon", 10],
      ["person::johannes calvijn", 6],
    ]),
  },
];

function tokenOverlap(term, label) {
  const ta = norm(term).split(/\s+/).filter(Boolean);
  const lb = norm(label).split(/\s+/).filter(Boolean);
  if (!ta.length || !lb.length) return 0;
  let hits = 0;
  for (const t of ta) if (lb.includes(t)) hits++;
  return hits / Math.max(ta.length, lb.length);
}

function rerankChips(term, chips) {
  const nterm = norm(term);
  const seedBoost = new Map();
  for (const topic of TOPIC_SEEDS) {
    if (topic.when.test(term)) {
      for (const [k, v] of topic.boost.entries()) seedBoost.set(k, v);
    }
  }
  return [...(chips || [])].sort((a, b) => {
    const ka = `${a.kind}::${norm(a.label)}`;
    const kb = `${b.kind}::${norm(b.label)}`;
    const sa = (seedBoost.get(ka) || 0) + tokenOverlap(nterm, a.label) * 5;
    const sb = (seedBoost.get(kb) || 0) + tokenOverlap(nterm, b.label) * 5;
    if (sa !== sb) return sb - sa;
    const ca = Number(a.count || 0);
    const cb = Number(b.count || 0);
    if (ca !== cb) return cb - ca;
    return norm(a.label).localeCompare(norm(b.label));
  });
}

function splitAndCap(chips, perKindCaps) {
  const grouped = new Map();
  for (const c of chips || []) {
    if (!grouped.has(c.kind)) grouped.set(c.kind, []);
    grouped.get(c.kind).push(c);
  }
  const out = [];
  for (const [kind, arr] of grouped.entries()) {
    const cap = perKindCaps?.[kind] ?? Infinity;
    out.push(...arr.slice(0, cap));
  }
  return out;
}

function capsToQuery(perKind) {
  const map = {
    person: "capPerson",
    event: "capEvent",
    concept: "capConcept",
    place: "capPlace",
    institution: "capInstitution",
    format: "capFormat",
  };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(perKind || {})) {
    const key = map[k];
    if (key && Number.isFinite(v)) params.set(key, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Haal chips op voor een zoekterm.
 * @param {string} term
 * @param {{limit?: number, signal?: AbortSignal, hideZero?: boolean, perKind?: Record<string, number>}=} opts
 * @returns {Promise<{ ok: boolean, model?: string|null, chips: Chip[] }>}
 */
export async function fetchChips(term, opts = {}) {
  if (!term || typeof term !== "string") {
    throw new Error("fetchChips: 'term' is verplicht (string).");
  }
  const {
    limit,
    signal,
    hideZero = true,
    perKind = { person: 10, event: 8, concept: 10, place: 8, institution: 6, format: 6 },
  } = opts;

  const body = limit ? { term, limit } : { term };
  const qs = capsToQuery(perKind);

  const res = await fetch(`${apiBase()}/api/chips${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  let json;
  try {
    json = contentType.includes("application/json") ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!json) {
    throw new Error(`/api/chips gaf geen geldige JSON terug (status ${res.status}). Eerste bytes: ${text.slice(0,120)}`);
  }
  if (!res.ok || json.ok === false) {
    throw new Error(`/api/chips faalde: ${json.error || `HTTP ${res.status}`}`);
  }

  let chips = Array.isArray(json.chips) ? json.chips : [];
  chips = chips.map((c) => ({ ...c, label: preferNlLabel(c.label) }));
  chips = dedupChips(chips);
  chips = filterZeroCounts(chips, { hideZero });
  chips = rerankChips(term, chips);
  chips = splitAndCap(chips, perKind);
  return { ok: true, model: json.model ?? null, chips };
}

// Optioneel: healthcheck helper
export async function pingBackend() {
  try {
    const res = await fetch(`${apiBase()}/`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}


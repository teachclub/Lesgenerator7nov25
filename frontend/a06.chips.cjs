// services/a06.chips.cjs
// BACKWIJ.B06 — "Geverifieerde Chips" (Hybride Poortwachter)
// 1) getGeminiSuggestions(searchPayload) → AI-kandidaat-chips
// 2) performEuropeanaSearch(verificationPayload) → echte telling voor co-existentie
// Resultaat: geverifieerde chips gesorteerd (verified eerst, dan count desc)
const { getGeminiSuggestions } = require("./a05.gemini.cjs");
const { performEuropeanaSearch } = require("./a23.europeana.cjs");

// --- Tunables ---
const TIMEOUT_MS = 30_000;     // max 30s per verificatie
const MAX_CONCURRENCY = 6;     // parallelle verificaties
const MAX_RETURN = 25;         // max chips terug naar frontend

// --- Helpers ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function withTimeout(promise, ms, label = "timeout") {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(label)), ms)
    ),
  ]);
}
function normaliseStr(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
function uniq(arr) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = normaliseStr(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function buildVerificationPayload(baseTerms, chipLabel, base) {
  return {
    ...base,
    terms: [...baseTerms, chipLabel],
    mode: "AND",      // co-existentie is altijd AND
    rows: 0,          // alleen telling; bronnen niet nodig
    page: 1,
  };
}
function extractTotal(result) {
  // accepteer meerdere vormen uit a23.europeana.cjs
  if (!result) return 0;
  if (typeof result.total === "number") return result.total;
  if (result.response && typeof result.response.numFound === "number") {
    return result.response.numFound;
  }
  if (Array.isArray(result.docs)) return result.docs.length;
  if (Array.isArray(result.results)) return result.results.length;
  return 0;
}
function sortChips(a, b) {
  // verified (true) eerst, dan count desc, dan alfabetisch
  if (!!b.verified !== !!a.verified) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
  if (b.count !== a.count) return b.count - a.count;
  return a.term.localeCompare(b.term, "nl");
}

/**
 * @param {object} searchPayload
 * { terms[], mode, doelgroep, filters, tv[], ka[] }
 * @returns {Promise<Array<{term, kind, count, verified, path?, raw?}>>}
 */
async function generateVerifiedChips(searchPayload) {
  const {
    terms = [],
    mode = "AND",
    doelgroep = {},
    filters = {},
    tv = [],
    ka = [],
  } = searchPayload || {};

  // 1) Basis-terms normaliseren & leeg eruit
  const baseTerms = uniq(
    (terms || []).map((t) => normaliseStr(t)).filter(Boolean)
  );

  // 2) AI-kandidaten ophalen
  console.log("[a06.chips] Stap 1: AI-suggesties ophalen voor:", baseTerms);
  let potentialChips = [];
  try {
    potentialChips = (await withTimeout(
      getGeminiSuggestions(searchPayload),
      TIMEOUT_MS,
      "chips-ai-timeout"
    )) || [];
  } catch (e) {
    console.warn("[a06.chips] AI-suggesties fout:", e.message);
    potentialChips = [];
  }

  if (!Array.isArray(potentialChips) || potentialChips.length === 0) {
    console.log("[a06.chips] Geen potentiële chips gevonden via a05.");
    return [];
  }

  // 3) Kandidaten schonen: geen duplicaten van bestaande terms; label ≥ 2 chars
  const baseSet = new Set(baseTerms.map(normaliseStr));
  const cleaned = uniq(
    potentialChips
      .map((c) => ({
        term: normaliseStr(c.label || c.term || c.name || c.title),
        kind: String(c.type || c.kind || "other").toLowerCase(),
        raw: c,
      }))
      .filter((c) => c.term && c.term.length >= 2 && !baseSet.has(c.term))
  );

  if (cleaned.length === 0) return [];

  console.log(`[a06.chips] Stap 2: ${cleaned.length} chips verifiëren…`);

  // 4) Concurrencylimiet + timeout per verificatie
  const results = [];
  let i = 0;

  const verifyOne = async (chip) => {
    const verificationPayload = buildVerificationPayload(
      baseTerms,
      chip.term,
      { doelgroep, filters, tv, ka, mode }
    );
    const res = await withTimeout(
      performEuropeanaSearch(verificationPayload),
      TIMEOUT_MS,
      "chips-verify-timeout"
    );
    const total = extractTotal(res);
    return {
      term: chip.term,
      kind: chip.kind,
      count: total,
      verified: total > 0, // co-existentie gevonden
      raw: chip.raw,
    };
  };

  // eenvoudige worker-pool
  async function worker() {
    while (i < cleaned.length) {
      const idx = i++;
      const chip = cleaned[idx];
      try {
        const v = await verifyOne(chip);
        if (v.count > 0) results.push(v);
      } catch (err) {
        console.warn(`[a06.chips] Verificatie fout voor "${chip.term}":`, err.message);
        // skip: geen throw nodig
      }
      // mini-yield om eventloop adem te geven
      if (idx % 5 === 4) await sleep(0);
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, cleaned.length) }, worker);
  await Promise.all(workers);

  // 5) Sorteren en teruggeven
  results.sort(sortChips);
  const finalChips = results.slice(0, MAX_RETURN);

  console.log(`[a06.chips] Verificatie compleet. ${finalChips.length} relevante chips teruggestuurd.`);
  return finalChips;
}
module.exports = {
  generateVerifiedChips,
};

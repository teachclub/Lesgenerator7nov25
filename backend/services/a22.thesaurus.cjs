// a22.thesaurus.cjs — lichte, rule-based fallback (later: Gemini-ERE)
const POSTER_SYNONYMS = [
  "poster","affiche","plakat","affisch","cartell","cartel","plakát","plakatą","plakaty","Póstaer","Cartell","Manifesto"
];

function expandTerm(term="") {
  const t = term.trim();
  const out = { who: [], what: [], where: [] };

  // minimale regels (voorbeeld)
  if (/abram games/i.test(t)) out.who.push("Abram Games");
  if (/ministry of information/i.test(t)) out.what.push("Ministry of Information");

  return out;
}

function chipsFor(term="") {
  // altijd poster-synoniemen als chips (passief)
  return POSTER_SYNONYMS.map(v => ({ facet: "what", value: v, active: false }));
}

module.exports = { expandTerm, chipsFor };


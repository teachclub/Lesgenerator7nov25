"use strict";

// services/a22.thesaurus.cjs
// Doel: Nederlandse synoniemen/zoekvarianten voor “domme” termen,
// + normalisatie (haakjes/kwalificaties verwijderen) zodat Kleio beter matcht.

function normStr(x) {
  return typeof x === "string" ? x : "";
}

function squashWs(s) {
  return normStr(s).replace(/\s+/g, " ").trim();
}

function normalizeTerm(term) {
  let t = squashWs(term);

  // verwijder haakjes-informatie: "triangulaire handel (vroeg)" -> "triangulaire handel"
  t = t.replace(/\s*\([^)]*\)\s*/g, " ");

  // verwijder quotes/rare dashes
  t = t.replace(/[“”"']/g, "");
  t = t.replace(/[–—]/g, "-");

  // vaak voorkomende “didactische” toevoegingen weghalen
  t = t.replace(/\b(vroeg|laat|modern|klassiek|middeleeuws|oud)\b/gi, " ");

  // dubbele leestekens/scheidingstekens opschonen
  t = t.replace(/[,:;]+/g, " ");
  t = squashWs(t);

  return t;
}

// Mini-woordenboek: uitbreidbaar.
// Keys zijn genormaliseerd (lowercase); values zijn NL zoekvarianten.
const SYN = {
  // tv5 / slavernij- en handelscontext
  "triangulaire handel": [
    "driehoekshandel",
    "trans-Atlantische slavenhandel",
    "Atlantische slavenhandel",
    "slavenhandel",
    "middenpassage",
    "plantage-economie",
    "West-Indische Compagnie",
    "WIC"
  ],
  "driehoekshandel": [
    "triangulaire handel",
    "trans-Atlantische slavenhandel",
    "slavenhandel",
    "middenpassage",
    "plantage-economie",
    "WIC",
    "West-Indische Compagnie"
  ],
  "slavenhandel": [
    "trans-Atlantische slavenhandel",
    "Atlantische slavenhandel",
    "slavernij",
    "middenpassage",
    "plantages",
    "WIC"
  ],
  "slavernij": [
    "slavenhandel",
    "trans-Atlantische slavenhandel",
    "plantage-economie",
    "plantages",
    "afschaffing slavernij",
    "abolitionisme"
  ],

  // tv8 / modern imperialisme (KA33-achtig)
  "imperialisme": [
    "modern imperialisme",
    "kolonialisme",
    "kolonies",
    "scramble for africa",
    "koloniale overheersing",
    "beschavingsmissie"
  ],
  "modern imperialisme": [
    "imperialisme",
    "kolonialisme",
    "scramble for africa",
    "kolonie",
    "protectoraat",
    "grondstoffen",
    "afzetmarkt",
    "beschavingsmissie"
  ],
  "kolonialisme": [
    "imperialisme",
    "modern imperialisme",
    "kolonie",
    "kolonies",
    "protectoraat",
    "koloniale overheersing"
  ]
};

function uniqueKeepOrder(arr) {
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(arr) ? arr : []) {
    const s = squashWs(v);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function expandTerm(term) {
  const raw = squashWs(term);
  const norm = normalizeTerm(raw);
  const key = norm.toLowerCase();

  // basis: origineel + genormaliseerd
  const base = uniqueKeepOrder([raw, norm]);

  // woordenboek-hits
  const dict = SYN[key] || [];

  // extra simpele varianten:
  // - zonder streepjes
  // - losse woorden (alleen als het 2+ woorden zijn, anders te noisy)
  const variants = [];
  if (norm.includes("-")) variants.push(norm.replace(/-/g, " "));
  const parts = norm.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    // voeg de 2 belangrijkste woorden samen als “kortere” zoekoptie
    variants.push(parts.slice(0, 2).join(" "));
  }

  const what = uniqueKeepOrder([...base, ...dict, ...variants]);

  // Voor nu vullen we alleen "what" met synoniemen/zoektermen.
  // (who/where kunnen later met een echte KA-woordenlijst)
  return { who: [], what, where: [] };
}

function chipsFor(term) {
  const expanded = expandTerm(term);
  return (expanded.what || []).map((v) => ({
    facet: "synoniem",
    value: v,
    active: false
  }));
}

module.exports = {
  normalizeTerm,
  expandTerm,
  chipsFor
};


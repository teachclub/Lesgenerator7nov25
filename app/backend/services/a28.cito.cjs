"use strict";

const fs = require("fs");
const path = require("path");

const CITO_PATH = path.join(__dirname, "..", "data", "cito.json");

let citoCache = [];

// ===== util =====
function asString(x) {
  if (x === null || x === undefined) return "";
  return String(x);
}

function normTvToString(tv) {
  // accepteer: "9", "Tijdvak 9", "TV9", ["9"], ["TV9"], etc.
  if (Array.isArray(tv)) tv = tv[0];
  const s = asString(tv).trim();
  if (!s) return "";
  const num = s.replace(/\D/g, "");
  return num ? `Tijdvak ${num}` : "";
}

function normKaToNumbers(ka) {
  // accepteer: "KA42", ["KA42"], ["42"], etc.
  if (!ka) return [];
  const arr = Array.isArray(ka) ? ka : [ka];
  return arr
    .map((v) => asString(v).replace(/\D/g, ""))
    .filter((n) => n);
}

function safeLower(x) {
  return asString(x).toLowerCase();
}

// ===== load once =====
function loadCitoData() {
  try {
    const raw = fs.readFileSync(CITO_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) citoCache = parsed;
    else if (parsed && Array.isArray(parsed.items)) citoCache = parsed.items;
    else citoCache = [];
  } catch (e) {
    citoCache = [];
  }
}

loadCitoData();

// ===== search =====
const searchCito = ({ query, filters }) => {
  if (filters && filters.cito === false) return [];

  let results = citoCache;

  // 1) Zoekterm
  if (query && query.trim() !== "") {
    let cleanQuery = query;
    let excludedTerms = [];

    if (query.includes(" NOT ")) {
      const parts = query.split(" NOT ");
      cleanQuery = parts[0].trim().toLowerCase();
      excludedTerms = parts.slice(1).map((t) => t.trim().toLowerCase());
    } else {
      cleanQuery = query.toLowerCase();
    }

    results = results.filter((item) => {
      const content = safeLower(item.title) + " " + safeLower(item.content);
      if (cleanQuery && !content.includes(cleanQuery)) return false;
      if (excludedTerms.some((term) => content.includes(term))) return false;
      return true;
    });
  }

  // 2) TIJDVAK FILTER
  if (filters && filters.tv) {
    const zoekTv = normTvToString(filters.tv);
    if (zoekTv) {
      results = results.filter((item) => item.rawTv && asString(item.rawTv).includes(zoekTv));
    }
  }

  // 3) KA FILTER
  if (filters && filters.ka) {
    const targetNumbers = normKaToNumbers(filters.ka);
    if (targetNumbers.length > 0) {
      results = results.filter((item) => {
        if (!item.rawKa) return false;
        return targetNumbers.some((num) => {
          const regex = new RegExp(`KA[^0-9]*${num}(?!\\d)`, "i");
          return regex.test(asString(item.rawKa));
        });
      });
    }
  }

  // 4) Type Filter
  if (filters) {
    if (filters.images === false) results = results.filter((i) => i.type !== "IMAGE");
    if (filters.text === false) results = results.filter((i) => i.type !== "TEXT");
  }

  return results;
};

module.exports = { searchCito };


"use strict";

const axios = require("axios");
const cheerio = require("cheerio");

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

const yrRe = /(?:1[0-9]{3}|20[0-2][0-9])/g;

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

function extractYears(text) {
  const hits = squashWs(text).match(yrRe) || [];
  return hits.map(Number).filter((y) => Number.isInteger(y) && y >= 800 && y <= 2000);
}

function tvRange(tvNum) {
  return {
    5: [1500, 1600],
    6: [1600, 1700],
    7: [1700, 1800],
    8: [1800, 1900],
    9: [1900, 1950],
    10: [1950, 2000],
  }[tvNum] || null;
}

function medianYear(years) {
  if (!Array.isArray(years) || years.length === 0) return null;
  const sorted = [...years].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// return:
// - true  => in range (label tv)
// - false => out of range (drop)
// - null  => no years (keep, but no label)
function tvDecisionByMedian(years, range) {
  if (!range) return true;
  const mid = medianYear(years);
  if (!Number.isFinite(mid)) return null;
  const [a, b] = range;
  return mid >= a && mid <= b;
}

// Pak 6 trefwoorden die vaak samen met `term` voorkomen in ka-trefwoorden.cjs
function expandFromKaTrefwoorden(term, n = 6) {
  const t = normKey(term);
  if (!t) return [];
  if (/^ka\d+$/i.test(t)) return []; // KA33 als term niet expanden zo

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

const fetchDetail = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 12000,
    });

    const $ = cheerio.load(data);
    let text =
      $(".elementor-widget-theme-post-content").text().trim() ||
      $(".entry-content").text().trim();

    if (!text || text.length < 50) {
      $("header, footer, nav").remove();
      text = $("body").text().trim();
    }

    const img =
      $(".elementor-widget-theme-post-content img").attr("src") ||
      $(".entry-content img").attr("src") ||
      null;

    return { text: squashWs(text).substring(0, 900), image: img };
  } catch {
    return { text: null, image: null };
  }
};

async function searchSingleTerm(term) {
  const t = squashWs(term);
  if (!t) return [];

  const url = `https://www.vgnkleio.nl/?s=${encodeURIComponent(t)}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 12000,
    });

    const $ = cheerio.load(data);
    const items = [];

    $("article").each((_, el) => {
      if (items.length >= 12) return;
      const $el = $(el);
      const title = $el.find("h2 a, h3 a, .entry-title a").first().text().trim();
      const link = $el.find("h2 a, h3 a, .entry-title a").first().attr("href");
      const thumb = $el.find("img").first().attr("src");
      if (title && link) items.push({ title, link, thumb });
    });

    return items;
  } catch {
    return [];
  }
}

async function runTermsCollect(terms, merged, seen) {
  for (const t of terms) {
    const hits = await searchSingleTerm(t);
    for (const h of hits) {
      if (h && h.link && !seen.has(h.link)) {
        seen.add(h.link);
        merged.push(h);
      }
    }
  }
}

const searchKleio = async ({ query, filters }) => {
  if (filters?.kleio === false) return [];

  let seedTerms = [];

  const queryArr = Array.isArray(query) ? query.map(squashWs).filter(Boolean) : [];

  // A) echte query: breid uit met 6 KA-trefwoorden (alleen als query 1 term is en er geen filters.ka is)
  if (queryArr.length === 1 && !filters?.ka) {
    const base = queryArr[0];
    const extra6 = expandFromKaTrefwoorden(base, 6);
    seedTerms = uniqueKeepOrder([base, ...extra6]);
  } else if (queryArr.length > 0) {
    seedTerms = uniqueKeepOrder(queryArr);
  }

  // B) geen query, wel filters.ka -> KA_MAPPING fallback
  if (seedTerms.length === 0 && filters?.ka) {
    const key = String(filters.ka).toLowerCase().startsWith("ka")
      ? String(filters.ka).toLowerCase()
      : "ka" + String(filters.ka).trim();

    if (KA_MAPPING[key]) seedTerms = uniqueKeepOrder(KA_MAPPING[key]);
  }

  seedTerms = uniqueKeepOrder(seedTerms);
  if (!seedTerms.length) return [];

  const merged = [];
  const seen = new Set();
  await runTermsCollect(seedTerms.slice(0, 10), merged, seen);

  const tvNum = filters?.tv ? Number(String(filters.tv).replace(/\D/g, "")) : null;
  const range = tvNum ? tvRange(tvNum) : null;

  const enriched = [];
  for (const item of merged) {
    const d = await fetchDetail(item.link);
    const years = extractYears([item.title, d.text].join(" "));

    let keep = true;
    let labelTv = false;

    if (range) {
      const decision = tvDecisionByMedian(years, range);
      if (decision === false) keep = false;   // out -> drop
      if (decision === true) labelTv = true;  // in -> label
      // null => keep, no label
    }

    if (!keep) continue;

    enriched.push({
      id: `kleio-${item.link}`,
      provider: "Kleio",
      title: item.title,
      description: d.text || "...",
      fullText: d.text,
      url: item.link,
      imageUrl: d.image,
      type: d.image ? "IMAGE" : "TEXT",
      tv: labelTv && tvNum ? String(tvNum) : undefined,
      tvLabel: labelTv && tvNum ? `Tijdvak ${tvNum}` : undefined,
    });
  }

  return enriched;
};

module.exports = { searchKleio };


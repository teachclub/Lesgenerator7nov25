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

const http = axios.create({
  headers: { "User-Agent": "Mozilla/5.0 (Lessie2000 Kleio bot)" },
  timeout: 12000,
  maxContentLength: 3_000_000,
  maxBodyLength: 3_000_000,
});

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_KEYS = 80;
const cache = new Map(); // key -> { ts, data }

function now() {
  return Date.now();
}

function cacheGet(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (now() - v.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return v.data;
}

function cacheSet(key, data) {
  if (cache.size >= CACHE_MAX_KEYS) {
    // simpele FIFO: delete oudste
    let oldestK = null;
    let oldestTs = Infinity;
    for (const [k, v] of cache.entries()) {
      if (v.ts < oldestTs) {
        oldestTs = v.ts;
        oldestK = k;
      }
    }
    if (oldestK) cache.delete(oldestK);
  }
  cache.set(key, { ts: now(), data });
}

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
  const sorted = [...years].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function tvDecisionByMedian(years, range) {
  if (!range) return true;
  const mid = medianYear(years);
  if (!Number.isFinite(mid)) return null; // noYear: niet wegfilteren
  const [a, b] = range;
  return mid >= a && mid <= b;
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

function getTextFrom($, sel) {
  try {
    const t = $(sel).text();
    return squashWs(t);
  } catch {
    return "";
  }
}

function cleanupPageForBodyText($) {
  $("script, style, noscript").remove();
  $("header, footer, nav").remove();
  $(".site-header, .site-footer, .menu, .navigation").remove();
}

function bestContentText($) {
  const parts = [];

  const primary =
    getTextFrom($, ".elementor-widget-theme-post-content") ||
    getTextFrom($, ".entry-content") ||
    getTextFrom($, "article") ||
    getTextFrom($, "main");

  if (primary) parts.push(primary);

  const maybe = [
    "h1",
    ".entry-title",
    ".post-title",
    ".wp-block-heading",
    ".wp-block-group",
    ".wp-block-columns",
    ".wp-block-column",
  ];
  for (const s of maybe) {
    const t = getTextFrom($, s);
    if (t && t.length >= 40) parts.push(t);
  }

  if (parts.join(" ").length < 200) {
    cleanupPageForBodyText($);
    const body = getTextFrom($, "body");
    if (body) parts.push(body);
  }

  return squashWs(parts.join("\n\n"));
}

async function fetchDetail(url) {
  try {
    const { data } = await http.get(url);
    const $ = cheerio.load(data);

    const text = bestContentText($);

    const img =
      $(".elementor-widget-theme-post-content img").attr("src") ||
      $(".entry-content img").attr("src") ||
      $("article img").first().attr("src") ||
      null;

    const clipped = text ? text.substring(0, 4500) : null;
    return { text: clipped, image: img };
  } catch {
    return { text: null, image: null };
  }
}

async function searchSingleTerm(term) {
  const t = squashWs(term);
  if (!t) return [];

  const url = `https://www.vgnkleio.nl/?s=${encodeURIComponent(t)}`;
  try {
    const { data } = await http.get(url);
    const $ = cheerio.load(data);
    const items = [];

    $("article").each((_, el) => {
      if (items.length >= 12) return;
      const $el = $(el);
      const a = $el.find("h2 a, h3 a, .entry-title a").first();
      const title = a.text().trim();
      const link = a.attr("href");
      const thumb = $el.find("img").first().attr("src");
      if (title && link) items.push({ title, link, thumb });
    });

    return items;
  } catch {
    return [];
  }
}

async function mapLimit(arr, limit, fn) {
  const a = Array.isArray(arr) ? arr : [];
  const out = new Array(a.length);
  let i = 0;

  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= a.length) return;
      out[idx] = await fn(a[idx], idx);
    }
  }

  const n = Math.max(1, Math.min(limit || 1, a.length));
  const workers = [];
  for (let k = 0; k < n; k++) workers.push(worker());
  await Promise.all(workers);
  return out;
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

function normalizeKaKey(ka) {
  const s = String(ka || "").trim().toLowerCase();
  if (!s) return "";
  if (s.startsWith("ka")) return s;
  return "ka" + s.replace(/\D/g, "");
}

const searchKleio = async ({ query, filters }) => {
  if (filters?.kleio === false) return [];

  const tvNum = filters?.tv ? Number(String(filters.tv).replace(/\D/g, "")) : null;
  const range = tvNum ? tvRange(tvNum) : null;
  const kaKey = filters?.ka ? normalizeKaKey(filters.ka) : "";

  // cache key: vooral op KA/TV en seedTerms
  const queryArr = Array.isArray(query) ? query.map(squashWs).filter(Boolean) : [];
  let seedTerms = [];

  if (queryArr.length === 1 && !filters?.ka) {
    const base = queryArr[0];
    const extra6 = expandFromKaTrefwoorden(base, 6);
    seedTerms = uniqueKeepOrder([base, ...extra6]);
  } else if (queryArr.length > 0) {
    seedTerms = uniqueKeepOrder(queryArr);
  }

  if (seedTerms.length === 0 && filters?.ka) {
    if (KA_MAPPING[kaKey]) seedTerms = uniqueKeepOrder(KA_MAPPING[kaKey]);

    // extra “grabbelton” vanuit KA_TREF als KA_MAPPING te smal is
    if (seedTerms.length < 6 && KA_TREF && KA_TREF[kaKey] && Array.isArray(KA_TREF[kaKey])) {
      const pool = uniqueKeepOrder(KA_TREF[kaKey]).filter((x) => !/^ka\d+$/i.test(normKey(x)));
      // neem max 10 trefwoorden uit de KA-tabel erbij
      seedTerms = uniqueKeepOrder([...seedTerms, ...pool.slice(0, 10)]);
    }
  }

  seedTerms = uniqueKeepOrder(seedTerms).slice(0, 12);
  if (!seedTerms.length) return [];

  const cacheKey = JSON.stringify({
    kaKey: kaKey || null,
    tv: tvNum || null,
    terms: seedTerms,
  });

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const merged = [];
  const seen = new Set();
  await runTermsCollect(seedTerms.slice(0, 10), merged, seen);

  if (!merged.length) {
    cacheSet(cacheKey, []);
    return [];
  }

  // voorkom dat KA45 de boel doodt: cap detail-fetches
  const MAX_DETAILS = 28;
  const items = merged.slice(0, MAX_DETAILS);

  const enriched = [];
  const details = await mapLimit(items, 4, async (item) => {
    const d = await fetchDetail(item.link);
    return { item, d };
  });

  for (const { item, d } of details) {
    const years = extractYears([item.title, d?.text].join(" "));
    let keep = true;
    let labelTv = false;

    if (range) {
      const decision = tvDecisionByMedian(years, range);
      if (decision === false) keep = false;
      if (decision === true) labelTv = true;
    }
    if (!keep) continue;

    const text = (d && d.text) || "...";

    enriched.push({
      id: `kleio-${item.link}`,
      provider: "Kleio",
      title: item.title,
      description: text ? squashWs(text).substring(0, 900) : "...",
      fullText: text,
      url: item.link,
      imageUrl: d ? d.image : null,
      type: "TEXT",
      tv: labelTv && tvNum ? String(tvNum) : undefined,
      tvLabel: labelTv && tvNum ? `Tijdvak ${tvNum}` : undefined,
    });
  }

  cacheSet(cacheKey, enriched);
  return enriched;
};

module.exports = { searchKleio };


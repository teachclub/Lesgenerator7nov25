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
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
  timeout: 12000,
  maxContentLength: 3_000_000,
  maxBodyLength: 3_000_000,
  validateStatus: (s) => s >= 200 && s < 500,
});

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_KEYS = 80;
const cache = new Map();

const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
let feedCache = { ts: 0, items: [] };

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

/*
  ✅ TV-filter “strict”:
  - range bestaat
  - geen jaartallen => wegfilteren (anders sluipt oud spul door bij tv=9/10)
*/
function tvDecisionByMedian(years, range) {
  if (!range) return true;
  const mid = medianYear(years);
  if (!Number.isFinite(mid)) return false;
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

function isBronnenUrl(url) {
  const u = String(url || "");
  return u.includes("vgnkleio.nl/") && u.includes("/bronnen/");
}

function isHttpUrl(url) {
  const u = String(url || "");
  return /^https?:\/\//i.test(u);
}

function isBadImage(url) {
  const u = String(url || "").trim();
  if (!u) return true;
  const low = u.toLowerCase();

  if (low.startsWith("data:")) return true;
  if (low.includes("data:image/svg+xml")) return true;
  if (low.includes("placeholder")) return true;
  if (low.includes("logo")) return true;
  if (low.includes("icon")) return true;

  return false;
}

function toImageProxy(url) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (!isHttpUrl(u)) return null;
  if (isBadImage(u)) return null;
  return `/api/image-proxy?url=${encodeURIComponent(u)}`;
}

function firstFromSrcset(srcset) {
  const s = String(srcset || "").trim();
  if (!s) return null;
  // "url1 300w, url2 768w" -> pak eerste url
  const first = s.split(",")[0];
  const url = first ? first.trim().split(/\s+/)[0] : "";
  return url || null;
}

function pickImgFromArticleCard($, $el) {
  try {
    const img = $el.find("img").first();
    if (!img || !img.length) return null;

    const dataSrc = img.attr("data-src") || img.attr("data-lazy-src");
    const src = img.attr("src");
    const srcset = img.attr("srcset");
    const s1 = dataSrc || src || firstFromSrcset(srcset);

    return s1 ? String(s1).trim() : null;
  } catch {
    return null;
  }
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

  const maybe = ["h1", ".entry-title", ".post-title"];
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

function pickBestDetailImage($) {
  // 1) og:image
  const og = $('meta[property="og:image"]').attr("content");
  if (og && String(og).trim()) return String(og).trim();

  // 2) elementor / entry-content
  const a =
    $(".elementor-widget-theme-post-content img").attr("data-src") ||
    $(".elementor-widget-theme-post-content img").attr("src") ||
    $(".entry-content img").attr("data-src") ||
    $(".entry-content img").attr("src");
  if (a && String(a).trim()) return String(a).trim();

  // 3) first article img
  const b =
    $("article img").first().attr("data-src") ||
    $("article img").first().attr("src") ||
    firstFromSrcset($("article img").first().attr("srcset"));
  if (b && String(b).trim()) return String(b).trim();

  return null;
}

async function fetchDetail(url) {
  try {
    if (!isBronnenUrl(url)) return { text: null, image: null };

    const { data, status } = await http.get(url);
    if (status >= 400 || !data) return { text: null, image: null };

    const $ = cheerio.load(data);

    const text = bestContentText($);
    const img = pickBestDetailImage($);

    const clipped = text ? text.substring(0, 4500) : null;
    return { text: clipped, image: img || null };
  } catch {
    return { text: null, image: null };
  }
}

/*
  Fallback: WP-search kan soms (tijdelijk) raar doen.
  Dan gebruiken we de RSS-feed als “index” en filteren lokaal op term.
*/
async function fetchFeedItems() {
  const t = now();
  if (feedCache.items.length && t - feedCache.ts < FEED_CACHE_TTL_MS) return feedCache.items;

  const feedUrl = "https://www.vgnkleio.nl/feed/";
  try {
    const { data, status } = await http.get(feedUrl);
    if (status >= 400 || !data) {
      feedCache = { ts: t, items: [] };
      return [];
    }

    const $ = cheerio.load(data, { xmlMode: true });
    const items = [];

    $("item").each((_, el) => {
      const $el = $(el);
      const title = squashWs($el.find("title").first().text());
      const link = squashWs($el.find("link").first().text());
      const desc = squashWs($el.find("description").first().text());
      const contentEncoded = squashWs($el.find("content\\:encoded").first().text());

      let img = null;
      const m = (contentEncoded || desc || "").match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m && m[1]) img = m[1];

      if (title && link && isBronnenUrl(link)) {
        items.push({
          title,
          link,
          thumb: img,
          snippet: squashWs((desc || "").replace(/<[^>]+>/g, " ")).substring(0, 900),
        });
      }
    });

    feedCache = { ts: t, items };
    return items;
  } catch {
    feedCache = { ts: t, items: [] };
    return [];
  }
}

function includesLoose(hay, needle) {
  const h = normKey(hay);
  const n = normKey(needle);
  if (!h || !n) return false;
  return h.includes(n);
}

async function searchViaFeed(term) {
  const t = squashWs(term);
  if (!t) return [];
  const items = await fetchFeedItems();
  if (!items.length) return [];

  const out = [];
  for (const it of items) {
    const hay = [it.title, it.snippet].filter(Boolean).join(" ");
    if (includesLoose(hay, t)) out.push({ title: it.title, link: it.link, thumb: it.thumb });
    if (out.length >= 12) break;
  }
  return out;
}

async function searchSingleTerm(term) {
  const t = squashWs(term);
  if (!t) return [];

  const url = `https://www.vgnkleio.nl/?s=${encodeURIComponent(t)}`;
  try {
    const { data, status } = await http.get(url);

    if (status === 403 || status === 429 || !data) {
      return await searchViaFeed(t);
    }

    const $ = cheerio.load(data);
    const items = [];

    $("article").each((_, el) => {
      if (items.length >= 12) return;
      const $el = $(el);
      const a = $el.find("h2 a, h3 a, .entry-title a").first();
      const title = (a.text() || "").trim();
      const link = a.attr("href");

      if (!title || !link) return;
      if (!isBronnenUrl(link)) return;

      const thumb = pickImgFromArticleCard($, $el);
      items.push({ title, link, thumb });
    });

    if (!items.length) {
      const viaFeed = await searchViaFeed(t);
      if (viaFeed.length) return viaFeed;
    }

    return items;
  } catch {
    return await searchViaFeed(t);
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
      if (!h || !h.link) continue;
      if (!isBronnenUrl(h.link)) continue;
      if (seen.has(h.link)) continue;
      seen.add(h.link);
      merged.push(h);
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

  const queryArr = Array.isArray(query) ? query.map(squashWs).filter(Boolean) : [];
  let seedTerms = [];

  if (queryArr.length === 1) {
    const base = queryArr[0];
    const extra = expandFromKaTrefwoorden(base, 6);
    seedTerms = uniqueKeepOrder([base, ...extra]);
  } else if (queryArr.length > 0) {
    seedTerms = uniqueKeepOrder(queryArr);
  }

  if (filters?.ka) {
    const kaTerms = [];
    if (KA_MAPPING[kaKey]) kaTerms.push(...KA_MAPPING[kaKey]);
    if (KA_TREF && KA_TREF[kaKey] && Array.isArray(KA_TREF[kaKey])) kaTerms.push(...KA_TREF[kaKey]);
    const cleaned = uniqueKeepOrder(kaTerms).filter((x) => !/^ka\d+$/i.test(normKey(x)));
    seedTerms = uniqueKeepOrder([...seedTerms, ...cleaned.slice(0, 6)]);
  }

  seedTerms = uniqueKeepOrder(seedTerms)
    .map((x) => squashWs(x))
    .filter((t) => t.length >= 4)
    .slice(0, 10);

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
  await runTermsCollect(seedTerms, merged, seen);

  if (!merged.length) {
    cacheSet(cacheKey, []);
    return [];
  }

  const MAX_DETAILS = 28;
  const items = merged.slice(0, MAX_DETAILS);

  const details = await mapLimit(items, 4, async (item) => {
    const d = await fetchDetail(item.link);
    return { item, d };
  });

  const enriched = [];
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

    const rawImg = (d && d.image) || item.thumb || null;
    const proxiedImg = rawImg ? toImageProxy(rawImg) : null;

    enriched.push({
      id: `kleio-${encodeURIComponent(item.link)}`,
      provider: "Kleio",
      title: item.title,
      description: text ? squashWs(text).substring(0, 900) : "...",
      fullText: text,
      url: item.link,
      link: item.link,
      imageUrl: proxiedImg,
      type: "TEXT",
      tv: labelTv && tvNum ? String(tvNum) : undefined,
      tvLabel: labelTv && tvNum ? `Tijdvak ${tvNum}` : undefined,
    });
  }

  cacheSet(cacheKey, enriched);
  return enriched;
};

module.exports = { searchKleio };


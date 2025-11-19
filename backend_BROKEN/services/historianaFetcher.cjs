const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");

const SITEMAP_URL = "https://historiana.eu/api/sitemap";
const UA = "Kleio-Historiana-Fetcher/1.0";
const TTL_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 20;
const MAX_URLS = 500;

let index = [];
let lastIndexAt = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function scoreItem(terms, item) {
  const txt = item.text;
  let s = 0;
  for (const t of terms) {
    const re = new RegExp(`\\b${escRe(t)}\\b`, "gi");
    const m = txt.match(re);
    if (m) s += m.length * (txt.includes(t) ? 2 : 1);
  }
  if (terms.some((t) => item.title.toLowerCase().includes(t))) s += 3;
  return s;
}

async function fetchSitemapUrls() {
  const resp = await axios.get(SITEMAP_URL, { headers: { "User-Agent": UA } });
  const parser = new XMLParser();
  const xml = parser.parse(resp.data);
  const urls =
    (xml?.urlset?.url || []).map((u) => u.loc) ||
    (xml?.sitemapindex?.sitemap || []).map((s) => s.loc) ||
    [];
  const filtered = urls.filter((u) =>
    /\/(historical|teaching|builder|collection|e-activity|historiana)\//i.test(u)
  );
  return filtered.slice(0, MAX_URLS);
}

function extractFromHtml(url, html) {
  const $ = cheerio.load(html);
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const title = (ogTitle || $("title").text() || url).trim();
  let snippet =
    (ogDesc ||
      $('meta[name="description"]').attr("content") ||
      $("main p").first().text() ||
      $("p").first().text() ||
      "").replace(/\s+/g, " ").trim();
  const item = { url, title, snippet, source: "historiana" };
  item.text = `${item.title} ${item.snippet}`.toLowerCase();
  return item;
}

async function buildIndex() {
  const urls = await fetchSitemapUrls();
  const out = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    try {
      const resp = await axios.get(u, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        timeout: 15000,
      });
      out.push(extractFromHtml(u, resp.data));
      if (i % 5 === 0) await sleep(400);
    } catch {
      out.push({ url: u, title: u, snippet: "", source: "historiana", text: u.toLowerCase() });
    }
    if (i % 25 === 0) await sleep(300);
  }
  index = out;
  lastIndexAt = Date.now();
  return { count: index.length, lastIndexAt };
}

async function ensureIndexFresh() {
  if (!index.length || Date.now() - lastIndexAt > TTL_MS) await buildIndex();
}

async function searchHistoriana(q, page = 1) {
  await ensureIndexFresh();
  const terms = String(q || "").toLowerCase().split(/\s+/).map((s) => s.trim()).filter(Boolean);
  if (!terms.length) return { total: 0, items: [] };
  const scored = index
    .map((it) => ({ ...it, _score: scoreItem(terms, it) }))
    .filter((it) => it._score > 0)
    .sort((a, b) => b._score - a._score);
  const total = scored.length;
  const start = (Math.max(1, page) - 1) * PAGE_SIZE;
  const items = scored.slice(start, start + PAGE_SIZE).map((it) => ({
    title: it.title,
    url: it.url,
    source: it.source,
    snippet: it.snippet,
    _score: it._score,
  }));
  return { total, items };
}

function getIndexStats() { return { count: index.length, lastIndexAt }; }

module.exports = { buildIndex, searchHistoriana, getIndexStats, ensureIndexFresh };


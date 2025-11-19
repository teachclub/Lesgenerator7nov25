// backend/services/kleioFetcher.cjs
// VERSION_MARK: v1.1-debug-root-search
const cheerio = require("cheerio");

const ORIGIN = "https://www.vgnkleio.nl/bronnen";
const SITE = "https://www.vgnkleio.nl";
const MAX_LEN = 280;

function cleanText(t = "") {
  return t.replace(/\s+/g, " ").trim();
}

function truncate(s, n = MAX_LEN) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function normalizeUrl(u = "") {
  try {
    const url = new URL(u, SITE);
    return url.toString();
  } catch {
    return "";
  }
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "KleioFetcher/1.0 (+educatie; non-commercial; contact docent)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function parseListing(html) {
  const $ = cheerio.load(html);
  const items = [];

  $("article").each((_, el) => {
    const a = $(el).find("h2.entry-title a, h3 a, a").first();
    const href = normalizeUrl(a.attr("href") || "");
    if (!href.includes("/bronnen/")) return;
    const title = cleanText(a.text() || $(el).find("h2,h3").first().text());
    const snippet =
      cleanText($(el).find(".entry-summary, .excerpt, p").first().text()) || "";
    items.push({ title, url: href, snippet });
  });

  if (items.length === 0) {
    $('a[href*="/bronnen/"]').each((_, a) => {
      const href = normalizeUrl($(a).attr("href") || "");
      if (!href.includes("/bronnen/")) return;
      const title = cleanText($(a).text());
      if (!title) return;
      items.push({ title, url: href, snippet: "" });
    });
  }

  return items;
}

function enrichFromDetail(html) {
  const $ = cheerio.load(html);
  const firstP =
    cleanText($("article p").first().text()) ||
    cleanText($("main p").first().text()) ||
    cleanText($("p").first().text());
  return truncate(firstP, MAX_LEN);
}

async function kleioSearch(q, opts = {}) {
  const limit = Math.max(1, Math.min(50, parseInt(opts.limit || 10, 10)));
  // BELANGRIJK: zoek op de SITE-root, niet onder /bronnen/
  const searchUrl = `${SITE}/?s=${encodeURIComponent(q)}`;
  console.log("[kleioFetcher] VERSION_MARK v1.1-debug-root-search");
  console.log("[kleioFetcher] searchUrl =", searchUrl);

  const html = await fetchHtml(searchUrl);
  let items = parseListing(html)
    .filter((it) => it.url.startsWith(SITE) && it.url.includes("/bronnen/"))
    .map((it) => ({
      title: truncate(cleanText(it.title), 140),
      url: normalizeUrl(it.url),
      snippet: truncate(cleanText(it.snippet || ""), MAX_LEN),
      date: null,
      source: "kleio",
      origin: ORIGIN,
      license: "© VGN Kleio – educatief gebruik",
      sensitive: false,
      confidence: 0.8,
    }));

  const seen = new Set();
  items = items.filter((it) => {
    if (seen.has(it.url)) return false;
    seen.add(it.url);
    return true;
  });

  const toEnrich = Math.min(items.length, Math.min(3, limit));
  for (let i = 0; i < toEnrich; i++) {
    try {
      const detailHtml = await fetchHtml(items[i].url);
      const sn = enrichFromDetail(detailHtml);
      if (sn) items[i].snippet = sn;
    } catch {
      /* ignore */
    }
  }

  return items.slice(0, limit);
}

module.exports = { kleioSearch };


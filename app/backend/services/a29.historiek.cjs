"use strict";

const axios = require("axios");
const cheerio = require("cheerio");

function squashWs(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}
function normStr(x) {
  return typeof x === "string" ? x.trim() : "";
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
function absUrl(base, maybe) {
  const u = normStr(maybe);
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  try {
    return new URL(u, base).toString();
  } catch {
    return u;
  }
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

function isCfChallenge(res) {
  const ct = (res?.headers?.["content-type"] || "").toLowerCase();
  const server = (res?.headers?.["server"] || "").toLowerCase();
  const mitigated = (res?.headers?.["cf-mitigated"] || "").toLowerCase();
  const body = typeof res?.data === "string" ? res.data : "";
  return (
    mitigated.includes("challenge") ||
    server.includes("cloudflare") ||
    (ct.includes("text/html") && body.includes("Just a moment"))
  );
}

async function fetchSearchHtml(term) {
  const t = squashWs(term);
  if (!t) return { ok: false, status: 0, items: [], reason: "empty-term" };

  const url = `https://historiek.net/?s=${encodeURIComponent(t)}`;

  const res = await axios.get(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "nl,en;q=0.7",
    },
    timeout: 12000,
    validateStatus: () => true,
  });

  if (process.env.DEBUG_HISTORIEK === "1") {
    const ct = res.headers?.["content-type"] || "";
    const preview = typeof res.data === "string" ? res.data.slice(0, 140) : "";
    console.log("[Historiek] search HTML status", res.status, "ct", ct, "preview", preview);
  }

  if (res.status !== 200 || isCfChallenge(res)) {
    return { ok: false, status: res.status, items: [], reason: "blocked" };
  }

  const $ = cheerio.load(res.data);
  const items = [];

  $("article").each((_, el) => {
    if (items.length >= 10) return;
    const $el = $(el);
    const a = $el.find("h2 a, h3 a, .entry-title a").first();
    const title = squashWs(a.text());
    const link = a.attr("href") || "";
    if (title && link) items.push({ title, link: absUrl(url, link) });
  });

  return { ok: true, status: 200, items, reason: "ok" };
}

function buildLinkOnlyFallback(term) {
  const t = squashWs(term);
  const url = `https://historiek.net/?s=${encodeURIComponent(t || "")}`;
  return [
    {
      id: `historiek-search-${encodeURIComponent(t || "zoek")}`,
      provider: "Historiek",
      title: t ? `Zoek op Historiek: ${t}` : "Zoek op Historiek",
      description:
        "Historiek blokkeert momenteel server-side ophalen. Open de zoekresultaten in je browser.",
      fullText: "",
      url,
      imageUrl: null,
      type: "TEXT",
    },
  ];
}

/**
 * Historiek strategy (bewust “licht”):
 * - Geen wp-json (blocked)
 * - Geen detailpagina fetches (meer requests = sneller blokkade)
 * - Alleen zoekresultaten (titels + links) OF link-only fallback
 */
const searchHistoriek = async ({ query, filters }) => {
  if (filters?.historiek === false) return [];

  const queryArr = Array.isArray(query) ? query.map(squashWs).filter(Boolean) : [];
  const terms = uniqueKeepOrder(queryArr).slice(0, 3);
  if (!terms.length) return [];

  const merged = [];
  const seen = new Set();

  for (const term of terms) {
    const r = await fetchSearchHtml(term);
    if (r.ok) {
      for (const it of r.items) {
        if (!it?.link || seen.has(it.link)) continue;
        seen.add(it.link);
        merged.push({
          id: `historiek-${it.link}`,
          provider: "Historiek",
          title: it.title,
          description: "Open het originele artikel op Historiek.",
          fullText: "",
          url: it.link,
          imageUrl: null,
          type: "TEXT",
        });
      }
    } else {
      // bij blokkade: géén lege lijst (dat voelt kapot), maar één nette tegel met link
      return buildLinkOnlyFallback(term);
    }
  }

  return merged;
};

module.exports = { searchHistoriek };


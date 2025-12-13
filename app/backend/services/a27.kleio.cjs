"use strict";

/**
 * a27.kleio.cjs — v4.1
 * - PresetZoeker query[] blijft baas (KA_MAPPING alleen fallback)
 * - Fix: Elementor title selector (elementor-post__title)
 * - Fix: timeouts + logging (zodat Cloud Run issues zichtbaar worden)
 */

const axios = require("axios");
const cheerio = require("cheerio");
const { KA_MAPPING } = require("./a22.ka-mapping.cjs");

const AXIOS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
  Referer: "https://www.vgnkleio.nl/",
};

const isValidImage = (src) => {
  if (!src) return false;
  const s = src.toLowerCase();
  if (s.includes("logo") || s.includes("icon") || s.includes("placeholder")) return false;
  return true;
};

function logAxios(prefix, err) {
  const status = err?.response?.status;
  const url = err?.config?.url;
  const msg = err?.message || "unknown";
  const sample =
    typeof err?.response?.data === "string"
      ? err.response.data.replace(/\s+/g, " ").slice(0, 180)
      : "";
  console.error(`${prefix} status=${status || "-"} url=${url || "-"} msg=${msg} sample=${sample}`);
}

const fetchDetail = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: AXIOS_HEADERS,
      timeout: 12000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const $ = cheerio.load(data);

    let text =
      $(".elementor-widget-theme-post-content").text().trim() ||
      $(".entry-content").text().trim();

    if (!text || text.length < 50) {
      $("header, footer, nav").remove();
      text = $("body").text().trim();
    }

    let img =
      $(".elementor-widget-theme-post-content img").attr("src") ||
      $(".entry-content img").attr("src");

    if (!isValidImage(img)) img = null;

    return {
      text: text.replace(/\s+/g, " ").substring(0, 600),
      image: img,
    };
  } catch (e) {
    logAxios("[Kleio] detail", e);
    return { text: null, image: null };
  }
};

const searchSingleTerm = async (term) => {
  if (!term || !String(term).trim()) return [];
  const t = String(term).trim();

  console.log(`[Kleio] TERM "${t}"`);

  const url = `https://www.vgnkleio.nl/?s=${encodeURIComponent(t)}`;

  try {
    const { data } = await axios.get(url, {
      headers: AXIOS_HEADERS,
      timeout: 12000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const $ = cheerio.load(data);
    const items = [];

    $("article").each((i, el) => {
      if (items.length >= 8) return;

      const $el = $(el);

      const title =
        $el.find(".elementor-post__title a").first().text().trim() ||
        $el.find("h3 a").first().text().trim() ||
        $el.find("h2 a").first().text().trim() ||
        $el.find(".entry-title a").first().text().trim();

      const link =
        $el.find(".elementor-post__title a").first().attr("href") ||
        $el.find("h3 a").first().attr("href") ||
        $el.find("h2 a").first().attr("href") ||
        $el.find(".entry-title a").first().attr("href") ||
        $el.find("a").first().attr("href");

      const thumb =
        $el.find("img").first().attr("src") || null;

      if (title && link) items.push({ title, link, thumb });
    });

    console.log(`[Kleio] TERM "${t}" hits=${items.length}`);
    return items;
  } catch (e) {
    logAxios("[Kleio] search", e);
    return [];
  }
};

const searchKleio = async ({ query, filters = {} }) => {
  if (filters.kleio === false) return [];

  let terms = [];

  if (Array.isArray(query) && query.length > 0) {
    terms = query.map((x) => String(x).trim()).filter(Boolean);
  }

  if (terms.length === 0 && filters.ka) {
    const key = String(filters.ka).toLowerCase().startsWith("ka")
      ? String(filters.ka).toLowerCase()
      : "ka" + String(filters.ka).trim();

    if (KA_MAPPING[key]) {
      terms = [...KA_MAPPING[key]];
      console.log(`[Kleio] Gebruik KA_MAPPING fallback voor ${key}`);
    }
  }

  if (terms.length === 0) return [];

  console.log(`[Kleio] Multiquery terms=${terms.length}`);

  const perTerm = await Promise.all(terms.map(searchSingleTerm));

  const merged = [];
  const seen = new Set();

  perTerm.flat().forEach((item) => {
    if (item?.link && !seen.has(item.link)) {
      seen.add(item.link);
      merged.push(item);
    }
  });

  console.log(`[Kleio] unieke hits=${merged.length} verrijken…`);

  const enriched = await Promise.all(
    merged.map(async (item, i) => {
      const d = await fetchDetail(item.link);
      return {
        id: `kleio-${i}`,
        provider: "Kleio",
        title: item.title,
        description: d.text || "...",
        fullText: d.text,
        url: item.link,
        imageUrl: d.image || (isValidImage(item.thumb) ? item.thumb : null),
        type: d.image ? "IMAGE" : "TEXT",
      };
    })
  );

  return enriched.filter((it) => {
    if (filters.images === false && it.type === "IMAGE") return false;
    if (filters.text === false && it.type === "TEXT") return false;
    return true;
  });
};

module.exports = { searchKleio };


"use strict";

const axios = require("axios");
const cheerio = require("cheerio");

let KA_MAPPING = {};
try {
  const m = require("./a22.ka-mapping.cjs");
  KA_MAPPING = m && m.KA_MAPPING ? m.KA_MAPPING : {};
} catch (e) {
  console.error("[Kleio] KA_MAPPING kon niet laden:", e && (e.stack || e.message || e));
  KA_MAPPING = {};
}

const isValidImage = (src) => {
  if (!src) return false;
  const s = src.toLowerCase();
  if (s.includes("logo") || s.includes("icon") || s.includes("placeholder")) return false;
  return true;
};

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

    let img =
      $(".elementor-widget-theme-post-content img").attr("src") ||
      $(".entry-content img").attr("src");

    if (!isValidImage(img)) img = null;

    return { text: text.replace(/\s+/g, " ").substring(0, 600), image: img };
  } catch (e) {
    console.error("[Kleio] detail error:", e && (e.message || e));
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
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 12000,
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

      const thumb = $el.find("img").first().attr("src");

      if (title && link) items.push({ title, link, thumb });
    });

    console.log(`[Kleio] TERM "${t}" hits=${items.length}`);
    return items;
  } catch (e) {
    console.error("[Kleio] search error:", e && (e.message || e));
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

  return enriched;
};

module.exports = { searchKleio };


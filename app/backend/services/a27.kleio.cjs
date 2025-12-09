"use strict";

/**
 * a27.kleio.cjs — v4 (8 dec 2025)
 *
 * Belangrijkste wijziging:
 *  - Als search() een query[] meegeeft (PresetZoeker), dan:
 *      → exact die termen gebruiken
 *      → KA_MAPPING NIET toepassen
 *  - Alleen als query[] leeg is EN filters.ka aanwezig is:
 *      → KA_MAPPING gebruiken als fallback
 *
 *  Dus: PresetZoeker is de baas.
 */

const axios = require("axios");
const cheerio = require("cheerio");
const { KA_MAPPING } = require("./a22.ka-mapping.cjs");

// Klein filter voor geldige afbeeldingen
const isValidImage = (src) => {
  if (!src) return false;
  const s = src.toLowerCase();
  if (s.includes("logo") || s.includes("icon") || s.includes("placeholder")) return false;
  return true;
};

// Detail scrape
const fetchDetail = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 4000
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
      image: img
    };
  } catch {
    return { text: null, image: null };
  }
};

// Zoek één term
const searchSingleTerm = async (term) => {
  if (!term || !String(term).trim()) return [];
  const t = String(term).trim();

  console.log(`[Kleio] 🔍 TERM: "${t}"`);

  const url = `https://www.vgnkleio.nl/?s=${encodeURIComponent(t)}`;

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const $ = cheerio.load(data);
    const items = [];

    $("article").each((i, el) => {
      if (items.length >= 5) return;

      const title =
        $(el).find("h2 a").text().trim() ||
        $(el).find(".entry-title a").text().trim();
      const link = $(el).find("a").attr("href");
      const thumb = $(el).find("img").attr("src");

      if (title && link) items.push({ title, link, thumb });
    });

    return items;
  } catch {
    return [];
  }
};

// Hoofdzoekfunctie
const searchKleio = async ({ query, filters }) => {
  if (filters.kleio === false) return [];

  let terms = [];

  // 1. Als front-end een array geeft → direct gebruiken
  if (Array.isArray(query) && query.length > 0) {
    terms = query.map((x) => String(x).trim()).filter(Boolean);
  }

  // 2. Als er geen terms zijn maar KA is wel gegeven → KA_MAPPING fallback
  if (terms.length === 0 && filters.ka) {
    const key = String(filters.ka).toLowerCase().startsWith("ka")
      ? String(filters.ka).toLowerCase()
      : "ka" + String(filters.ka).trim();

    if (KA_MAPPING[key]) {
      terms = [...KA_MAPPING[key]];
      console.log(`[Kleio] 🎯 Gebruik KA_MAPPING fallback voor ${key}`);
    }
  }

  // 3. Als nog steeds leeg → geen Kleio-zoekopdracht
  if (terms.length === 0) {
    return [];
  }

  console.log(`[Kleio] 🚀 Multiquery met ${terms.length} termen…`);

  // Parallel
  const perTerm = await Promise.all(terms.map(searchSingleTerm));
  const merged = [];
  const seen = new Set();

  perTerm.flat().forEach((item) => {
    if (!seen.has(item.link)) {
      seen.add(item.link);
      merged.push(item);
    }
  });

  console.log(`[Kleio] 🎯 ${merged.length} unieke hits. Verrijken…`);

  // Verrijken
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
        type: d.image ? "IMAGE" : "TEXT"
      };
    })
  );

  // Filter op type
  return enriched.filter((it) => {
    if (filters.images === false && it.type === "IMAGE") return false;
    if (filters.text === false && it.type === "TEXT") return false;
    return true;
  });
};

module.exports = { searchKleio };


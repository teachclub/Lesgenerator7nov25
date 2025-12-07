"use strict";

const axios = require("axios");
const cheerio = require("cheerio");
const kaTrefwoorden = require("../data/ka-trefwoorden.cjs");

// Helper: Is dit plaatje geldig?
const isValidImage = (src) => {
  if (!src) return false;
  const s = src.toLowerCase();
  if (s.includes("logo") || s.includes("icon") || s.includes("placeholder"))
    return false;
  return true;
};

// KA-code → zoektermen uit de tabel
function getTermsForKaCode(kaCode) {
  if (!kaCode) return [];
  const raw = String(kaCode).trim().toUpperCase();
  const key = raw.startsWith("KA") ? raw : `KA${raw}`;
  const terms = kaTrefwoorden[key];
  if (!Array.isArray(terms)) return [];
  return terms;
}

// Scrape 1 detailpagina
const fetchDetail = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 4000,
    });
    const $ = cheerio.load(data);

    let fullText =
      $(".elementor-widget-theme-post-content").text().trim() ||
      $(".entry-content").text().trim();
    if (!fullText || fullText.length < 50) {
      $("header, footer, nav").remove();
      fullText = $("body p").text().trim();
    }

    let img =
      $(".elementor-widget-theme-post-content img").attr("src") ||
      $(".entry-content img").attr("src");
    if (!isValidImage(img)) img = null;

    return {
      text: fullText.replace(/\s+/g, " ").substring(0, 600),
      image: img,
    };
  } catch (e) {
    return { text: null, image: null };
  }
};

// Zoek 1 term op vgnkleio.nl
const searchSingleTerm = async (term) => {
  const safeTerm = String(term).trim();
  if (!safeTerm) return [];

  console.log(`[Kleio] 🔍 Zoeken naar: "${safeTerm}"`);
  const url = `https://www.vgnkleio.nl/?s=${encodeURIComponent(safeTerm)}`;

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const $ = cheerio.load(data);
    const results = [];

    $("article").each((i, elem) => {
      if (results.length >= 5) return;
      const title = $(elem).find("h2 a, .entry-title a").text().trim();
      const link = $(elem).find("a").attr("href");
      let thumb = $(elem).find("img").attr("src");

      if (title && link) {
        results.push({ title, link, thumb });
      }
    });
    return results;
  } catch (e) {
    return [];
  }
};

/**
 * searchKleio
 *
 * Input vanuit a12.search.cjs:
 *   { query, filters }
 *
 * Gedrag:
 *  - Als filters.ka aanwezig is (bv. ["45"]), gebruik dan ka-trefwoorden:
 *       KA45 → alle termen + key figures uit data/ka-trefwoorden.cjs
 *    en kies daar max. 6 termen uit.
 *  - Alleen als er dan nog steeds geen termen zijn, val terug op query.
 */
const searchKleio = async ({ query, filters }) => {
  if (filters?.kleio === false) return [];

  let terms = [];

  // 1. Prefer KA → termen (jouw grote tabel)
  if (Array.isArray(filters?.ka) && filters.ka.length > 0) {
    filters.ka.forEach((kaCode) => {
      const fromKa = getTermsForKaCode(kaCode);
      terms.push(...fromKa);
    });
  }

  // 2. Als er (nog) geen termen zijn, fallback naar query
  if (terms.length === 0) {
    if (Array.isArray(query)) {
      terms = query;
    } else if (typeof query === "string") {
      terms = query.includes(" OR ") ? query.split(" OR ") : [query];
    }
  }

  // 3. Schoonmaken
  terms = terms
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0);

  // 4. Maximaal 6 termen per multiquery (zoals jij wilde)
  if (terms.length > 6) {
    for (let i = terms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [terms[i], terms[j]] = [terms[j], terms[i]];
    }
    terms = terms.slice(0, 6);
  }

  if (terms.length === 0) return [];

  console.log(`[Kleio] 🚀 Start Multiquery met ${terms.length} termen...`);

  // Parallel zoeken op vgnkleio.nl
  const allPromises = terms.map((term) => searchSingleTerm(term));
  const resultsPerTerm = await Promise.all(allPromises);

  // Ontdubbelen
  const uniqueLinks = new Set();
  const flatResults = [];

  resultsPerTerm.flat().forEach((item) => {
    if (!item || !item.link) return;
    if (!uniqueLinks.has(item.link)) {
      uniqueLinks.add(item.link);
      flatResults.push(item);
    }
  });

  console.log(
    `[Kleio] Totaal ${uniqueLinks.size} unieke hits gevonden. Nu verrijken...`
  );

  // Verrijken
  const enriched = await Promise.all(
    flatResults.map(async (item, i) => {
      const details = await fetchDetail(item.link);
      return {
        id: `kleio-${i}`,
        title: item.title,
        description: details.text || "...",
        fullText: details.text,
        imageUrl: details.image || (isValidImage(item.thumb) ? item.thumb : null),
        url: item.link,
        provider: "Kleio",
        type: details.image ? "IMAGE" : "TEXT",
      };
    })
  );

  // Filtertype respecteren
  return enriched.filter((item) => {
    if (filters?.images === false && item.type === "IMAGE") return false;
    if (filters?.text === false && item.type === "TEXT") return false;
    return true;
  });
};

module.exports = { searchKleio };


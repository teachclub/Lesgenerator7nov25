// backend/services/a27.kleio.cjs
// Kleio-scraper met tijdvak- / type-filters
const axios = require("axios");
const cheerio = require("cheerio");
const BASE_URL = "https://www.vgnkleio.nl";

const periodMap = {
  "16e eeuw": "16e-eeuw",
  "17e eeuw": "17e-eeuw",
  "18e eeuw": "18e-eeuw",
  "19e eeuw": "19e-eeuw",
  "20e eeuw": "20e-eeuw"
};

async function fetchSourceLinks(query, filters = {}, limit = 5) {
  const params = new URLSearchParams();
  params.append("_zoeken", query);

  if (Array.isArray(filters.periods)) {
    filters.periods.forEach((p) => {
      const kleioPeriod = periodMap[p];
      if (kleioPeriod) params.append("_filter_tijd", kleioPeriod);
    });
  }

  if (Array.isArray(filters.types)) {
    if (filters.types.includes("IMAGE")) {
      params.append("_filter_bron_type", "afbeelding");
    }
    if (filters.types.includes("TEXT")) {
      params.append("_filter_bron_type", "tekst");
    }
  }

  const searchUrl = `${BASE_URL}/bronnen/?${params.toString()}`;
  console.log("[a27.kleio] Stap 1: Links zoeken op", searchUrl);

  const { data: html } = await axios.get(searchUrl, {
    headers: { "User-Agent": "Kleio-Lesgenerator/1.0" }
  });

  const $ = cheerio.load(html);
  const links = [];
  const queryLower = query.toLowerCase();

  $("h3").each((i, el) => {
    if (links.length >= limit) return;

    const $h3 = $(el);
    const $a = $h3.find('a[href*="/bronnen/"]').first();
    if (!$a.length) return;

    const metaText = $h3.next().text().trim();
    if (!metaText.includes("Primair")) return;

    const title = $a.text().trim();
    const snippet = $h3.next().next().text().trim();
    const blockText = (title + " " + snippet).toLowerCase();

    // Strenge check op zoekterm (indien aanwezig)
    if (queryLower && !blockText.includes(queryLower)) {
      // console.log(`[a27.kleio] Filter: "${title}" (bevat niet "${query}") verwijderd.`);
      return;
    }

    const href = $a.attr("href");
    if (href && title) {
      const url = href.startsWith("http") ? href : BASE_URL + href;
      links.push({ title, url });
    }
  });

  console.log(`[a27.kleio] Stap 1: ${links.length} (gefilterde) links gevonden.`);
  return links;
}

async function fetchSourceDetail(item) {
  try {
    const { data: html } = await axios.get(item.url, {
      headers: { "User-Agent": "Kleio-Lesgenerator/1.0" }
    });
    const $ = cheerio.load(html);
    const title = $("h1").first().text().trim() || item.title;
    let fullText =
      $("main").text().trim() || $(".entry-content").text().trim();
    fullText = fullText.replace(/\s\s+/g, " ").trim();
    return {
      title,
      link: item.url,
      description: fullText.substring(0, 250) + "...",
      fullText,
      source: "Kleio"
    };
  } catch (err) {
    console.error(`[a27.kleio] Fout bij detail ${item.url}:`, err.message);
    return null;
  }
}

async function scrapeKleio(query, filters = {}, limit = 5) {
  try {
    const linksToFetch = await fetchSourceLinks(query, filters, limit);
    if (!linksToFetch.length) {
      console.log("[a27.kleio] Geen links gevonden.");
      return [];
    }
    const detailPromises = linksToFetch.map((item) =>
      fetchSourceDetail(item)
    );
    const sources = (await Promise.all(detailPromises)).filter(Boolean);
    console.log(`[a27.kleio] Scrapen voltooid. ${sources.length} bronnen opgehaald.`);
    return sources;
  } catch (error) {
    console.error("[a27.kleio] Fout tijdens scrapen:", error.message);
    return [];
  }
}

module.exports = {
  scrapeKleio
};


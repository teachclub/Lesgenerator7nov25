const axios = require("axios");

const BASE = "https://api.europeana.eu/record/v2/search.json";
const ROWS_DEFAULT = 25;

function pickText(v) {
  if (Array.isArray(v) && v.length) return String(v[0]);
  if (typeof v === "string") return v;
  return "";
}

async function searchEuropeana(q, page = 1, rows = ROWS_DEFAULT) {
  const apiKey = process.env.EUROPEANA_API_KEY || "";
  if (!apiKey) return { total: 0, items: [], error: "missing_api_key" };

  const _rows = Math.max(1, Math.min(100, Number(rows) || ROWS_DEFAULT));
  const _page = Math.max(1, Number(page) || 1);

  const params = {
    wskey: apiKey,
    query: String(q || "").trim(),
    rows: _rows,
    start: (_page - 1) * _rows + 1,
    profile: "rich",
  };

  const { data } = await axios.get(BASE, { params, timeout: 20000 });
  const total = Number(data?.totalResults || 0);

  const items = (data?.items || []).map((it) => {
    const title =
      pickText(it.title) ||
      pickText(it["dcTitle"]) ||
      it.guid ||
      "Europeana record";
    const desc =
      pickText(it.dcDescription) ||
      pickText(it.dataProvider) ||
      "";
    const url = it.guid || it.link || "";
    const score = Number(it.rank) || 0;

    return {
      title,
      url,
      source: "europeana",
      snippet: desc,
      _score: score,
    };
  });

  return { total, items };
}

module.exports = { searchEuropeana };


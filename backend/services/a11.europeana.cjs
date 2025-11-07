const { fetchJson } = require("../utils/http.cjs");

const BASE = "https://api.europeana.eu/record/v2";
const WSKEY = () => process.env.EUROPEANA_WSKEY;

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach(x => sp.append(k, String(x)));
    else sp.set(k, String(v));
  });
  return sp.toString();
}

async function ping() {
  if (!WSKEY()) return { ok: false, status: 400, data: { error: "EUROPEANA_WSKEY ontbreekt" } };
  // lichte ping via lege search
  const url = `${BASE}/search.json?${qs({ wskey: WSKEY(), rows: 0, query: "" })}`;
  return fetchJson(url, { method: "GET" }, 6000);
}

async function searchRaw({ query = "", qf = [], rows = 12, start = 1, profile = "rich", media = true }) {
  if (!WSKEY()) return { ok: false, status: 400, data: { error: "EUROPEANA_WSKEY ontbreekt" } };
  const params = {
    wskey: WSKEY(),
    query,
    rows,
    start,
    profile,
    media: media ? "true" : "false",
  };
  const url = `${BASE}/search.json?${qs(params)}${qf && qf.length ? "&" + qs({ qf }) : ""}`;
  return fetchJson(url, { method: "GET" }, 12000);
}

async function facets({ query = "", qf = [], rows = 0, facet = ["PROVIDER", "COUNTRY"] }) {
  if (!WSKEY()) return { ok: false, status: 400, data: { error: "EUROPEANA_WSKEY ontbreekt" } };
  const params = {
    wskey: WSKEY(),
    query,
    rows,
    profile: "facets",
  };
  // Europeana accepteert meerdere facet= params
  const url = `${BASE}/search.json?${qs(params)}&${qs({ facet })}${qf && qf.length ? "&" + qs({ qf }) : ""}`;
  return fetchJson(url, { method: "GET" }, 12000);
}

async function item(id) {
  if (!WSKEY()) return { ok: false, status: 400, data: { error: "EUROPEANA_WSKEY ontbreekt" } };
  if (!id) return { ok: false, status: 400, data: { error: "id ontbreekt" } };
  // Verwijder de optionele leading slash (bijv. /92037/_apv8s6k)
  const clean = String(id).replace(/^\//, "");
  const url = `${BASE}/${clean}.json?${qs({ wskey: WSKEY() })}`;
  return fetchJson(url, { method: "GET" }, 12000);
}

module.exports = { ping, searchRaw, facets, item };

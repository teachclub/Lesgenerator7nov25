// sources/europeana.cjs
// Europeana Search API fetcher met filters (qf) en taalveld.
// Endpoint: https://api.europeana.eu/record/v2/search.json
// Vereist: env EUROPEANA_WSKEY of EUROPEANA_API_KEY.

const BASE = 'https://api.europeana.eu/record/v2/search.json';

// Querystring helper
function withParams(url, params) {
  const u = new URL(url);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((vv) => u.searchParams.append(k, vv));
    else u.searchParams.set(k, String(v));
  });
  return u.toString();
}

// Europeana item -> uniform resultaat
function normalizeItem(it) {
  const titleArr = Array.isArray(it.title) ? it.title : (it.title ? [it.title] : []);
  const title = titleArr[0] || '(zonder titel)';

  const url =
    it.link ||
    (it.guid && `https://www.europeana.eu/item/${encodeURIComponent(it.guid.replace(/^\//, ''))}`) ||
    '';

  const descArr = Array.isArray(it.dcDescription) ? it.dcDescription : (it.dcDescription ? [it.dcDescription] : []);
  const snippet = descArr[0] || it.dataProvider || '';

  // Taal kan op meerdere plekken zitten; pak eerste beste
  const langArr =
    (Array.isArray(it.language) && it.language) ||
    (Array.isArray(it.lang) && it.lang) ||
    (Array.isArray(it.edmLanguage) && it.edmLanguage) ||
    [];
  const lang = String(langArr[0] || '').toLowerCase() || null;

  return {
    provider: 'europeana',
    title: String(title || '').trim() || '(zonder titel)',
    title_original: String(title || '').trim(), // voor UI: altijd het origineel beschikbaar
    url,
    snippet: String(snippet || '').trim(),
    lang,                     // 'nl', 'en', etc.
    europeana_id: it.id || it.guid || null,
    thumbnail: it.edmPreview && it.edmPreview[0] ? it.edmPreview[0] : null,
  };
}

// search({ query, limit, filters })
// - filters: array met Europeana qf-facetten, bv: ['LANGUAGE:nl','TYPE:TEXT']
async function search({ query, limit = 12, filters = [] }) {
  const WSKEY =
    process.env.EUROPEANA_WSKEY ||
    process.env.EUROPEANA_API_KEY ||
    process.env.EUROPEANA_KEY;

  if (!WSKEY) return [];

  // basis URL
  const base = withParams(BASE, {
    wskey: WSKEY,
    query: query || '',
    rows: Math.max(1, Math.min(Number(limit) || 12, 100)),
    profile: 'standard',
    media: true,
    thumbnail: true,
  });

  // filters via qf
  const url = new URL(base);
  (filters || []).forEach((f) => url.searchParams.append('qf', String(f)));

  try {
    const r = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!r.ok) return [];
    const data = await r.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map(normalizeItem).filter((x) => x.url);
  } catch {
    return [];
  }
}

module.exports = { search };


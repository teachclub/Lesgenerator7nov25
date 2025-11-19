// services/a23.europeana.cjs
// Centrale Europeana-zoekservice voor hits & chips.
// Doel: nooit meer een negatieve 'start' en altijd een geldige query versturen.

const EUROPEANA_BASE_URL = 'https://api.europeana.eu/record/v2/search.json';
const WSKEY = process.env.EUROPEANA_WSKEY;

// Kleine helper: bouw een veilige Europeana-query uit de terms + mode.
function buildQueryFromTerms(terms = [], mode = 'AND') {
  if (!Array.isArray(terms) || terms.length === 0) {
    // Geen termen → match-all query
    return '*:*';
  }

  const cleaned = terms
    .filter((t) => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => `"${t.replace(/"/g, '\\"')}"`);

  if (cleaned.length === 0) {
    return '*:*';
  }

  const op = mode === 'OR' ? ' OR ' : ' AND ';
  return cleaned.join(op);
}

/**
 * Hoofdfunctie: voert een Europeana-zoekopdracht uit.
 *
 * @param {Object} payload
 * @param {string[]} [payload.terms]
 * @param {'AND'|'OR'} [payload.mode]
 * @param {Object} [payload.filters]
 * @param {Object} [payload.doelgroep]
 * @param {string[]} [payload.tv]
 * @param {string[]} [payload.ka]
 * @param {number} [payload.rows]
 * @param {number} [payload.page]
 *
 * @returns {Promise<{ items: any[], total: number, raw: any }>}
 */
async function performEuropeanaSearch(payload = {}) {
  const {
    terms = [],
    mode = 'AND',
    // filters, doelgroep, tv, ka zijn nu nog optioneel
    filters = {},
    doelgroep = {},
    tv = [],
    ka = [],
    rows = 24,
    page = 1,
  } = payload;

  if (!WSKEY) {
    throw new Error('[a23.europeana] EUROPEANA_WSKEY ontbreekt in environment');
  }

  // 1. Query opbouwen
  const query = buildQueryFromTerms(terms, mode);

  // 2. Paginering veilig maken
  // rows: minimaal 1, maximaal 100 (Europeana limiet)
  let numRows = parseInt(rows, 10);
  if (!Number.isFinite(numRows) || numRows <= 0) {
    // Als iemand rows=0 doorstuurt (bijvoorbeeld alleen totalen willen),
    // gebruiken we 1 rij: totalResults blijft hetzelfde.
    numRows = 1;
  }
  numRows = Math.min(numRows, 100);

  // page: minimaal 1
  let currentPage = parseInt(page, 10);
  if (!Number.isFinite(currentPage) || currentPage < 1) {
    currentPage = 1;
  }

  // start mag NOOIT negatief zijn; eerste item is 1.
  const start = (currentPage - 1) * numRows + 1;

  const params = new URLSearchParams();
  params.set('wskey', WSKEY);
  params.set('query', query);
  params.set('rows', String(numRows));
  params.set('start', String(start));

  // TODO: filters, doelgroep, tv/ka later netjes mappen naar qf / facetfilters.
  // Voor nu doen we nog niets met filters om stabiliteit te houden.

  const url = `${EUROPEANA_BASE_URL}?${params.toString()}`;

  console.log('[a23.europeana] Request:', {
    query,
    rows: numRows,
    page: currentPage,
    start,
    url,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `[a23.europeana] HTTP ${response.status} – ${text}`
    );
  }

  const data = await response.json();

  const items = Array.isArray(data.items) ? data.items : [];
  const total =
    typeof data.totalResults === 'number' ? data.totalResults : 0;

  return {
    items,
    total,
    raw: data,
  };
}

module.exports = {
  performEuropeanaSearch,
};


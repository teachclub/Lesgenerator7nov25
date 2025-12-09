/**
 * Bouwt een 'sanitized' URLSearchParams object voor de Europeana Search API v2.
 * Deze functie lost twee kritieke 400 Bad Request fouten op:
 * 1. (Vector 1) Zorgt ervoor dat de 'query' parameter altijd aanwezig is,
 *    met '*:*' (Lucene 'match all') als default.
 * 2. (Vector 2) Voorkomt een logisch paginatieconflict door de 'start'
 *    parameter *alleen* toe te voegen als 'rows' > 0 is.
 *
 * @param {string} apiKey - De Europeana API-sleutel (wskey).
 * @param {object} options - Een object met zoekparameters.
 * @param {string} [options.query] - De zoekterm van de gebruiker.
 * @param {number} [options.rows] - Aantal resultaten (default 12, max 100).
 * @param {number} [options.start] - Startitem (default 1).
 * @param {string} [options.qf] - Array van facet-filters (bijv. 'REUSABILITY:open').
 * @param {string} [options.profile] - Het gewenste response-profiel.
 * @returns {URLSearchParams} Een gevalideerd URLSearchParams object, klaar voor gebruik met fetch.
 */
const buildEuropeanaRequestParams = (apiKey, options = {}) => {
  const params = new URLSearchParams();

  // Voeg de verplichte API-sleutel toe
  params.append('wskey', apiKey);

  // --- Remediëring FoutVector 1: Verplichte 'query' ---
  // De API vereist een 'query'. Gebruik 'match all' (Lucene-syntax)
  // als default indien geen query is opgegeven.
  const searchQuery = options.query |

| '*:*';
  params.append('query', searchQuery);

  // --- Remediëring FoutVector 2: Paginatieconflict 'start'/'rows' ---
  // Bepaal het aantal rijen. Standaardwaarde is 12.
  // Converteer naar getal om zeker te zijn.
  const numRows = options.rows!== undefined? parseInt(options.rows, 10) : 12;

  // Voeg 'rows' altijd toe.
  params.append('rows', numRows);

  // Voeg 'start' *alleen* toe als we daadwerkelijk rijen opvragen (rows > 0).
  // Het meesturen van 'start=1' (de default) bij 'rows=0' veroorzaakt
  // een 400 Bad Request.
  if (numRows > 0) {
    // Standaard start is 1. Zorg dat het nooit lager is dan 1.
    const startPage = options.start!== undefined? parseInt(options.start, 10) : 1;
    params.append('start', Math.max(1, startPage));
  }
  // Als numRows == 0, wordt 'start' bewust weggelaten om het conflict te vermijden.

  // Verwerk overige parameters (bijv. facetten, profiel)
  if (options.qf && Array.isArray(options.qf)) {
    options.qf.forEach(facetQuery => {
      // 'qf' (query filter) kan meerdere keren worden toegevoegd 
      params.append('qf', facetQuery);
    });
  }

  if (options.profile) {
    params.append('profile', options.profile);
  }
  
  // Voeg hier andere parameters toe (bijv. reusability, media) 

  return params;
};

// Exporteer de functie voor gebruik in de CJS-module
module.exports = {
  buildEuropeanaRequestParams
};

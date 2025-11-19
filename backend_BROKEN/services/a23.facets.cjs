// services/a23.facets.cjs
// Programmeerbare helper om facets op te halen. Leunt op performEuropeanaSearch.
// Verwacht dat performEuropeanaSearch facet-params kan doorgeven.
const { performEuropeanaSearch } = require("./a23.europeana.cjs");

/**
 * getFacets(payload)
 * payload: { terms[], mode, doelgroep, filters, tv[], ka[], facets? }
 * return: raw response met facetvelden (shape wordt hogerop genormaliseerd)
 */
async function getFacets(payload = {}) {
  const { facets = ["who", "what", "where", "YEAR"], ...rest } = payload;

  const res = await performEuropeanaSearch({
    ...rest,
    rows: 0,                   // alleen telling/facets
    page: 1,
    facets,                    // geef door aan onderlaag
    returnFacets: true,        // hint voor jouw implementatie
  });

  return res || {};
}
module.exports = { getFacets };

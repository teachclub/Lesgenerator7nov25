// services/a23.facets.cjs
// Zorgt voor een programmeerbare helper die facets ophaalt op basis van dezelfde payload.
const { performEuropeanaSearch } = require("./a23.europeana.cjs");

/**
 * getFacets(payload)
 * Verwacht dezelfde searchPayload (terms/mode/filters/doelgroep/tv/ka).
 * Retourneert een object met facetvelden. De achterliggende implementatie
 * in a23.europeana.cjs moet bij rows:0 de facetvelden meesturen.
 */
async function getFacets(payload = {}) {
  // forceer rows:0 en een vlag die jouw performEuropeanaSearch begrijpt
  const res = await performEuropeanaSearch({
    ...payload,
    rows: 0,
    page: 1,
    facets: ["who","what","where","YEAR"], // hint; jouw service mag dit anders interpreteren
  });
  // gewoon res teruggeven — a06.chips normaliseert meerdere vormen
  return res;
}

module.exports = { getFacets };

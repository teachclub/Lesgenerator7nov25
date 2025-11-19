const https = require('https');

const API_KEY = process.env.EUROPEANA_WSKEY;
const BASE_URL = 'https://api.europeana.eu/record/v2/search.json';

function searchEuropeana(params) {
  const defaultParams = {
    wskey: API_KEY,
    theme: 'art',
    media: 'true',
    rows: 100,
    'f.language.name': 'nl',
    'f.language.name_limit': 1000,
    'f.provider_aggregation_edm_isShownBy.name_limit': 1000,
    profile: 'facets',
  };

  const allParams = { ...defaultParams, ...params };
  const queryString = Object.entries(allParams)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

  const url = `${BASE_URL}?${queryString}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`[Europeana] JSON parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`[Europeana] HTTP Status ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`[Europeana] Fetch error: ${err.message}`));
    });
  });
}

module.exports = { searchEuropeana };

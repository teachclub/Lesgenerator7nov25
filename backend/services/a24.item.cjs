const { getJson } = require('../utils/http.cjs');

const WSKEY = process.env.EUROPEANA_WSKEY;

async function fetchItem(recordId) {
  if (!WSKEY) throw new Error('EUROPEANA_WSKEY not set');
  if (!recordId) throw new Error('Missing id');
  const url = `https://api.europeana.eu/record/v2/record.json?wskey=${encodeURIComponent(WSKEY)}&recordId=${encodeURIComponent(recordId)}`;
  const out = await getJson(url, { timeoutMs: 8000 });
  return { url, ...out };
}

module.exports = { fetchItem };


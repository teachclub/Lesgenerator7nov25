const DEFAULT_TIMEOUT = 12000; // 12 seconden default timeout

/**
 * Een wrapper om native fetch() met een timeout en JSON parsing.
 * @param {string} url De URL om te fetchen
 * @param {object} opts Standaard fetch options (method, headers, body)
 * @param {number} timeoutMs Override de default timeout
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 */
async function fetchJson(url, opts = {}, timeoutMs = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  let text;

  try {
    res = await fetch(url, {
      ...opts,
      signal: controller.signal, // Koppel de AbortController
    });

    text = await res.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, status: 408, data: { error: `Request timed out (${timeoutMs}ms)` } };
    }
    return { ok: false, status: 500, data: { error: `Fetch failed`, detail: err.message } };
  } finally {
    clearTimeout(id); // Ruim de timer op
  }

  let data;
  try {
    // Probeer JSON te parsen
    data = JSON.parse(text);
  } catch (e) {
    // Als het geen JSON is, geef de ruwe tekst terug
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

module.exports = { fetchJson };

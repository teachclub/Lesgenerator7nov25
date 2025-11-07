// sources/historiana.cjs
// Historiana fetcher via DuckDuckGo "site:historiana.eu" (geen API, echte data).
// Werkt ook als Historiana-zoekpagina dynamisch is.

// 1) We zoeken via DuckDuckGo HTML en filteren op historiana.eu.
// 2) We prefereren /en/resource/*; als titel/snippet niet duidelijk is, gebruiken we link-tekst.
// 3) Resultaat: [{provider:'historiana', title, url, snippet}]

const SITE = 'historiana.eu';

// Simpele HTML helpers
function stripTags(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function decodeEntities(s = '') {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalize({ title, url, snippet }) {
  return {
    provider: 'historiana',
    title: (title || '').trim() || '(zonder titel)',
    url: url || '',
    snippet: (snippet || '').trim(),
  };
}

// DuckDuckGo HTML endpoint (non-JS)
const ddgUrl = (q) =>
  `https://duckduckgo.com/html/?q=${encodeURIComponent(`site:${SITE} ${q}`)}&kl=wt-wt`;

async function searchDDG(query, limit = 12) {
  let html = '';
  try {
    const r = await fetch(ddgUrl(query), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Masterprompt/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    html = await r.text();
  } catch {
    return [];
  }

  // DDG result markup bevat anchors met class=result__a en snippets in result__snippet
  // We doen een generieke parse: pak alle <a ...> met href naar historiana.eu
  const results = [];
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const href = decodeEntities(m[1] || '');
    const inner = stripTags(decodeEntities(m[2] || ''));
    if (!/https?:\/\/[^/]*historiana\.eu/i.test(href)) continue;

    // zoek dichtbij snippet (grofweg: paar honderd chars na de link)
    const pos = m.index;
    const snippet = (() => {
      const window = html.slice(pos, pos + 600);
      const snipRe = /class=["']result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a?>/i;
      const m2 = snipRe.exec(window);
      return m2 ? stripTags(decodeEntities(m2[1] || '')).slice(0, 220) : '';
    })();

    results.push(
      normalize({
        title: inner,
        url: href,
        snippet,
      })
    );
    if (results.length >= limit) break;
  }

  // Prefer /en/resource links bovenom
  results.sort((a, b) => {
    const ar = /\/en\/resource/i.test(a.url) ? 0 : 1;
    const br = /\/en\/resource/i.test(b.url) ? 0 : 1;
    return ar - br;
  });

  // Dedup op URL
  const seen = new Set();
  const final = [];
  for (const it of results) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    final.push(it);
    if (final.length >= limit) break;
  }
  return final;
}

async function search({ query, limit = 12 }) {
  // 1) probeer DDG
  const ddg = await searchDDG(query, Math.min(limit * 2, 24));
  if (ddg.length) {
    // snijd naar limiet
    return ddg.slice(0, limit);
  }
  // 2) als echt niets, geef leeg terug (geen mock/fallback-tekst)
  return [];
}

module.exports = { search };


const cheerio = require('cheerio');

async function fetchKleio(url) {
  if (!url || typeof url !== 'string') throw new Error('Ongeldige URL');

  console.log('[/fetcher] Fetching URL:', url);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) throw new Error(`HTTP-fout: ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    let text = '';
    // Tekst ophalen (eerst de specifieke Elementor class, anders fallback)
    const $haak = $('.elementor-widget-theme-post-content').first();
    if ($haak.length) {
      text = $haak.text();
    } else {
      text = $('article').first().text() || $('main').text() || $.text();
    }
    text = text.replace(/\s+/g, ' ').trim();
    const sliced = text.length > 20000 ? text.slice(0, 20000) : text;

    // DE FIX: Plaatje ophalen
    let imageUrl = null;
    // 1. Probeer de specifieke Wordpress block image
    const $img = $('figure.wp-block-image img').first();
    
    if ($img.length) {
        imageUrl = $img.attr('src');
    } else {
        // 2. Fallback: eerste beste plaatje in de content
        imageUrl = $('.elementor-widget-theme-post-content img').first().attr('src');
    }

    console.log(`[/fetcher] ${url} -> Tekst: ${sliced.length} chars, Img: ${imageUrl ? 'JA' : 'NEE'}`);

    // We returnen nu een object!
    return { fullText: sliced, imageUrl }; 

  } catch (error) {
    console.error('[/fetcher] Fout:', error.message);
    throw new Error(`Fetch-fout: ${error.message}`);
  }
}
module.exports = { fetchKleio };

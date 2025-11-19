const cheerio = require('cheerio');

async function scrapeKleio(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Ongeldige URL voor scraper');
  }

  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`URL moet met http(s) beginnen: ${url}`);
  }

  console.log('[/scraper] Fetching URL:', url);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP-fout bij scrapen: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let text = '';

    const $article = $('article').first();
    if ($article.length) {
      text = $article.text();
    } else if ($('main').length) {
      text = $('main').text();
    } else {
      text = $.text();
    }

    text = text.replace(/\s+/g, ' ').trim();

    const maxLength = 20000;
    const sliced = text.length > maxLength ? text.slice(0, maxLength) : text;

    console.log(
      `[/scraper] Tekstlengte voor ${url}:`,
      sliced.length,
      'characters'
    );

    return sliced;
  } catch (error) {
    console.error(
      `[/scraper] Fout bij ophalen detail ${url}:`,
      error.message || error
    );
    throw new Error(`Scrape-fout! Status: ${error.message || error}`);
  }
}
module.exports = {
  scrapeKleio,
};

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Haalt de inhoud van een URL op en probeert de hoofdtekst te extraheren.
 * @param {string} url De URL om te scrapen
 * @returns {Promise<string>} De geëxtraheerde tekst
 */
const scrapeUrl = async (url) => {
  console.log(`[a26.scraper] Start scrape voor: ${url}`);

  try {
    // 1. Haal de HTML-pagina op
    const { data: html } = await axios.get(url, {
      // Stuur een 'User-Agent' mee om te lijken op een browser
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // 2. Laad de HTML in Cheerio
    const $ = cheerio.load(html);

    // 3. Probeer de hoofdinhoud te vinden (meest voorkomende tags)
    // Dit is een 'gok' en moet misschien per site (Kleio vs Europeana)
    // verfijnd worden.
    let mainContentElement = 
      $('article').first() ||          // Eerst proberen we <article>
      $('main').first() ||            // Dan <main>
      $('[role="main"]').first() ||   // Dan role="main"
      $('.content').first() ||        // Dan class="content"
      $('#content').first();         // Dan id="content"

    // Als we niets specifieks vinden, pakken we de hele <body>
    if (!mainContentElement.length) {
      mainContentElement = $('body');
    }

    // 4. Haal alle tekst uit het geselecteerde element
    // .text() haalt netjes de tekst op zonder HTML-tags
    let fullText = mainContentElement.text();

    // 5. Maak de tekst schoon (verwijder overmatige witruimte)
    fullText = fullText
      .replace(/(\r\n|\n|\r)/gm, " ") // Vervang line-breaks door spaties
      .replace(/\s\s+/g, ' ')        // Vervang meerdere spaties door één
      .trim();

    console.log(`[a26.scraper] Scrape succesvol. ${fullText.length} karakters gevonden.`);

    // Stuur de eerste 5000 karakters terug om de payload klein te houden
    return fullText.substring(0, 5000);

  } catch (error) {
    console.error(`[a26.scraper] Fout bij scrapen ${url}:`, error.message);
    throw new Error(`Kon de bron niet ophalen: ${error.message}`);
  }
};

module.exports = {
  scrapeUrl,
};

// sources/kleio.cjs
// Sjabloon voor de Kleio-bronnenbank. Later kun je hier jouw échte endpoint/HTML aan koppelen.
// Contract: exporteer async function search({ query, limit }) die een array van {provider,title,url,snippet} teruggeeft.

function normalize(item = {}) {
  return {
    provider: 'kleio',
    title: (item.title || '').trim() || '(zonder titel)',
    url: item.url || '',
    snippet: (item.snippet || '').trim(),
  };
}

async function search({ query, limit = 12 }) {
  // === VERVANG DIT LATER DOOR JE ECHTE FETCH ===
  // Voorbeeld (indien je een interne API maakt):
  // const r = await fetch(`http://localhost:3000/api/kleio/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  // const data = await r.json(); // verwacht array van {title,url,snippet}
  //
  // return Array.isArray(data)
  //   ? data.slice(0, limit).map((x) => normalize(x))
  //   : [];

  // --- Tijdelijke demo-output, zodat de UI nu al werkt ---
  const demo = [
    {
      title: `Kleio – zoekresultaat voor “${query}” (1)`,
      url: 'https://example.com/kleio/1',
      snippet: 'Voorbeeldresultaat uit de Kleio-bronbank. Vervang door live data.',
    },
    {
      title: `Kleio – zoekresultaat voor “${query}” (2)`,
      url: 'https://example.com/kleio/2',
      snippet: 'Tweede voorbeeldresultaat. Laat later vullen door jouw endpoint.',
    },
  ];

  return demo.slice(0, limit).map((x) => normalize(x));
}

module.exports = { search };


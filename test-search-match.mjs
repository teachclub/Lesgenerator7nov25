// Run: node test-search-match.mjs

import fetch from 'node-fetch';

const payload = {
  deelvraag: 'Waarom waren veel Duitse arbeiders vatbaar voor de propaganda van de NSDAP?',
  subdimensie: 'sociaal-economisch',
  tijdvak: '9'
};

const res = await fetch('http://127.0.0.1:8081/api/search-match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const json = await res.json();

console.log('📦 GEMINI BRONSELECTIE VOOR DEELVRAAG\n');
json.bronnen.forEach((b, i) => {
  console.log(`${i < 2 ? '⭐' : '▫️'} ${b.title}`);
  console.log(`  status: ${b.status}`);
  if (b.kernargumenten?.length) {
    console.log(`  kern:   ${b.kernargumenten[0]}`);
  } else if (b.motivatie) {
    console.log(`  motivatie: ${b.motivatie}`);
  }
  console.log('');
});


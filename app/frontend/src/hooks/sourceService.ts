// Bestand: app/backend/services/sourceService.ts
// Basisimplementatie voor search + fulltext ophalen

import fetch from 'node-fetch';

// Dummy: vervang met echte interne logica / search endpoint
export async function fetchSearchResults(query: string, tijdvak?: string) {
  const res = await fetch('http://127.0.0.1:8081/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, tijdvak })
  });
  const data = await res.json();
  return data.sources || [];
}

// Dummy: vervang met scraping of detail-API
export async function fetchFullText(bronId: string) {
  const res = await fetch(`http://127.0.0.1:8081/api/source-detail?id=${bronId}`);
  const data = await res.json();
  return data.fullText || data.text || '';
}


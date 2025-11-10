// src/lib/api.js
// Vite/React API-client voor Masterprompt backend (JavaScript versie).
// Gebruik: import { apiHealth, suggestChips, search, generateLesson } from '@/lib/api.js';

const API = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080';

async function toJSON(r) {
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`${r.status} ${r.statusText}: ${txt}`);
  }
  return r.json();
}

export async function apiHealth() {
  const r = await fetch(`${API}/health`);
  return toJSON(r);
}

export async function suggestChips(tv, ka, userQuery) {
  const r = await fetch(`${API}/api/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tv, ka, userQuery }),
  });
  return toJSON(r);
}

// Generieke search: kies provider: 'historiana' | 'kleio' | (later meer)
export async function search(provider, query, limit = 12) {
  const r = await fetch(`${API}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, query, limit }),
  });
  return toJSON(r);
}

export async function generateLesson(context, selection) {
  const r = await fetch(`${API}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, selection }),
  });
  return toJSON(r);
}


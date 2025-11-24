import axios from 'axios';

// NIEUWE POORT: 8081
const BASE_URL = 'http://127.0.0.1:8081';

console.log("API Geïnitialiseerd op:", BASE_URL);

export interface Tijdvak { id: string; label: string; naam?: string; }
export interface KenmerkendAspect { id: string; name: string; naam?: string; }

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  console.log(`Fetching: ${url}`);
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown API error' }));
      throw new Error(`HTTP error ${response.status}: ${errorBody.error || 'Check server logs.'}`);
    }
    return response.json() as Promise<T>;
  } catch (err) {
    console.error(`Fout bij fetchen van ${url}:`, err);
    throw err;
  }
}

export async function fetchTijdvakken(): Promise<Tijdvak[]> {
  return fetchJson<Tijdvak[]>('/api/tijdvakken');
}

export async function fetchKenmerkendeAspecten(tijdvakId: string): Promise<KenmerkendAspect[]> {
  return fetchJson<KenmerkendAspect[]>(`/api/ka?tv=${tijdvakId}`);
}

export async function fetchPreset(payload: any): Promise<any> {
    try {
        const response = await fetch(`${BASE_URL}/api/search-preset`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) return { ok: false, error: data.error || 'Search failed' };
        return { ok: true, data };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

export const api = axios.create({ baseURL: `${BASE_URL}/api`, headers: { 'Content-Type': 'application/json' } });

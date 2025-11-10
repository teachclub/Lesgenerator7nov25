const BASE_URL = 'http://localhost:8080';

// --- Data Structures ---

export interface Tijdvak {
  id: string;
  label: string;
}

export interface KenmerkendAspect {
  id: string;
  name: string;
}

export interface HistorianaSource {
  title: string;
  url: string;
  source: string; // Should be 'historiana'
  snippet: string;
}

export interface HistorianaSearchResult {
  total: number;
  items: HistorianaSource[];
}

export interface SearchTermCandidates {
  personen: string[];
  gebeurtenissen: string[];
  begrippen: string[];
  jaartallen: string[];
}

// --- Fetching Functions ---

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown API error' }));
    throw new Error(`HTTP error ${response.status}: ${errorBody.error || 'Check server logs.'}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchTijdvakken(): Promise<Tijdvak[]> {
  return fetchJson<Tijdvak[]>(`${BASE_URL}/api/tijdvakken`);
}

// FIX: Deze functie moet de exacte naam 'fetchKenmerkendeAspecten' exporteren
export async function fetchKenmerkendeAspecten(tijdvakId: string): Promise<KenmerkendAspect[]> {
  return fetchJson<KenmerkendAspect[]>(`${BASE_URL}/api/ka?tv=${tijdvakId}`);
}


export async function generateCandidateTerms(tv: string, ka: string): Promise<SearchTermCandidates> {
  const response = await fetch(`${BASE_URL}/api/generate-search-terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tv, ka }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error during term generation' }));
    throw new Error(`HTTP error ${response.status}: ${errorBody.error || 'Could not generate terms.'}`);
  }

  const data = await response.json();
  return data.terms as SearchTermCandidates;
}


export async function historianaSearch(query: string, page: number = 1): Promise<HistorianaSearchResult> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(50), 
  });
  return fetchJson<HistorianaSearchResult>(`${BASE_URL}/api/historiana/search?${params.toString()}`);
}


export async function generateLessonPlan(selectedTv: string, selectedKa: string, selectedBronnen: HistorianaSource[], aantalBronnen: number): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/generate-lesson-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedTv, selectedKa, selectedBronnen, aantalBronnen }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error during lesson plan generation' }));
    throw new Error(`HTTP error ${response.status}: ${errorBody.error || 'Could not generate lesson plan.'}`);
  }

  return response.json();
}

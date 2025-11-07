const FETCHER_BASE = 'https://kleio-fetcher-1093555590399.europe-west4.run.app';

export type KleioItem = {
  title_guess: string;
  permalink: string;
  source: string;
};

export type KleioSearchResult = {
  query_terms: string[];
  kleio_urls: string[];
  total_links_found: number;
  items: KleioItem[];
};

export async function searchKleio(term: string): Promise<KleioItem[]> {
  if (!term?.trim()) return [];
  const url = `${FETCHER_BASE}/kleio/search?term=${encodeURIComponent(term.trim())}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: KleioSearchResult = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

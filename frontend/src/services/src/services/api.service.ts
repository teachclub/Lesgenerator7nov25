import axios from 'axios';
import { SearchResult, Hit } from '../types/search-result.interface';

/**
 * Haalt zoekresultaten op van de backend (a12.search.cjs).
 */
export async function fetchSearchResults(
  query: string,
  filters: Record<string, boolean>
): Promise<SearchResult> {
  try {
    const res = await axios.post('/api/search', { query, filters });
    return res.data;
  } catch (error) {
    console.error('Fout bij ophalen zoekresultaten:', error);
    throw new Error('Kon zoekresultaten niet laden.');
  }
}

/**
 * Roept de backend-detailroute aan voor Kleio (POST /api/scrape).
 * Verwacht een absolute URL naar de Kleio-bron.
 */
export async function scrapeHitUrl(url: string): Promise<string> {
  const res = await axios.post('/api/scrape', { url });
  return res.data.fullText as string;
}

/**
 * Haalt een specifiek Europeana-record op (nog niet geïmplementeerd in a12).
 */
export async function fetchEuropeanaRecord(id: string): Promise<string> {
  // Tijdelijke placeholder, zoals in de backup
  console.log(`[api.service] fetchEuropeanaRecord aangeroepen voor: ${id}`);
  return 'Volledige tekst voor Europeana is nog niet geïmplementeerd.';
}

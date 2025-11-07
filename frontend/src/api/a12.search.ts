// De URL van je lokale backend-server
const API_URL = 'http://localhost:8080/api';

// --- Input Types ---
// (Deze moeten overeenkomen met je frontend state/componenten)

export interface Chip {
  label: string;
  kind: string;
  who?: string[];
  what?: string[];
  where?: string[];
  yearRange?: { from: number | null; to: number | null };
  type?: string[];
}

// Input voor Variant A: Vrije zoekopdracht
export interface FreeSearchInput {
  query?: string;
  qf?: string[]; // Extra filters (facets)
  rows?: number;
  start?: number;
  reusability?: string;
}

// Input voor Variant B: Zoeken op basis van chips
export interface ChipSearchInput {
  chips: Chip[];
  rows?: number;
  start?: number;
  reusability?: string;
}

// --- Output Types ---
// (Dit is een algemeen type, aangezien de Europeana-respons complex is)

export interface SearchResponse {
  ok: true;
  // 'data' bevat de volledige, ongewijzigde Europeana API-respons
  data: {
    success: boolean;
    itemsCount: number;
    totalResults: number;
    items?: any[]; // De daadwerkelijke resultaten
    facets?: any[];
  };
}

export interface SearchError {
  ok: false;
  error: string | object;
}

// --- API Functie ---

/**
 * Roept de /api/search endpoint aan.
 * Accepteert een object dat *ofwel* 'chips' *ofwel* 'query' bevat.
 */
export async function fetchSearch(
  input: FreeSearchInput | ChipSearchInput
): Promise<SearchResponse | SearchError> {
  try {
    const res = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { ok: false, error: errorData.error || `HTTP error ${res.status}` };
    }

    // De backend route /api/search stuurt de Europeana-respons direct door
    const data = await res.json();

    // We verpakken het in ons 'ok: true' formaat
    return { ok: true, data: data };
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Netwerkfout' };
  }
}

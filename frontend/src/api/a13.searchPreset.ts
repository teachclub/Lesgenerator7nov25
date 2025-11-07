// De URL van je lokale backend-server
const API_URL = 'http://localhost:8080/api';

// --- Input Types ---
// (Deze moeten overeenkomen met je frontend state/componenten)

export interface PresetInput {
  // Dit is de 'S1' invoer
  term: string;
  tv?: string; // Tijdvak
  ka?: string; // Kenmerkend Aspect

  // Dit zijn de 'S2' filters
  ratio: number; // Percentage (bijv. 0.7 voor 70%)
  max: number; // Maximaal aantal bronnen (bijv. 20)
  filters: string[]; // Bijv. ['alleen tekst', 'spotprent']
}

// --- Output Types ---
// (De backend /api/search-preset stuurt een lijst met bronnen)

export interface PresetSource {
  // Dit is een voorbeeldstructuur, pas aan o.b.v. wat de backend stuurt
  id: string;
  title: string;
  type: string;
  link: string;
  imageUrl?: string;
}

export interface PresetResponse {
  ok: true;
  data: {
    sources: PresetSource[];
    debug?: any; // Eventuele debug-info van de backend
  };
}

export interface PresetError {
  ok: false;
  error: string | object;
}

// --- API Functie ---

/**
 * Roept de /api/search-preset endpoint aan.
 */
export async function fetchPreset(
  input: PresetInput
): Promise<PresetResponse | PresetError> {
  try {
    const res = await fetch(`${API_URL}/search-preset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { ok: false, error: errorData.error || `HTTP error ${res.status}` };
    }

    const data = await res.json();
    
    // De backend route /api/search-preset stuurt een { ok: true, data: ... } structuur
    if (data.ok) {
      return data as PresetResponse;
    } else {
      return { ok: false, error: data.error || 'Onbekende presetfout' };
    }

  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Netwerkfout' };
  }
}

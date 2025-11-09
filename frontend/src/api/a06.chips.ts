const API_URL = 'http://localhost:8080/api';

export interface Chip {
  label: string;
  kind: string;
  count: number;
}

export interface SortedChips {
  onderwerp: {
    personen: Chip[];
    gebeurtenissen: Chip[];
    plaatsen: Chip[];
    begrippen: Chip[];
  };
}

export interface ChipsResponse {
  ok: true;
  data: {
    chips: SortedChips;
  };
}

export interface ChipsError {
  ok: false;
  error: string | object;
}

export async function fetchChipsWithCounts(
  term: string,
  context?: string
): Promise<ChipsResponse | ChipsError> {
  const input = { term, context };
  try {
    const res = await fetch(`${API_URL}/chips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { ok: false, error: errorData.error || `HTTP error ${res.status}` };
    }

    const data = await res.json();
    if (data.ok) {
      return data as ChipsResponse;
    } else {
      return { ok: false, error: data.error || 'Onbekende chipsfout' };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Netwerkfout' };
  }
}

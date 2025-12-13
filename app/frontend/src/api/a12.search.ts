const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const API_URL = API_BASE ? `${API_BASE}/api` : "/api";

export interface Chip {
  label: string;
  kind: string;
  who?: string[];
  what?: string[];
  where?: string[];
  yearRange?: { from: number | null; to: number | null };
  type?: string[];
}

export interface FreeSearchInput {
  query?: string;
  qf?: string[];
  rows?: number;
  start?: number;
  reusability?: string;
}

export interface ChipSearchInput {
  chips: Chip[];
  rows?: number;
  start?: number;
  reusability?: string;
}

export interface SearchResponse {
  ok: true;
  data: {
    success: boolean;
    itemsCount: number;
    totalResults: number;
    items?: any[];
    facets?: any[];
  };
}

export interface SearchError {
  ok: false;
  error: string | object;
}

export async function fetchSearch(
  input: FreeSearchInput | ChipSearchInput
): Promise<SearchResponse | SearchError> {
  try {
    const res = await fetch(`${API_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { ok: false, error: (errorData as any).error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, data: data };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Netwerkfout" };
  }
}


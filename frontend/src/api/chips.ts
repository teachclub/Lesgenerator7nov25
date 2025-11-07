export type ChipsRequest = { query?: string; tv?: string; ka?: string };
export type ChipsResponse = { ok: boolean; query: string; tv: string; ka: string; count: number; chips: string[] };

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export async function fetchChips(payload: ChipsRequest): Promise<ChipsResponse> {
  const r = await fetch(`${BASE}/api/chips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}


const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export async function search(query: string, limit = 12) {
  const r = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, provider: "europeana", limit })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function searchPreset(query: string, limit = 6, ratio?: { text: number; image: number }) {
  const body: any = { query, limit };
  if (ratio) body.ratio = ratio;
  const r = await fetch(`${BASE}/api/search-preset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}


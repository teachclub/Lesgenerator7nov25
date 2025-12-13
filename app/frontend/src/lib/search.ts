const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const API = API_BASE ? `${API_BASE}/api` : "/api";

export async function search(query: string, limit = 12) {
  const r = await fetch(`${API}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, provider: "europeana", limit }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function searchPreset(
  query: string,
  limit = 6,
  ratio?: { text: number; image: number }
) {
  const body: any = { query, limit };
  if (ratio) body.ratio = ratio;

  const r = await fetch(`${API}/search-preset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}


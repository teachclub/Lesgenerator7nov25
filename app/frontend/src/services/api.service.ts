const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const API_BASE_URL = API_BASE ? `${API_BASE}/api` : "/api";

export const fetchSearchResults = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
  return response.json();
};

export const scrapeHitUrl = async (url: string) => {
  const response = await fetch(`${API_BASE_URL}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url }),
  });
  if (!response.ok) throw new Error(`HTTP error! ${response.status}`);

  const data = await response.json();
  return data;
};


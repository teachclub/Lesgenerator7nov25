const API_BASE_URL = 'http://localhost:8080/api';

export const fetchSearchResults = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
  return response.json();
};

export const scrapeHitUrl = async (url: string) => {
  const response = await fetch(`${API_BASE_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url }),
  });
  if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
  
  const data = await response.json();
  // We returnen het hele object { fullText, imageUrl }
  return data; 
};

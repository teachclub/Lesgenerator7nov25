// frontend/src/api/chips.ts
export async function fetchChips(payload: {term:string; context?:string; limit?:number}) {
  const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
  const res = await fetch(`${base}/api/chips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Belangrijk: stuur cookies mee (matcht backend corsOptions)
    credentials: "include",
    mode: "cors",
  });
  if (!res.ok) throw new Error(`chips ${res.status}`);
  return res.json() as Promise<{ ok:boolean; model:string; chips:any[] }>;
}

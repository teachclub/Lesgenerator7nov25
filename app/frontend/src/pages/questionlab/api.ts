export function asString(x: any): string {
  return typeof x === "string" ? x : x == null ? "" : String(x);
}

export function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export async function postJson(path: string, body: any, signal?: AbortSignal) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const t = await r.text();

  if (!r.ok) {
    const j = safeJsonParse(t);
    const msg = j?.error || j?.message || t || `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return safeJsonParse(t) ?? {};
}


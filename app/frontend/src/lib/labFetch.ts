import { logEvent } from "./labDebugStore";

export async function labFetch(url: string, options: RequestInit = {}) {
  const id = "LAB-" + Math.random().toString(16).slice(2, 6);
  const t0 = performance.now();

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "X-LAB-ID": id
      }
    });

    const ms = Math.round(performance.now() - t0);
    logEvent({ id, at: Date.now(), endpoint: url, ok: res.ok, ms });

    return res;
  } catch (e: any) {
    const ms = Math.round(performance.now() - t0);
    logEvent({
      id,
      at: Date.now(),
      endpoint: url,
      ok: false,
      ms,
      error: e.message
    });
    throw e;
  }
}


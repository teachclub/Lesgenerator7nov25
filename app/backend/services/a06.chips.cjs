"use strict";

// services/a06.chips.cjs
// Service voor het genereren van "chips" (zoektermen) — NL-only

const MODEL_CHIPS = () => process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash-lite";
const API_KEY = () => process.env.GEMINI_API_KEY;

async function callGeminiApi(prompt, modelToUse) {
  if (!API_KEY()) {
    console.error("[A06 Service] Fout: GEMINI_API_KEY ontbreekt.");
    return { ok: false, status: 400, data: { error: "GEMINI_API_KEY ontbreekt" } };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY(),
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json();
      console.error(`[A06 Service] HTTP Fout ${res.status}:`, JSON.stringify(errorData));
      return { ok: false, status: res.status, data: errorData };
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { ok: true, status: 200, data: String(rawText) };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error && error.name === "AbortError") {
      return { ok: false, status: 408, data: { error: "Request timeout (15s)" } };
    }
    console.error("[A06 Service] Onverwachte Fout:", error);
    return { ok: false, status: 500, data: { error: error?.message || "Onbekende fout" } };
  }
}

function uniq(arr) {
  const seen = new Set();
  const out = [];
  for (const x of Array.isArray(arr) ? arr : []) {
    const s = String(x || "").trim();
    const k = s.toLowerCase();
    if (!s) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/**
 * Vraagt Gemini om extra zoektermen in het NEDERLANDS.
 * Eigennamen mogen officieel blijven (NSDAP, Gestapo, Rijksdagbrand).
 * Maar géén generieke Engelse termen ("World War II") → dat moet "Tweede Wereldoorlog" zijn.
 */
async function expandKeywordsWithGemini({ tvLabel, kaLabels, baseKeywords }) {
  const prompt = `
Je bent een historische zoekassistent voor bronnenzoektocht (Nederlands).
Context:
- Tijdvak: ${tvLabel}
- Kenmerkende Aspecten: ${kaLabels.join(", ")}
- Basiszoekwoorden: ${baseKeywords.join(", ")}

TAAK:
Geef maximaal 12 extra relevante zoektermen in het NEDERLANDS.
Regels:
- GEEN Engels.
- GEEN uitleg.
- Alleen termen, 1 per regel.
Voorbeelden: "Weimarrepubliek", "Rijksdagbrand", "noodverordeningen", "propaganda", "antisemitisme", "Kristallnacht", "Neurenberger rassenwetten", "Anschluss", "dictatuur", "nationaalsocialisme".

OUTPUT:
Alleen de termen.
  `.trim();

  const result = await callGeminiApi(prompt, MODEL_CHIPS());
  if (!result.ok) throw new Error(result.data?.error || "Gemini-aanroep mislukt");

  const text = String(result.data || "");
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-*•\d.\s]+/, "").trim())
    .filter(Boolean);

  return uniq(lines).slice(0, 12);
}

module.exports = {
  expandKeywordsWithGemini,
};


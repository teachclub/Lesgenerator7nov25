// services/a06.chips.cjs
// Service voor het genereren van "chips" (zoektermen)

const MODEL_CHIPS = () => process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash-lite";
const API_KEY = () => process.env.GEMINI_API_KEY;

// Lokale, robuuste Gemini-aanroeper
async function callGeminiApi(prompt, modelToUse) {
  if (!API_KEY()) {
    console.error("[A06 Service] Fout: GEMINI_API_KEY ontbreekt.");
    return { ok: false, status: 400, data: { error: "GEMINI_API_KEY ontbreekt" } };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY(),
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // Geen JSON-respons nodig, alleen tekst
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
    const rawText = data.candidates[0].content.parts[0].text;
    return { ok: true, status: 200, data: rawText };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { ok: false, status: 408, data: { error: "Request timeout (15s)" } };
    }
    console.error("[A06 Service] Onverwachte Fout:", error);
    return { ok: false, status: 500, data: { error: error.message } };
  }
}

/**
 * Vraagt Gemini om extra, Engelstalige/internationale zoektermen.
 */
async function expandKeywordsWithGemini({ tvLabel, kaLabels, baseKeywords }) {
  const prompt = `
Je bent een historische zoekassistent voor de Europeana-database.
Tijdvak: ${tvLabel}
Kenmerkende Aspecten: ${kaLabels.join(", ")}
Basiszoekwoorden (Nederlands): ${baseKeywords.join(", ")}

Geef maximaal 10 extra relevante zoektermen (namen, plaatsen, gebeurtenissen, begrippen)
in het Engels of internationale schrijfwijze, gescheiden per regel.
Geen uitleg, alleen de termen.
  `.trim();

  const result = await callGeminiApi(prompt, MODEL_CHIPS());

  if (!result.ok) {
    throw new Error(result.data.error || "Gemini-aanroep mislukt");
  }

  const text = result.data;
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-*•\d.\s]+/, "").trim()) // Verwijder bullets
    .filter(Boolean);

  return lines;
}

module.exports = {
  expandKeywordsWithGemini,
};

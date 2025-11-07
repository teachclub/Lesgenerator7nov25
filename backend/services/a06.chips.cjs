// Environment variabelen ophalen
const MODEL = () => process.env.GEMINI_MODEL_CHIPS || "gemini-1.5-flash-latest";
const API_KEY = () => process.env.GEMINI_API_KEY;

// Het correcte 'v1beta' eindpunt
const ENDPOINT = () => `https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`;

/**
 * Bouwt de prompt voor de Gemini API.
 */
function buildPrompt(term, context, limit = 10) {
  return [
    {
      role: "user",
      parts: [
        {
          text: `Je bent een Europeana chips-generator. Geef een JSON-array (en alleen dat) met max ${limit} items.
Elk item:
{
  "label": "...",
  "kind": "person|concept|event|place|work|type",
  "who": [...],
  "what": [...],
  "where": [...],
  "yearRange": {"from": null|YYYY, "to": null|YYYY},
  "type": ["IMAGE","TEXT","VIDEO","SOUND"]
}
Context: ${context || "-"}
Zoekterm: ${term}

Let op:
- Strict JSON (geen uitleg).
- Velden mogen leeg array zijn, maar moeten bestaan.
- yearRange mag null/number bevatten.
- Koppel aan Europeana-terminologie indien logisch (who/what/where/type).`,
        },
      ],
    },
  ];
}

/**
 * De daadwerkelijke call naar de Gemini REST API.
 */
async function callGemini(term, context, limit = 10) {
  if (!API_KEY()) {
    console.error("[Gemini] Fout: GEMINI_API_KEY ontbreekt.");
    return { ok: false, status: 400, data: { error: "GEMINI_API_KEY ontbreekt" } };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout

  try {
    const res = await fetch(ENDPOINT(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY(),
      },
      body: JSON.stringify({
        contents: buildPrompt(term, context, limit),
        // Configuratie voor consistente JSON-output
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Als Google een HTTP-fout retourneert (bijv. 400, 404, 500)
      const errorData = await res.json();
      console.error(`[Gemini] HTTP Fout ${res.status}:`, JSON.stringify(errorData));
      return { ok: false, status: res.status, data: errorData };
    }

    const data = await res.json();

    // Haal de rauwe tekst (die JSON *zou moeten* zijn) uit het antwoord
    // Controleer of de structuur geldig is
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
      console.error("[Gemini] Fout: Ongeldige responsstructuur van API:", JSON.stringify(data));
      return { ok: false, status: 500, data: { error: "Ongeldige responsstructuur van Gemini API" } };
    }
    
    const rawText = data.candidates[0].content.parts[0].text;
    const chips = JSON.parse(rawText); // Parse de JSON-string

    return {
      ok: true,
      status: 200,
      data: {
        model: MODEL(),
        chips: chips,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("[Gemini] Fout: Request timed out (30s)");
      return { ok: false, status: 408, data: { error: "Request timeout" } };
    }
    
    // Vang andere fouten op (bijv. netwerkfout, JSON.parse fout)
    console.error("[Gemini] Onverwachte Fout:", error);
    return { ok: false, status: 500, data: { error: error.message } };
  }
}

// Exporteer alleen de functie die de router nodig heeft.
// Er wordt hier GEEN code uitgevoerd, wat de crash bij het opstarten voorkomt.
module.exports = {
  callGemini,
};

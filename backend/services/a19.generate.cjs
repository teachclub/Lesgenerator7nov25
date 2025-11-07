// Environment variabelen ophalen
const MODEL_PROPOSALS = () => process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash"; // Snel voor voorstellen
const MODEL_LESSON = () => "gemini-2.5-pro"; // Krachtiger model voor de definitieve les
const API_KEY = () => process.env.GEMINI_API_KEY;

// Helper om de API aan te roepen
async function callGeminiApi(prompt, modelToUse) {
  if (!API_KEY()) {
    console.error("[A19 Service] Fout: GEMINI_API_KEY ontbreekt.");
    return { ok: false, status: 400, data: { error: "GEMINI_API_KEY ontbreekt" } };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent`;
  const controller = new AbortController();
  // Geef deze langere taken meer tijd: 90 seconden
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY(),
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json", // We willen JSON terug
          temperature: 0.3,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json();
      console.error(`[A19 Service] HTTP Fout ${res.status}:`, JSON.stringify(errorData));
      return { ok: false, status: res.status, data: errorData };
    }

    const data = await res.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonData = JSON.parse(rawText);

    return { ok: true, status: 200, data: jsonData };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { ok: false, status: 408, data: { error: "Request timeout (90s)" } };
    }
    console.error("[A19 Service] Onverwachte Fout:", error);
    return { ok: false, status: 500, data: { error: error.message } };
  }
}

/**
 * STAP 1: Genereer 3 lesvoorstellen
 */
async function generateProposals(sources) {
  // Converteer de bronnenlijst naar een simpele tekst voor de prompt
  const sourceListText = sources.map((src, i) =>
    `Bron ${i + 1} (Titel): ${src.title}\nBron ${i + 1} (Type): ${src.type}\nBron ${i + 1} (Link): ${src.link}\n---`
  ).join('\n');

  const prompt = `
Je bent een expert in geschiedenisdidactiek.
Genereer 3 unieke lesvoorstellen op basis van de volgende bronnenlijst.

Regels:
1. Geef ANTWOORD in een strict JSON-object: { "proposals": [...] }.
2. Elk object in de array moet de structuur hebben: { "id": "voorstel_1", "title": "...", "mainQuestion": "...", "studentJudgment": "..." }.
3. 'mainQuestion' is de hoofdvraag voor de les.
4. 'studentJudgment' is een kort 'leerlingoordeel' (max 2 zinnen) vanuit een presentistisch perspectief (bijv. "Waarom deden ze niet gewoon...?", "Dit is toch oneerlijk?").

Bronnenlijst:
${sourceListText}

Genereer nu de 3 lesvoorstellen in het gevraagde JSON-formaat.
`;

  return callGeminiApi(prompt, MODEL_PROPOSALS());
}

/**
 * STAP 2: Genereer de volledige les
 */
async function generateLesson(chosenProposal, sources) {
  // Maak de bronnenlijst met links
  const sourceListText = sources.map((src, i) =>
    `Bron ${i + 1}: ${src.title} (Type: ${src.type}). Beschikbaar op: ${src.link}`
  ).join('\n');

  // Maak een string van het gekozen voorstel
  const proposalText = `Gekozen lesvoorstel:\nTitel: ${chosenProposal.title}\nHoofdvraag: ${chosenProposal.mainQuestion}\nLeerlingoordeel: ${chosenProposal.studentJudgment}`;

  const prompt = `
Je bent een expert in geschiedenisdidactiek.
Genereer een volledig, uitgeschreven lesplan (in Markdown-formaat) op basis van het gekozen voorstel en de bronnenlijst.

Strikte Instructies:
1. Geef ANTWOORD in een strict JSON-object: { "lessonMarkdown": "..." }.
2. Het 'lessonMarkdown' veld moet de volledige les bevatten.
3. De les moet (buitenlandse) bronnen bevatten. VERTAAL relevante citaten of beschrijvingen van deze buitenlandse bronnen naar het Nederlands.
4. De les moet eindigen met een sectie genaamd "## Bronnen", met daarin de volledige 'Bronnenlijst' (inclusief de klikbare links).

Gekozen Voorstel:
${proposalText}

Bronnenlijst (voor gebruik in de les en voor de bronnensectie):
${sourceListText}

Genereer nu het lesplan in het gevraagde JSON-formaat.
`;

  return callGeminiApi(prompt, MODEL_LESSON());
}

// Exporteer de functies die de router nodig heeft
module.exports = {
  generateProposals,
  generateLesson,
};

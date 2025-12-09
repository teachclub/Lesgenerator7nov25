"use strict";

const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_ID = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

function pickApiKey() {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.API_KEY;

  if (!key) {
    throw new Error(
      "[Gemini] Geen API key gevonden. Zet GEMINI_API_KEY of GOOGLE_API_KEY in backend/.env"
    );
  }
  return key;
}

const apiKey = pickApiKey();
const client = new GoogleGenerativeAI(apiKey);
const model = client.getGenerativeModel({ model: MODEL_ID });

/**
 * Ruwe call naar Gemini → geeft alleen de tekst terug.
 */
async function callGemini({ label = "Gemini", meta = {}, prompt }) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error(`[${label}] callGemini: prompt ontbreekt of is geen string`);
  }

  console.log(`[Gemini] (${label}) model=${MODEL_ID}`);
  const startedAt = Date.now();

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const ms = Date.now() - startedAt;
    const response = result && result.response;
    const text =
      response && typeof response.text === "function" ? response.text() : "";

    console.log(
      `[Gemini] (${label}) klaar in ${ms}ms; lengte output ≈ ${
        text ? text.length : 0
      }`
    );

    return { text, meta, raw: result };
  } catch (err) {
    console.error(`[Gemini] (${label}) FOUT bij generateContent`, err);
    throw err;
  }
}

/**
 * Probeert uit willekeurige Gemini-tekst een geldig JSON-object te halen.
 * Strategie:
 * 1. Pure JSON: hele string = { ... }
 * 2. ```json ... ``` of ``` ... ``` blok
 * 3. Substring tussen eerste '{' en laatste '}'
 * 4. Anders: null
 */
function extractJsonObjectFromText(text, label = "Gemini") {
  if (!text || typeof text !== "string") return null;

  const original = text;
  let t = text.trim();

  // 1) Pure JSON?
  if (t.startsWith("{") && t.endsWith("}")) {
    try {
      return JSON.parse(t);
    } catch (e) {
      console.warn(
        `[${label}] JSON.parse fout op pure blok, probeer andere strategieën`
      );
    }
  }

  // 2) Fenced code block met ```json of ```?
  const fencedJsonRegex = /```json\s*([\s\S]*?)```/i;
  const fencedAnyRegex = /```\s*([\s\S]*?)```/;

  let match = fencedJsonRegex.exec(original);
  if (!match) {
    match = fencedAnyRegex.exec(original);
  }

  if (match && match[1]) {
    const candidate = match[1].trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      try {
        return JSON.parse(candidate);
      } catch (e) {
        console.warn(
          `[${label}] JSON.parse fout op fenced blok, ga door naar brute-force`
        );
      }
    }
  }

  // 3) Brute-force: alles tussen eerste '{' en laatste '}'.
  const firstBrace = original.indexOf("{");
  const lastBrace = original.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = original.slice(firstBrace, lastBrace + 1).trim();
    try {
      return JSON.parse(candidate);
    } catch (e) {
      console.warn(
        `[${label}] JSON.parse fout op brute-force blok; geef null terug`
      );
    }
  }

  // 4) Geen bruikbaar JSON-object gevonden
  console.warn(
    `[${label}] extractJsonObjectFromText: geen geldig JSON-object gevonden`
  );
  return null;
}

/**
 * Hoofdfunctie: wordt gebruikt door routes (proposals, step1/2/3/4).
 * - Roept Gemini
 * - Probeert JSON te extraheren
 * - Gooit een duidelijke error als er geen geldig object is
 */
async function runGeminiAndParse({ label = "Gemini", meta = {}, prompt }) {
  const { text } = await callGemini({ label, meta, prompt });

  const json = extractJsonObjectFromText(text, label);

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    const err = new Error(
      `[${label}] response is geen geldig JSON-object (zie err.rawText voor inspectie)`
    );
    err.rawText = text;
    err.meta = meta;
    throw err;
  }

  return json;
}

module.exports = {
  callGemini,
  runGeminiAndParse,
  extractJsonObjectFromText,
};


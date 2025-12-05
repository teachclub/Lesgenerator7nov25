// services/gemini.cjs
// Centrale Gemini-service voor LesGo v2
// - init Gemini-model
// - extractJson met fences
// - runGeminiAndParse met betere logging & foutcodes

const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL_CHIPS || "gemini-2.5-flash-lite";

if (!API_KEY) {
  console.warn("[Gemini] GOOGLE_API_KEY ontbreekt – Gemini werkt niet.");
}

let genAI = null;
let model = null;

function getModel() {
  if (!API_KEY) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(API_KEY);
    console.log("[Gemini] GoogleGenerativeAI instance aangemaakt");
  }
  if (!model) {
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log("[Gemini] Model geladen:", MODEL_NAME);
  }
  return model;
}

function extractJson(text, label) {
  if (!text) {
    throw new Error(`Lege Gemini-output (${label})`);
  }

  let cleaned = text.trim();

  // Code fences verwijderen
  if (cleaned.startsWith("```")) {
    const firstFence = cleaned.indexOf("```");
    const secondFence = cleaned.indexOf("```", firstFence + 3);
    if (secondFence !== -1) {
      cleaned = cleaned.slice(firstFence + 3, secondFence).trim();
    }
    if (cleaned.toLowerCase().startsWith("json")) {
      cleaned = cleaned.slice(4).trim();
    }
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Geen geldig JSON-object gevonden in ${label}`);
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("[Gemini] JSON parse error", {
      label,
      message: err.message,
      jsonSnippet: jsonText.slice(0, 200),
    });
    throw new Error(`JSON parse fout in ${label}: ${err.message}`);
  }
}

/**
 * Roept Gemini aan en geeft PARSED JSON terug.
 * Gooit errors met duidelijke message, incl. label.
 */
async function runGeminiAndParse({ prompt, label, meta = {} }) {
  const mdl = getModel();
  if (!mdl) {
    throw new Error("Geen Gemini-model beschikbaar (API-key ontbreekt).");
  }

  console.log(`[Gemini][${label}] Call start`, {
    hasPrompt: !!prompt,
    promptLength: prompt ? prompt.length : 0,
    ...meta,
  });

  try {
    const result = await mdl.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result?.response?.text();
    console.log(`[Gemini][${label}] Raw response length`, text ? text.length : 0);

    const json = extractJson(text, label);

    if (!json || typeof json !== "object") {
      throw new Error(`Ongeldige JSON-structuur in ${label}`);
    }

    console.log(`[Gemini][${label}] JSON OK`, {
      keys: Object.keys(json),
    });

    return json;
  } catch (err) {
    console.error(`[Gemini][${label}] ERROR`, {
      message: err.message,
      stack: err.stack,
      ...meta,
    });
    throw err;
  }
}

module.exports = {
  runGeminiAndParse,
};


"use strict";

/*
  Doel:
  - Gemini mag NOOIT de backend laten crashen bij startup als er geen API key is.
  - Alleen routes die Gemini echt aanroepen, mogen op dat moment een nette fout krijgen.

  Dit bestand exporteert meerdere aliassen (generate / generateText / askGemini)
  zodat bestaande code vrijwel zeker blijft werken.
*/

function pickApiKey() {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return k && String(k).trim() ? String(k).trim() : "";
}

function hasGeminiKey() {
  return !!pickApiKey();
}

function keyError() {
  return new Error(
    "[Gemini] Geen API key gevonden. Zet GEMINI_API_KEY of GOOGLE_API_KEY in app/backend/.env"
  );
}

/*
  Lazy import: pas laden als je 'm echt gebruikt.
  (Zo blijft QL03/Kleio/CITO gewoon draaien zonder key.)
*/
async function getClient() {
  const apiKey = pickApiKey();
  if (!apiKey) throw keyError();

  let mod;
  try {
    mod = await import("@google/generative-ai");
  } catch (e) {
    const msg = e?.message ? String(e.message) : String(e);
    throw new Error("[Gemini] Package @google/generative-ai ontbreekt of faalt: " + msg);
  }

  const { GoogleGenerativeAI } = mod;
  if (!GoogleGenerativeAI) {
    throw new Error("[Gemini] GoogleGenerativeAI export niet gevonden in @google/generative-ai");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

/*
  Basale generator. Houd het bewust generiek + tolerant.
  Callers kunnen string prompt meegeven of object met opties.
*/
async function generate(input, options) {
  const opts = options && typeof options === "object" ? options : {};
  const modelName = opts.model || "gemini-1.5-flash";

  const prompt =
    typeof input === "string"
      ? input
      : input && typeof input === "object"
      ? String(input.prompt || input.text || "")
      : "";

  if (!prompt.trim()) {
    throw new Error("[Gemini] generate(): prompt ontbreekt/empty");
  }

  const genAI = await getClient();
  const model = genAI.getGenerativeModel({ model: modelName });

  const resp = await model.generateContent(prompt);
  const text = resp?.response?.text ? resp.response.text() : "";
  return { text: String(text || ""), raw: resp };
}

/*
  Aliassen (compat):
*/
async function generateText(prompt, options) {
  const r = await generate(prompt, options);
  return r.text;
}

async function askGemini(prompt, options) {
  return generateText(prompt, options);
}

module.exports = {
  hasGeminiKey,
  pickApiKey,
  getClient,
  generate,
  generateText,
  askGemini,
};


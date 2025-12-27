"use strict";

const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY mist in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const MODEL_MAIN = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const model = genAI.getGenerativeModel({ model: MODEL_MAIN });

console.log(`[a05.gemini] Gemini Service geladen. Model: ${MODEL_MAIN}`);

function stripCodeFences(s) {
  return String(s || "").replace(/```json/gi, "").replace(/```/g, "").trim();
}

function withTimeout(promise, ms, label) {
  const t = Number(ms);
  if (!Number.isFinite(t) || t <= 0) return promise;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`Gemini timeout na ${t}ms (${label || "?"})`));
      }, t);
    }),
  ]);
}

async function getGeminiSuggestions(prompt, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs || process.env.GEMINI_TIMEOUT_MS || 20000);

  const promptText = String(prompt || "");
  const len = promptText.length;

  const started = Date.now();
  console.log(`[a05.gemini] BEGIN len=${len} timeoutMs=${timeoutMs}`);

  try {
    const result = await withTimeout(
      model.generateContent([promptText]),
      timeoutMs,
      "a05.generateContent"
    );

    const response = await result.response;
    const text = await response.text();

    const ms = Date.now() - started;
    console.log(`[a05.gemini] END ms=${ms} outLen=${String(text || "").length}`);

    return stripCodeFences(text);
  } catch (err) {
    const ms = Date.now() - started;
    console.error(`[a05.gemini] ERR ms=${ms}`, err && err.message ? err.message : err);
    throw new Error(`Gemini API-fout: ${err && err.message ? err.message : "onbekende fout"}`);
  }
}

module.exports = {
  getGeminiSuggestions,
};


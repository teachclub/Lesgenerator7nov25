"use strict";

/*
  Doel:
  - Geen crash bij startup zonder key.
  - Harde timeouts op: import, client, generateContent.
  - Compat exports: generate / generateText / askGemini + runGeminiAndParse
*/

function pickApiKey() {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return k && String(k).trim() ? String(k).trim() : "";
}

function hasGeminiKey() {
  return !!pickApiKey();
}

function keyError() {
  return new Error("[Gemini] Geen API key gevonden. Zet GEMINI_API_KEY of GOOGLE_API_KEY in app/backend/.env");
}

function withTimeout(promise, ms, label) {
  const timeoutMs = Number(ms);
  const safeMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000;

  let timer = null;
  const t = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`[Gemini] Timeout na ${safeMs}ms (${label || "call"})`)), safeMs);
  });

  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    t,
  ]);
}

function extractJsonBlock(s) {
  const text = String(s || "");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1).trim();
  return "";
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function getClient(timeoutMs) {
  const apiKey = pickApiKey();
  if (!apiKey) throw keyError();

  const importMs = Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : 20000;
  const importPromise = import("@google/generative-ai");
  const mod = await withTimeout(importPromise, Math.min(5000, importMs), "import @google/generative-ai");

  const { GoogleGenerativeAI } = mod;
  if (!GoogleGenerativeAI) {
    throw new Error("[Gemini] GoogleGenerativeAI export niet gevonden in @google/generative-ai");
  }

  return new GoogleGenerativeAI(apiKey);
}

async function generate(input, options) {
  const opts = options && typeof options === "object" ? options : {};
  const timeoutMs = Number.isFinite(Number(opts.timeoutMs))
    ? Number(opts.timeoutMs)
    : Number.isFinite(Number(process.env.GEMINI_TIMEOUT_MS))
      ? Number(process.env.GEMINI_TIMEOUT_MS)
      : 20000;

  const modelName = opts.model || process.env.GEMINI_MODEL || "gemini-1.0-pro";

  const prompt =
    typeof input === "string"
      ? input
      : input && typeof input === "object"
        ? String(input.prompt || input.text || "")
        : "";

  if (!prompt.trim()) throw new Error("[Gemini] generate(): prompt ontbreekt/empty");

  const genAI = await withTimeout(getClient(timeoutMs), Math.min(5000, timeoutMs), "getClient");
  const model = genAI.getGenerativeModel({ model: modelName });

  const resp = await withTimeout(model.generateContent(prompt), timeoutMs, "generateContent");
  const text = resp?.response?.text ? resp.response.text() : "";
  return { text: String(text || ""), raw: resp, model: modelName };
}

async function generateText(prompt, options) {
  const r = await generate(prompt, options);
  return r.text;
}

async function askGemini(prompt, options) {
  return generateText(prompt, options);
}

async function runGeminiAndParse(args) {
  const a = args && typeof args === "object" ? args : {};
  const prompt = String(a.prompt || "");
  const label = String(a.label || "gemini");
  const model = a.model || process.env.GEMINI_MODEL || "gemini-1.0-pro";
  const timeoutMs = Number.isFinite(Number(a.timeoutMs))
    ? Number(a.timeoutMs)
    : Number.isFinite(Number(process.env.GEMINI_TIMEOUT_MS))
      ? Number(process.env.GEMINI_TIMEOUT_MS)
      : 20000;

  if (!prompt.trim()) throw new Error("[Gemini] runGeminiAndParse(): prompt ontbreekt/empty");

  const text = await generateText(prompt, { model, timeoutMs });

  const direct = safeJsonParse(text);
  if (direct && typeof direct === "object") return direct;

  const block = extractJsonBlock(text);
  const parsed = safeJsonParse(block);
  if (parsed && typeof parsed === "object") return parsed;

  const preview = text.slice(0, 600);
  throw new Error(`[Gemini] JSON parse faalde (${label}). Eerste 600 chars:\n${preview}`);
}

module.exports = {
  hasGeminiKey,
  pickApiKey,
  getClient,
  generate,
  generateText,
  askGemini,
  runGeminiAndParse,
};


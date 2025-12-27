"use strict";

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function stripCodeFences(s) {
  return String(s || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function sliceLargestJsonBlock(cleaned) {
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) return cleaned.slice(first, last + 1);
  return cleaned;
}

async function callGeminiGenerateContent({ prompt, timeoutMs, label }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY mist in .env");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const ms = Number(timeoutMs);
  const hardTimeout = Number.isFinite(ms) && ms > 0 ? ms : 20000;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), hardTimeout);

  const startedAt = Date.now();
  const pLen = String(prompt || "").length;
  console.log(`[gemini.http] BEGIN label=${label || "?"} model=${model} len=${pLen} timeoutMs=${hardTimeout}`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: String(prompt || "") }] }],
      }),
      signal: controller.signal,
    });

    const txt = await res.text();
    const msUsed = Date.now() - startedAt;

    if (!res.ok) {
      console.log(`[gemini.http] HTTP_ERR status=${res.status} ms=${msUsed}`);
      throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 800)}`);
    }

    let data = safeJsonParse(txt);
    if (!data) throw new Error(`Gemini response geen JSON: ${txt.slice(0, 800)}`);

    const parts = data?.candidates?.[0]?.content?.parts;
    const raw = Array.isArray(parts) ? parts.map((p) => p?.text || "").join("") : "";
    const out = String(raw || "").trim();

    console.log(`[gemini.http] END ok ms=${msUsed} outLen=${out.length}`);
    return out;
  } catch (e) {
    const msUsed = Date.now() - startedAt;
    const isAbort = e && (e.name === "AbortError" || String(e.message || "").toLowerCase().includes("abort"));
    console.log(`[gemini.http] FAIL ms=${msUsed} abort=${isAbort ? "yes" : "no"} msg=${String(e?.message || e)}`);
    if (isAbort) throw new Error(`Gemini timeout na ${hardTimeout}ms (${label || "?"})`);
    throw e;
  } finally {
    clearTimeout(id);
  }
}

async function runGeminiAndParse({ label, meta, prompt, timeoutMs }) {
  const raw = await callGeminiGenerateContent({ prompt, timeoutMs, label });

  const cleaned = stripCodeFences(raw);
  const direct = safeJsonParse(cleaned);
  if (direct) return direct;

  const sliced = sliceLargestJsonBlock(cleaned);
  const j2 = safeJsonParse(sliced);
  if (j2) return j2;

  throw new Error(
    `[gemini.parse] Kon geen JSON parsen (${label || "?"}).\n--- RAW START ---\n${cleaned.slice(0, 1200)}\n--- RAW END ---`
  );
}

module.exports = { runGeminiAndParse };


const express = require("express");
const router = express.Router();

const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL_CHIPS || "models/gemini-2.5-flash";
const MAX_OUT = parseInt(process.env.CHIPS_MAX_OUTPUT_TOKENS || "256", 10);

async function geminiGenerateJSON(prompt) {
  if (!API_KEY) return { ok: false, status: 400, error: "GEMINI_API_KEY missing" };
  const url = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: MAX_OUT, temperature: 0.3 }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: (json?.error?.message || "Gemini error") };
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { ok: true, status: res.status, text };
}

function buildPrompt(term, context, limit) {
  return [
    `Taak: genereer ${limit} zoeksuggesties ("chips") voor historisch archief-zoeken.`,
    `Entiteit/onderwerp: ${term}`,
    context ? `Context: ${context}` : ``,
    ``,
    `Eisen:`,
    `- Alleen unieke, concrete historische entiteiten/ gebeurtenissen/ documenten/ sleutelconcepten.`,
    `- Vermijd generieke termen; geef specifieke items (bv. "Rijksdag van Worms 1521", "Vrede van Augsburg 1555", "Frederik de Wijze", "Sola Scriptura", "95 stellingen").`,
    `- Output strikt als JSON array van strings, zonder extra tekst.`
  ].join("\n");
}

router.get("/api/chips/ping", async (req, res) => {
  try {
    if (!API_KEY) return res.json({ ok: false, error: "GEMINI_API_KEY missing" });
    const r = await geminiGenerateJSON(`Return ["pong"] as pure JSON array.`);
    if (!r.ok) return res.json({ ok: false, error: r.error, status: r.status });
    let parsed = [];
    try { parsed = JSON.parse(r.text); } catch { parsed = []; }
    return res.json({ ok: Array.isArray(parsed) && parsed.includes("pong"), model: MODEL, raw: r.text });
  } catch (e) {
    return res.json({ ok: false, error: String(e) });
  }
});

router.post("/api/chips", async (req, res) => {
  try {
    const { term, context = "", limit = 10 } = req.body || {};
    if (!term || typeof term !== "string") return res.status(400).json({ ok: false, error: "term is required (string)" });
    const lim = Math.max(3, Math.min(20, parseInt(limit, 10) || 10));
    const prompt = buildPrompt(term, context, lim);
    const r = await geminiGenerateJSON(prompt);
    if (!r.ok) return res.status(502).json({ ok: false, source: "gemini", error: r.error, status: r.status });

    let chips = [];
    try { chips = JSON.parse(r.text); } catch {
      const m = r.text.match(/\[[\s\S]*\]/);
      if (m) { try { chips = JSON.parse(m[0]); } catch { chips = []; } }
    }
    if (!Array.isArray(chips)) chips = [];
    chips = chips.map(s => (typeof s === "string" ? s.trim() : "")).filter(Boolean).slice(0, lim);

    return res.json({ ok: true, source: "gemini", model: MODEL, chips });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = router;


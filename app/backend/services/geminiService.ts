// Bestand: app/backend/services/geminiService.ts
// Gemini prompt-runner met debugoutput + JSON parsing

import fetch from 'node-fetch';

const GEMINI_API_URL = 'http://127.0.0.1:8081/api/gemini'; // pas aan indien anders

export async function runGeminiAndParse(prompt: string, input: any): Promise<any[]> {
  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, input })
  });

  const text = await res.text();

  // Debug: toon ruwe output als parse faalt
  try {
    const parsed = JSON.parse(text);
    return parsed || [];
  } catch (e) {
    console.error('❌ Gemini output geen geldige JSON:\n', text);
    return [];
  }
}


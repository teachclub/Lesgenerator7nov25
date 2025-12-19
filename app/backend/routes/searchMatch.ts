// Bestand: app/backend/routes/searchMatch.ts
// Stap 3 van 3 — backend route: search → Gemini-snippets → Gemini-fulltext → top5

import express from 'express';
import { runGeminiAndParse } from '../services/geminiService';
import { fetchSearchResults, fetchFullText } from '../services/sourceService';

const router = express.Router();

router.post('/api/search-match', async (req, res) => {
  const { deelvraag, subdimensie, tijdvak } = req.body;

  // 1. Brede zoekquery uitvoeren
  const bronnen = await fetchSearchResults(deelvraag, tijdvak); // ±40 bronnen

  // 2. Snippet-rank door Gemini (zonder fulltext)
  const prompt1 = `Je bent docent geschiedenis. Beoordeel per bron of deze helpt bij de deelvraag "${deelvraag}" vanuit de dimensie ${subdimensie}. Geef score 1–5 en motivatie.`;
  const snippetInput = bronnen.map((b) => ({ id: b.id, title: b.title, snippet: b.description || b.snippet, provider: b.provider }));
  const ranked = await runGeminiAndParse(prompt1, { bronnen: snippetInput });

  // 3. Fulltext ophalen van top 10
  const top10 = ranked.slice(0, 10);
  const verrijkt = await Promise.all(top10.map(async (b) => {
    const fullText = await fetchFullText(b.id);
    return { ...b, fullText };
  }));

  // 4. Fulltext-beoordeling door Gemini
  const prompt2 = `Lees elke bron. Beoordeel: 1) welke info helpt bij het beantwoorden van de deelvraag "${deelvraag}", 2) past het binnen ${subdimensie}, 3) zou je deze bron aanbevelen aan leerlingen? Geef eindscore 1–5.`;
  const eindselectie = await runGeminiAndParse(prompt2, { bronnen: verrijkt });

  // 5. Sorteer + splits top 2 (primair) en 3 (aanvullend)
  const top5 = eindselectie.sort((a,b) => b.eindscore - a.eindscore).slice(0,5);
  const gemarkeerd = top5.map((b,i) => ({
    ...b,
    status: i < 2 ? 'aanbevolen' : 'aanvullend'
  }));

  res.json({ bronnen: gemarkeerd });
});

export default router;

const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

function dedupeKeepOrder(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) { if (!seen.has(x) && x && x.trim()) { seen.add(x); out.push(x.trim()); } }
  return out;
}

router.post('/', async (req, res) => {
  const body = req.body || {};
  const q = String(body.query || '').trim();
  const tv = String(body.tv || '').trim();
  const ka = String(body.ka || '').trim();

  const fallback = [
    'politiek','economisch','sociaal','cultureel','religieus','wetenschap/techniek',
    'internationaal','spotprent','affiche','krantenartikel','pamflet','dagboek',
    'brief','kaart','memoires','foto'
  ];

  let chips = [];

  const useOpenAI = !!process.env.USE_OPENAI_ASSOC && !!process.env.OPENAI_API_KEY;

  if (useOpenAI) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const sys = 'Je maakt korte, concrete chip-suggesties (1-2 woorden) voor een geschiedenisles. Geef JSON-lijst.';
      const usr = `Zoekterm: "${q}". Tijdvak: "${tv}". KA: "${ka}". Mix: dimensies (politiek/economisch/sociaal/cultureel/religieus/wetenschap), bronnenvormen (spotprent, affiche, pamflet, krant, dagboek, brief, kaart, foto) en gerelateerde namen/werken/plaatsen. 16 items, uniek, NL. Alleen JSON array.`;
      const r = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
        temperature: 0.2
      });
      let txt = r?.choices?.[0]?.message?.content?.trim() || '';
      if (txt.startsWith('```')) {
        txt = txt.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/,'').trim();
      }
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) chips = parsed.map(String);
    } catch (e) {
      chips = [];
    }
  }

  if (!chips.length) {
    const queryHints = q ? [q, `${q} schilderijen`, `${q} werken`, `${q} tijdgenoten`, `${q} Amsterdam`, `${q} atelier`] : [];
    chips = dedupeKeepOrder([...queryHints, ...fallback]);
  }

  chips = dedupeKeepOrder(chips).slice(0, 16);

  res.json({
    ok: true,
    query: q,
    tv,
    ka,
    count: chips.length,
    chips
  });
});

module.exports = router;


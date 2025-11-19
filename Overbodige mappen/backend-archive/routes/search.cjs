module.exports = (app) => {
  const EUROPEANA_KEY = process.env.EUROPEANA_API_KEY || '';

  app.post('/api/search', async (req, res) => {
    try {
      const { query, provider = 'europeana', limit = 12 } = req.body || {};
      if (!query) return res.status(400).json({ ok: false, error: 'Missing query' });
      if (provider !== 'europeana') return res.status(400).json({ ok: false, error: 'Only provider=europeana supported' });
      if (!EUROPEANA_KEY) return res.status(401).json({ ok: false, error: 'EUROPEANA_API_KEY missing' });

      const rows = Math.max(1, Math.min(50, Number(limit) || 12));
      const url = `https://api.europeana.eu/record/v2/search.json?wskey=${encodeURIComponent(EUROPEANA_KEY)}&query=${encodeURIComponent(query)}&rows=${rows}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(502).json({ ok: false, error: 'Upstream error', status: r.status });
      const data = await r.json();

      const items = (data.items || []).map(it => {
        const titleArr = Array.isArray(it.title) ? it.title : (it.title ? [it.title] : []);
        const title = titleArr[0] || 'Untitled';
        const providerLabel = (it.dataProvider && it.dataProvider[0]) || '';
        const lang = it.language || (it['language'] && it['language'][0]) || null;
        const id = it.id || it.guid || '';
        const europeana_id = id;
        const isImage = Array.isArray(it.type) ? it.type.includes('IMAGE') : (it.type === 'IMAGE');
        const thumb = Array.isArray(it.edmPreview) ? it.edmPreview[0] : null;
        const link = it.guid || (it.link || null);

        return {
          provider: 'europeana',
          title,
          title_original: title,
          url: link || (id ? `https://www.europeana.eu/item${id}` : null),
          snippet: providerLabel,
          lang,
          europeana_id,
          thumbnail: thumb || null,
          type: isImage ? 'IMAGE' : 'TEXT'
        };
      });

      res.json({ ok: true, provider: 'europeana', count: items.length, results: items });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'Server error', message: e.message });
    }
  });

  app.post('/api/search-preset', async (req, res) => {
    try {
      const { query, limit = 6, ratio } = req.body || {};
      if (!query) return res.status(400).json({ ok: false, error: 'Missing query' });

      // haal brede set op (max 30) en bouw preset
      const baseResp = await fetch('http://localhost:8080/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, provider: 'europeana', limit: Math.max(10, limit * 3) })
      });
      if (!baseResp.ok) {
        return res.status(502).json({ ok: false, error: 'Search upstream failed', status: baseResp.status });
      }
      const base = await baseResp.json();
      const all = base.results || [];

      // type-detectie
      const images = all.filter(x => x.type === 'IMAGE');
      const texts = all.filter(x => x.type !== 'IMAGE');

      // default verhouding 1:3 bij limit=6 => 2 image / 4 text.
      const want = Number(limit) || 6;
      const wantImage = ratio && Number(ratio.image) >= 0 ? Number(ratio.image) : Math.round(want * 0.33);
      const wantText = ratio && Number(ratio.text) >= 0 ? Number(ratio.text) : (want - wantImage);

      const pick = (arr, n) => arr.slice(0, Math.max(0, n));
      let chosen = [
        ...pick(texts, wantText),
        ...pick(images, wantImage)
      ].slice(0, want);

      // als tekort in een categorie, vul aan vanuit andere
      if (chosen.length < want) {
        const usedIds = new Set(chosen.map(x => x.europeana_id));
        const remaining = all.filter(x => !usedIds.has(x.europeana_id));
        chosen = chosen.concat(remaining.slice(0, want - chosen.length));
      }

      // minimal preset payload
      const preset = chosen.map(x => ({
        provider: x.provider,
        id: x.europeana_id,
        title: x.title,
        data_provider: x.snippet || null,
        lang: x.lang || null,
        thumbnail: x.thumbnail || null,
        link: x.url || null,
        type: x.type === 'IMAGE' ? 'IMAGE' : 'TEXT'
      }));

      res.json({
        ok: true,
        query,
        count: preset.length,
        ratio: { text: preset.filter(p => p.type !== 'IMAGE').length, image: preset.filter(p => p.type === 'IMAGE').length },
        preset
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'Server error', message: e.message });
    }
  });
};


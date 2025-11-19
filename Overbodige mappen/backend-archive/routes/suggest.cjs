const express = require("express");
const router = express.Router();

router.use(express.json());

router.post("/api/suggest", async (req, res) => {
  try {
    const q =
      (req.body && (req.body.query || req.body.q)) ||
      ((req.body && req.body.tv && req.body.ka) ? `${req.body.tv} KA${req.body.ka}` : "");
    const rows = Math.max(10, Math.min(50, Number(req.body?.rows || 30)));
    const limit = Math.max(1, Math.min(6, Number(req.body?.limit || 6)));

    if (!q) return res.status(400).json({ ok: false, error: "missing_query" });

    const key = process.env.EUROPEANA_API_KEY || "";
    const url = `https://api.europeana.eu/record/v2/search.json?wskey=${encodeURIComponent(
      key
    )}&query=${encodeURIComponent(q)}&rows=${rows}`;

    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ ok: false, error: "upstream_error" });
    const data = await r.json();

    const items = Array.isArray(data?.items) ? data.items : [];
    const seen = new Set();
    const preset = [];
    for (const it of items) {
      const id = it?.id || it?.guid || it?.about || "";
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const title =
        (Array.isArray(it?.title) && it.title[0]) ||
        it?.title ||
        (Array.isArray(it?.edmIsShownAt) && it.edmIsShownAt[0]) ||
        "Ongetiteld";
      const provider =
        (Array.isArray(it?.dataProvider) && it.dataProvider[0]) || it?.dataProvider || "";
      const lang = it?.language || it?.languageDoc || "";
      const thumb =
        (Array.isArray(it?.edmPreview) && it.edmPreview[0]) ||
        (Array.isArray(it?.edmPreviewNoDistribute) && it.edmPreviewNoDistribute[0]) ||
        null;
      preset.push({
        provider: "europeana",
        id,
        title: String(title),
        data_provider: String(provider || ""),
        lang: String(lang || ""),
        thumbnail: thumb,
        link:
          (Array.isArray(it?.edmIsShownAt) && it.edmIsShownAt[0]) ||
          (Array.isArray(it?.guid) && it.guid[0]) ||
          null,
      });
      if (preset.length >= limit) break;
    }

    return res.json({
      ok: true,
      query: q,
      count: preset.length,
      preset,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

module.exports = router;


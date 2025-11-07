const { Router } = require("express");
const { search } = require("../services/a11.europeana.cjs");

const router = Router();
router.post("/api/search-preset", async (req, res) => {
  try {
    const { keywords="*", type="IMAGE", yearFrom, yearTo, country, dataProvider, rows=24 } = req.body || {};
    const qf = [];
    if (type) qf.push(`TYPE:${type}`);
    if (yearFrom && yearTo) qf.push(`YEAR:[${yearFrom} TO ${yearTo}]`);
    if (country) qf.push(`COUNTRY:"${country}"`);
    if (dataProvider) qf.push(`DATA_PROVIDER:"${dataProvider}"`);

    const r = await search({ query: keywords, qf, rows, profile: "rich", media: true });
    res.json({ ok: true, preset: { keywords, qf }, results: { total: r.totalResults ?? 0, items: r.items ?? [] } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
module.exports = router;


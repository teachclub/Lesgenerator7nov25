const { Router } = require("express");
const { search } = require("../services/a11.europeana.cjs");
const { expandTerm, chipsFor } = require("../services/a22.thesaurus.cjs");

const router = Router();
router.post("/api/chat-search", async (req, res) => {
  try {
    const {
      message="",
      keywords=null,
      who=[], what=[], where=[], country=[], dataProvider=[],
      yearRange=null, type=[], rows=24,
      thesaurus=false, execute=false
    } = req.body || {};

    const intent = {
      anchor: message,
      who: Array.isArray(who)? who: [],
      what: Array.isArray(what)? what: [],
      where: Array.isArray(where)? where: [],
      country: Array.isArray(country)? country: [],
      dataProvider: Array.isArray(dataProvider)? dataProvider: [],
      yearRange: yearRange || null,
      type: Array.isArray(type)? type: [],
      negatives: [],
      priority: ["who","YEAR","country","where","TYPE","DATA_PROVIDER"],
      clarify: [],
      confidence: 0.8
    };

    let chips = [];
    if (thesaurus && message) {
      const exp = expandTerm(message);
      if (exp.who) intent.who.push(...exp.who);
      if (exp.what) intent.what.push(...exp.what);
      if (exp.where) intent.where.push(...exp.where);
      chips = chipsFor(message);
    }

    const qf = [];
    intent.who.forEach((v)=> qf.push(`who:"${v}"`));
    intent.what.forEach((v)=> qf.push(`what:"${v}"`));
    intent.where.forEach((v)=> qf.push(`where:"${v}"`));
    intent.country.forEach((v)=> qf.push(`COUNTRY:"${v}"`));
    intent.dataProvider.forEach((v)=> qf.push(`DATA_PROVIDER:"${v}"`));
    if (intent.type.length) intent.type.forEach((t)=> qf.push(`TYPE:${t}`));
    if (intent.yearRange && intent.yearRange.from && intent.yearRange.to) {
      qf.push(`YEAR:[${intent.yearRange.from} TO ${intent.yearRange.to}]`);
    }

    const query = keywords ?? (intent.what.length ? `"${intent.what[0]}"` : "*");
    const params = { query, qf, rows, profile: "rich", media: true };

    let results = null;
    if (execute) {
      const r = await search(params);
      results = { total: r.totalResults ?? 0, items: r.items ?? [] };
    }

    res.json({
      ok: true,
      intent,
      europeana: { params, critique: [] },
      chips,
      results
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
module.exports = router;


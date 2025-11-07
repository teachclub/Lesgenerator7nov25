const { Router } = require("express");
const { expandTerm, chipsFor } = require("../services/a22.thesaurus.cjs");

const router = Router();
router.post("/api/thesaurus", async (req, res) => {
  try {
    const { term="" } = req.body || {};
    const expanded = expandTerm(term);
    const chips = chipsFor(term);
    res.json({ ok: true, term, expanded, chips });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
module.exports = router;


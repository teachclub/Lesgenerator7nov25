// backend/routes/a35.proposals-v2.cjs
// LesGO v2 – proposals-laag (AI-gedreven)
//
// - Krijgt max. 40 bronnen + tv/ka
// - Bouwt een proposals-prompt (lessonV2.proposals)
// - Roept Gemini aan via runGeminiAndParse (zelfde service als step1–4)
// - Valideert chainSignature + concept.masterSignature
// - Stuurt proposals terug naar de frontend
//
// Routes (via server.cjs → app.use("/api", ...)):
//   POST /api/proposals-v2
//   POST /api/propose-lessons-v2   (alias)

const express = require("express");
const router = express.Router();

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const {
  buildProposalsPrompt,
  validateProposalsResponse,
} = require("../prompts/lessonV2.proposals.cjs");

// Zelfde Gemini-service als in routes/lessonV2.step1.cjs
const { runGeminiAndParse } = require("../services/gemini.cjs");

/**
 * Dummy fallback – lijkt op je oude dummy, maar mét masterSignature.
 */
function buildDummyProposals(allSources) {
  const ids = (allSources || []).map((s, idx) => s.id ?? idx + 1);
  const pick = (count) =>
    ids.slice(0, Math.max(0, Math.min(count, ids.length || 0)));

  return {
    chainSignature: MASTER_SIGNATURE,
    proposals: [
      {
        id: "p1",
        concept: {
          id: "p1",
          title: "Macht, belangen en spanningen",
          hook: "Leerlingen onderzoeken hoe spanningen tussen grootmachten konden aanvoelen als 'normaal' in hun eigen tijd.",
          hoofdvraag:
            "Hoe konden tijdgenoten de toenemende spanningen en machtsblokken accepteren als onderdeel van de 'normale' internationale politiek?",
          masterSignature: MASTER_SIGNATURE,
        },
        sourceIds: pick(8),
      },
      {
        id: "p2",
        concept: {
          id: "p2",
          title: "Gewone mensen in ongewone tijden",
          hook: "Leerlingen kijken vanuit het perspectief van gewone burgers die moesten leven met grote politieke en sociale veranderingen.",
          hoofdvraag:
            "Hoe konden gewone mensen hun dagelijkse leven blijven leiden terwijl de wereld om hen heen snel veranderde?",
          masterSignature: MASTER_SIGNATURE,
        },
        sourceIds: pick(8),
      },
      {
        id: "p3",
        concept: {
          id: "p3",
          title: "Idealen, propaganda en overtuiging",
          hook: "Leerlingen onderzoeken hoe idealen en propaganda konden maken dat mensen overtuigingen normaal en vanzelfsprekend vonden.",
          hoofdvraag:
            "Hoe konden mensen hun eigen overtuigingen als vanzelfsprekend ervaren, zelfs als wij die nu heel anders beoordelen?",
          masterSignature: MASTER_SIGNATURE,
        },
        sourceIds: pick(8),
      },
    ],
  };
}

/**
 * Normaliseer bronnen zodat we altijd een id hebben.
 */
function normalizeSources(sources = []) {
  return sources.map((src, index) => {
    return {
      ...src,
      id: src.id ?? index + 1,
    };
  });
}

/**
 * Gedeelde handler voor beide endpoints.
 */
async function handleProposalsRequest(req, res) {
  const { tv, ka, conceptHint = "", sources = [] } = req.body || {};
  const allSources = normalizeSources(sources);

  console.log("[A35/DEBUG v2] proposals – start");
  console.log("  tv:", tv);
  console.log("  ka:", ka);
  console.log("  #sources:", allSources.length);

  try {
    // 1. Prompt bouwen
    const prompt = buildProposalsPrompt({
      tv,
      ka,
      conceptHint,
      allSources,
    });

    // 2. Gemini aanroepen via dezelfde service als step1–4
    const json = await runGeminiAndParse({
      prompt,
      label: "lessonV2_proposals",
      meta: {
        tv,
        ka,
        sourceCount: allSources.length,
      },
    });

    // 3. Structuur + signature valideren
    const validated = validateProposalsResponse(json, MASTER_SIGNATURE);

    // 4. Resultaat teruggeven aan frontend
    return res.json({
      allSources,
      proposals: validated.proposals,
      meta: {
        countAll: allSources.length,
        countProposals: validated.proposals.length,
        masterSignature: MASTER_SIGNATURE,
        from: "gemini",
      },
    });
  } catch (err) {
    console.error(
      "[A35] Gemini proposals failed, using dummy fallback:",
      err && err.message ? err.message : err
    );

    const dummy = buildDummyProposals(allSources);

    return res.json({
      allSources,
      proposals: dummy.proposals,
      meta: {
        countAll: allSources.length,
        countProposals: dummy.proposals.length,
        masterSignature: MASTER_SIGNATURE,
        from: "dummy-fallback",
        error: err && err.message ? err.message : String(err),
      },
    });
  }
}

/**
 * Routes:
 *  - /api/proposals-v2
 *  - /api/propose-lessons-v2  (alias)
 */
router.post("/proposals-v2", handleProposalsRequest);
router.post("/propose-lessons-v2", handleProposalsRequest);

module.exports = router;


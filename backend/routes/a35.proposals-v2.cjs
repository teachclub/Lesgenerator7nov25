// backend/routes/a35.proposals-v2.cjs
// LesGO v2 – proposals-laag (AI-gedreven, v6MP6dec)
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
 * Helper om een subset van ids te pakken.
 */
function pickIds(allIds, max) {
  if (!Array.isArray(allIds) || allIds.length === 0) return [];
  const safeMax = Math.max(0, Math.min(max, allIds.length));
  return allIds.slice(0, safeMax);
}

/**
 * Dummy fallback – v6-conform:
 * - deelvragen[]
 * - leeropbrengsten[]
 * - primarySourceIds[]
 * - contextLabel, targetAudience, tv, ka
 *
 * Let op:
 * - Inhoud is generiek en enkel bedoeld als Noodgreep als Gemini faalt.
 * - Gebruik dit NIET als je echte didactische basis; het is alleen om de keten
 *   technisch werkend te houden en de UI niet te laten crashen.
 */
function buildDummyProposals(allSources, { tv, ka }) {
  const ids = (allSources || []).map((s, idx) => s.id ?? idx + 1);
  const sourceIdsP1 = pickIds(ids, 12);
  const sourceIdsP2 = pickIds(ids.slice(4), 12);
  const sourceIdsP3 = pickIds(ids.slice(8), 12);

  const primP1 = pickIds(sourceIdsP1, 6);
  const primP2 = pickIds(sourceIdsP2, 6);
  const primP3 = pickIds(sourceIdsP3, 6);

  const tvLabel = tv != null ? String(tv) : "";
  const kaLabel = ka != null ? String(ka) : "";

  const lo = (beschrijving, idx) => ({
    beschrijving,
    deelvraagIndex: typeof idx === "number" ? idx : null,
    id: undefined, // wordt later in validateProposalsResponse netjes ingevuld
  });

  return {
    chainSignature: MASTER_SIGNATURE,
    proposals: [
      {
        id: "p1",
        concept: {
          id: "p1",
          title: "Macht, angst en spanningen tussen blokken",
          hook: "Leerlingen kruipen in de huid van tijdgenoten die groeiende spanningen tussen machtsblokken als normaal onderdeel van de wereldpolitiek zagen.",
          hoofdvraag:
            "Hoe konden mensen destijds de groeiende spanningen tussen machtsblokken accepteren als normaal onderdeel van de wereldpolitiek?",
          deelvragen: [
            {
              vraag:
                "Hoe zagen tijdgenoten de internationale situatie en dreiging in hun eigen tijd?",
              dimensie: "Tijd & Tijdgeest",
              subdimensie: "gevoel van permanente spanning en dreiging",
            },
            {
              vraag:
                "Welke rollen speelden regeringen, leiders en bondgenootschappen in deze spanningen?",
              dimensie: "Politiek & Macht",
              subdimensie: "blokvorming, bondgenootschappen en machtspolitiek",
            },
            {
              vraag:
                "Welke economische belangen en middelen droegen bij aan rivaliteit tussen de blokken?",
              dimensie: "Economie & Middelen",
              subdimensie: "wapenwedloop, investeringen en schaarste",
            },
            {
              vraag:
                "Hoe beïnvloedden propaganda, media en normen het beeld van ‘de vijand’?",
              dimensie: "Waarden, Normen & Morele Kaders",
              subdimensie: "vijandbeelden, angst en rechtvaardiging",
            },
          ],
          leeropbrengsten: [
            lo(
              "Leerlingen kunnen uitleggen waarom tijdgenoten langdurige spanningen tussen machtsblokken als normaal onderdeel van de wereldpolitiek konden ervaren.",
              0
            ),
            lo(
              "Leerlingen kunnen aangeven welke rol leiders, bondgenootschappen en machtspolitiek speelden in het laten voortbestaan van deze spanningen.",
              1
            ),
            lo(
              "Leerlingen kunnen voorbeelden geven van economische factoren, zoals wapenwedloop en investeringen, die de spanningen versterkten.",
              2
            ),
            lo(
              "Leerlingen kunnen beschrijven hoe propaganda, media en normen het vijandsbeeld van de andere kant vormden.",
              3
            ),
          ],
          contextLabel:
            "Koude Oorlog / rivaliteit tussen machtsblokken (dummy-voorstel)",
          targetAudience: "Havo/Vwo (dummy-fallback)",
          masterSignature: MASTER_SIGNATURE,
          tv: tvLabel,
          ka: kaLabel,
        },
        sourceIds: sourceIdsP1,
        primarySourceIds: primP1,
      },
      {
        id: "p2",
        concept: {
          id: "p2",
          title: "Gewone mensen in onrustige tijden",
          hook: "Leerlingen onderzoeken hoe gewone mensen hun leven bleven vormgeven terwijl om hen heen politiek, economie en samenleving veranderden.",
          hoofdvraag:
            "Hoe konden gewone mensen hun dagelijkse leven blijven leiden terwijl de wereld om hen heen zo snel en onrustig veranderde?",
          deelvragen: [
            {
              vraag:
                "Hoe ervoeren mensen veranderingen in hun dagelijks leven en leefomgeving?",
              dimensie: "Ruimte, Geografie & Leefomgeving",
              subdimensie: "steden, dorpen en migratiebewegingen",
            },
            {
              vraag:
                "Welke sociale verhoudingen en groepsculturen bepaalden hoe mensen met veranderingen omgingen?",
              dimensie: "Sociale verhoudingen & Groepsculturen",
              subdimensie: "klasse, religie, gemeenschap en familie",
            },
            {
              vraag:
                "Hoe beïnvloedden banen, lonen en economie de manier waarop mensen kozen en overleefden?",
              dimensie: "Economie & Middelen",
              subdimensie: "werk, inkomenszekerheid en ongelijkheid",
            },
            {
              vraag:
                "Welke rol speelde de heersende tijdgeest in hoe mensen veranderingen normaal vonden?",
              dimensie: "Tijd & Tijdgeest",
              subdimensie: "heersende ideeën en verwachtingen",
            },
          ],
          leeropbrengsten: [
            lo(
              "Leerlingen kunnen uitleggen hoe veranderingen in leefomgeving en samenleving zichtbaar waren in het dagelijks leven van gewone mensen.",
              0
            ),
            lo(
              "Leerlingen kunnen beschrijven hoe sociale groepen, zoals klasse of religieuze gemeenschappen, invloed hadden op de manier waarop mensen met veranderingen omgingen.",
              1
            ),
            lo(
              "Leerlingen kunnen voorbeelden geven van economische onzekerheid en kansen in het leven van gewone mensen.",
              2
            ),
            lo(
              "Leerlingen kunnen de rol van tijdgeest en heersende verwachtingen koppelen aan de manier waarop mensen veranderingen accepteerden.",
              3
            ),
          ],
          contextLabel:
            "Maatschappelijke en economische veranderingen (dummy-voorstel)",
          targetAudience: "Havo/Vwo (dummy-fallback)",
          masterSignature: MASTER_SIGNATURE,
          tv: tvLabel,
          ka: kaLabel,
        },
        sourceIds: sourceIdsP2,
        primarySourceIds: primP2,
      },
      {
        id: "p3",
        concept: {
          id: "p3",
          title: "Idealen, propaganda en overtuigingen",
          hook: "Leerlingen verkennen hoe idealen en propaganda konden maken dat overtuigingen vanzelfsprekend klonken voor tijdgenoten.",
          hoofdvraag:
            "Hoe konden mensen destijds hun eigen idealen en overtuigingen zo vanzelfsprekend vinden, zelfs als wij die nu heel vreemd of problematisch vinden?",
          deelvragen: [
            {
              vraag:
                "Welke idealen en doelen spraken leiders en bewegingen uit in deze periode?",
              dimensie: "Politiek & Macht",
              subdimensie: "ideologieën, partijprogramma’s en leiderschap",
            },
            {
              vraag:
                "Hoe verspreidden propaganda, media en onderwijs deze idealen en beelden van de werkelijkheid?",
              dimensie: "Kennis, Wetenschap & Technologie",
              subdimensie: "media, techniek en informatieverspreiding",
            },
            {
              vraag:
                "Welke morele normen en waarden gebruikten mensen om hun overtuigingen te rechtvaardigen?",
              dimensie: "Waarden, Normen & Morele Kaders",
              subdimensie: "plichten, deugden en vijandbeelden",
            },
            {
              vraag:
                "Hoe werkten sociale groepen, zoals families, kerken of verenigingen, door in het overnemen van die overtuigingen?",
              dimensie: "Sociale verhoudingen & Groepsculturen",
              subdimensie: "groepsdruk, tradities en loyaliteit",
            },
          ],
          leeropbrengsten: [
            lo(
              "Leerlingen kunnen voorbeelden geven van idealen en doelen die leiders en bewegingen naar voren schoven.",
              0
            ),
            lo(
              "Leerlingen kunnen uitleggen hoe propaganda en media het beeld van de werkelijkheid en van ‘de ander’ vormden.",
              1
            ),
            lo(
              "Leerlingen kunnen beschrijven met welke morele argumenten mensen hun overtuigingen verdedigden.",
              2
            ),
            lo(
              "Leerlingen kunnen aangeven hoe sociale groepen, zoals familie of geloofsgemeenschappen, hielpen om overtuigingen door te geven.",
              3
            ),
          ],
          contextLabel:
            "Ideologie, propaganda en overtuiging (dummy-voorstel)",
          targetAudience: "Havo/Vwo (dummy-fallback)",
          masterSignature: MASTER_SIGNATURE,
          tv: tvLabel,
          ka: kaLabel,
        },
        sourceIds: sourceIdsP3,
        primarySourceIds: primP3,
      },
    ],
  };
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
        isDummy: false,
      },
    });
  } catch (err) {
    console.error(
      "[A35] Gemini proposals failed, using dummy fallback:",
      err && err.message ? err.message : err
    );

    const dummy = buildDummyProposals(allSources, { tv, ka });

    return res.json({
      allSources,
      proposals: dummy.proposals,
      meta: {
        countAll: allSources.length,
        countProposals: dummy.proposals.length,
        masterSignature: MASTER_SIGNATURE,
        from: "dummy-fallback",
        isDummy: true,
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


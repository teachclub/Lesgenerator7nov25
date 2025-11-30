// routes/a35.proposals-v2.cjs
// DEBUG-STUB VOOR /api/propose-lessons-v2
// - GEEN Gemini
// - GEEN API-keys
// - Maakt altijd 3 concepten op basis van de geselecteerde bronnen
//
// LET OP: sluit exact aan op ProposalsPage.tsx:
//   type Proposal = {
//     title: string;
//     targetAudience: string;
//     hook: string;
//     rationale: string;
//     selectedSourceIds: string[];
//   };

const express = require("express");
const router = express.Router();

router.post("/propose-lessons-v2", (req, res) => {
  try {
    const body = req.body || {};

    const tv = body.tv || body.tijdvak || null;
    const ka = body.ka || body.kenmerkendAspect || null;

    // Alle meegegeven bronnen (Kleio + Cito samen)
    const allSources =
      body.selectedSources ||
      body.sources ||
      body.kleioSources ||
      body.citoSources ||
      [];

    const nAll = Array.isArray(allSources) ? allSources.length : 0;

    // Alleen de IDs, want de frontend haalt de echte Source-objecten
    // uit useSelectionStore() en koppelt via selectedSourceIds.
    const sourceIds = Array.isArray(allSources)
      ? allSources
          .map((s) => s && s.id)
          .filter((id) => typeof id === "string" && id.length > 0)
      : [];

    const contextLabel =
      (ka && (ka.label || ka.title || ka.code)) ||
      (tv && (tv.label || tv.title || tv.id)) ||
      "Koude Oorlog";

    // Hooks in presentistische leerlingentaal
    const hooks = [
      `Huh? Waarom deelden de grootmachten landen zomaar op alsof het een taart was?`,
      `Hoezo deden ze zo geheimzinnig en dreigden ze elkaar constant met oorlog?`,
      `Waarom vonden zoveel mensen het normaal dat er overal muren, hekken en grenzen kwamen?`,
    ];

    // Korte toelichting voor onder de hook
    const rationales = [
      `Dit concept laat leerlingen onderzoeken hoe de wereld na de Tweede Wereldoorlog in blokken werd verdeeld. Ze kijken naar bronnen over grenzen, conferenties en machtspolitiek en vragen zich af waarom dit voor mensen toen "logisch" leek.`,
      `In dit concept staat de spanning en dreiging centraal. Leerlingen bestuderen bronnen over kernwapens, speeches en cartoons en proberen te begrijpen waarom de angst zo groot was.`,
      `Dit concept richt zich op het dagelijks leven achter grenzen en muren. Leerlingen onderzoeken hoe gewone mensen deze politieke keuzes ervoeren en wat dat deed met hun vrijheid.`,
    ];

    const targetAudience = "3 havo / 4 vwo";

    // EXACT het Proposal-type dat de frontend verwacht
    const proposals = [0, 1, 2].map((i) => ({
      title: `${contextLabel} – Concept ${i + 1}`,
      targetAudience,
      hook: hooks[i],
      rationale: rationales[i],
      selectedSourceIds: sourceIds,
    }));

    console.log(
      "[A35/DEBUG] propose-lessons-v2:",
      `tv=${tv ? JSON.stringify(tv) : "null"}`,
      `ka=${ka ? JSON.stringify(ka) : "null"}`,
      `#allSources=${nAll}`,
      `#selectedSourceIds=${sourceIds.length}`
    );

    // LET OP: direct de array teruggeven, geen { concepts: [...] }
    return res.json(proposals);
  } catch (err) {
    console.error("[A35/DEBUG] onverwachte fout:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: err.message || "Onbekende fout in propose-lessons-v2 DEBUG-route.",
    });
  }
});

module.exports = router;


// routes/a35.proposals-v2.cjs
// DEBUG-IMPLEMENTATIE VOOR /api/propose-lessons-v2
// - GEEN Gemini
// - GEEN API-keys nodig
// - Maakt altijd 3 concepten op basis van de gevonden bronnen
// - Geeft een ARRAY terug, direct passend bij ProposalsPage.tsx

const express = require("express");
const router = express.Router();

// Helper: zorg dat we altijd een array hebben
function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Helper: kies max N bronnen, met voorkeur voor bronnen met beeld
function pickTopSources(allSources, max = 15) {
  if (!Array.isArray(allSources) || allSources.length === 0) return [];

  // Eerst bronnen met imageUrl, dan de rest
  const withImage = allSources.filter((s) => !!s.imageUrl);
  const withoutImage = allSources.filter((s) => !s.imageUrl);

  const ordered = [...withImage, ...withoutImage];
  return ordered.slice(0, max);
}

router.post("/propose-lessons-v2", (req, res) => {
  try {
    const body = req.body || {};

    // Mogelijke velden waar bronnen kunnen staan:
    const allSources =
      body.selectedSources ||
      body.sources ||
      body.kleioSources ||
      body.citoSources ||
      [];

    const all = toArray(allSources);
    const kleio = all.filter((s) => s && s.provider === "Kleio");
    const cito = all.filter((s) => s && s.provider === "Cito");

    const trimmed = pickTopSources(all, 15);

    const contextLabel =
      (body.ka && (body.ka.label || body.ka.title || body.ka.code)) ||
      (body.tv && (body.tv.label || body.tv.title || body.tv.id)) ||
      (body.query || "Koude Oorlog");

    console.log(
      "[A35/DEBUG] propose-lessons-v2:",
      `tv=${body.tv ? JSON.stringify(body.tv) : "null"}`,
      `ka=${body.ka ? JSON.stringify(body.ka) : "null"}`,
      `#all=${all.length}`,
      `#kleio=${kleio.length}`,
      `#cito=${cito.length}`,
      `#used=${trimmed.length}`
    );

    // Eenvoudige hooks in leerlingentaal
    const hooks = [
      `Huh? Waarom deelden de grootmachten landen zomaar op alsof het een taart was?`,
      `Hoezo deden ze zo geheimzinnig en dreigden ze elkaar constant met oorlog?`,
      `Waarom vonden zoveel mensen het normaal dat er overal muren, hekken en grenzen kwamen?`,
    ];

    const rationales = [
      `In dit concept onderzoeken leerlingen hoe de wereld na de Tweede Wereldoorlog in blokken werd verdeeld. Ze kijken naar kaarten, foto’s en teksten over grenzen, conferenties en machtspolitiek en vragen zich af waarom dat voor mensen toen “logisch” leek.`,
      `Hier staat de spanning en dreiging centraal. Leerlingen bestuderen bronnen over kernwapens, speeches en cartoons en proberen te begrijpen waarom de angst zo groot was en hoe dat het gedrag van leiders én gewone mensen beïnvloedde.`,
      `In dit concept ligt de focus op het dagelijks leven achter grenzen en muren. Leerlingen onderzoeken hoe gewone mensen omgingen met controles, propaganda en gebrek aan vrijheid – en waarom veel mensen dat tóch jarenlang accepteerden of er niet tegen in opstand kwamen.`,
    ];

    // Eén basis-bronnenmix voor alle drie concepten
    const selectedIds = trimmed.map((s) => String(s.id));

    const concepts = [0, 1, 2].map((i) => ({
      // ProposalsPage.tsx verwacht deze velden:
      title: `${contextLabel} – Concept ${i + 1}`,
      targetAudience: "4–6 havo/vwo",
      hook: hooks[i],
      rationale: rationales[i],
      selectedSourceIds: selectedIds,
    }));

    // Belangrijk: direct array teruggeven (geen { concepts: [...] })
    return res.json(concepts);
  } catch (err) {
    console.error("[A35/DEBUG] onverwachte fout:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message:
        err && err.message
          ? err.message
          : "Onbekende fout in propose-lessons-v2 DEBUG-route.",
    });
  }
});

module.exports = router;


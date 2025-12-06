// backend/prompts/lessonV2.step3.cjs
// LESSON V2 – STEP3 (Bronnenblad zonder Gemini)
//
// Doel:
// - Op basis van concept + bronnen een netjes gestructureerd bronnenblad
//   teruggeven voor de frontend.
// - GEEN modelcall; alleen data structureren.
// - Altijd een chainSignature meesturen, zodat de keten herkenbaar blijft.

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

/**
 * Bouwt de JSON voor step3 (bronnenblad).
 *
 * Verwachte input-shape (req.body):
 * {
 *   concept: {
 *     title?: string,
 *     hoofdvraag?: string,
 *     masterSignature?: string,
 *     tv?: string,
 *     ka?: string,
 *     primarySourceIds?: (string|number)[]
 *   },
 *   sources: Array<{
 *     id: string|number,
 *     title?: string,
 *     description?: string,
 *     snippet?: string,
 *     provider?: string,
 *     type?: string,
 *     periodHint?: string,
 *     url?: string|null,
 *     imageUrl?: string|null,
 *     meta?: any
 *   }>
 * }
 */
function buildStep3Data(body = {}) {
  const concept = body.concept || {};
  const sourcesInput = Array.isArray(body.sources) ? body.sources : [];

  const chainSignature = concept.masterSignature || MASTER_SIGNATURE;

  // Set van kernbronnen (primarySourceIds) als die bekend zijn in het concept
  const primaryIdsRaw = Array.isArray(concept.primarySourceIds)
    ? concept.primarySourceIds
    : [];
  const primaryIdSet = new Set(primaryIdsRaw.map((id) => String(id)));

  // Normaliseer bronnen
  const bronnen = sourcesInput.map((src, index) => {
    const id = src.id != null ? src.id : index + 1;
    const nummer = index + 1;

    return {
      id,
      nummer,
      titel: src.title || src.titel || `Bron ${nummer}`,
      provider: src.provider || "",
      type: src.type || "",
      snippet:
        src.snippet ||
        src.description ||
        (src.fullText && String(src.fullText).slice(0, 240)) ||
        "",
      periode: src.periodHint || "",
      url: src.url || null,
      imageUrl: src.imageUrl || null,
      isPrimary: primaryIdSet.has(String(id)),
      meta: src.meta || {},
    };
  });

  const data = {
    chainSignature,
    meta: {
      sourceCount: bronnen.length,
      hasPrimarySources: primaryIdSet.size > 0,
      tv: concept.tv || null,
      ka: concept.ka || null,
      conceptId: concept.id || null,
    },
    bronnenblad: {
      titel: concept.title || "Br ONNENBLAD",
      hoofdvraag: concept.hoofdvraag || "",
      toelichting:
        "In dit bronnenblad vind je alle bronnen die bij deze les horen. Lees elke bron met de hoofdvraag in je achterhoofd en let op wat de bron bijdraagt aan het antwoord.",
      bronnen,
    },
  };

  return {
    step: 3,
    data,
  };
}

module.exports = {
  buildStep3Data,
};


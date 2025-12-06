// backend/config/masterSignature.cjs
// Centrale versie-/keten-handtekening voor de LesGO/Kleio-lesgenerator.
//
// Wijzig deze string alleen bij een echt nieuwe didactische versie
// (bijvoorbeeld overgang v5 -> v6).
//
// Gebruik deze waarde in:
// - proposals-prompt (lessonV2.proposals.cjs)
// - refine-prompt (lessonV2.refineConcept.cjs)
// - step1/step2/step3/step4-prompts
// - eventuele debug in de frontend.

module.exports = {
  MASTER_SIGNATURE: "v6MP6dec",
};


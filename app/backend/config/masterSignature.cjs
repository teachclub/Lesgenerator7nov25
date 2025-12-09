// backend/config/masterSignature.cjs
// Centrale versie-/keten-handtekening voor de LesGO/Kleio-lesgenerator.
//
// Deze waarde bepaalt voor ALLE prompts (proposals, refine, step1 t/m step4)
// dat ze onder dezelfde keten draaien. Daarmee voorkom je terugval naar v6.
//
// Bij een nieuwe ketenversie: ALLEEN deze string aanpassen.

module.exports = {
  MASTER_SIGNATURE: "v7MP9dec",
};


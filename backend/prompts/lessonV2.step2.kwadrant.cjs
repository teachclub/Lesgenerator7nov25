// prompts/lessonV2.step2.kwadrant.cjs
// Sectie 3 – kwadrant-aslabels

function buildKwadrantSection() {
  return `
==================================================
KWADRANT-ASLABELS (VERPLICHT GEVULD)
==================================================

JE VULT ALTIJD:

"kwadrantAsLabels": {
  "X_links": "",
  "X_rechts": "",
  "Y_boven": "",
  "Y_onder": ""
}

RICHTLIJN:
- horizontale as (X), bijv.:
  - X_links: "Sterk bepaald door de tijdgeest"
  - X_rechts: "Herkenbaar / tijdloos menselijk"
- verticale as (Y), bijv.:
  - Y_boven: "Grote impact op de internationale verhoudingen / samenleving"
  - Y_onder: "Kleine, persoonlijke impact / beleving"

REGELS:
- Dit object mag nooit leeg zijn.
- Als je geen beter idee hebt, gebruik bovenstaande standaard-formuleringen
  of een kleine variatie daarop die goed past bij het onderwerp.
`;
}

module.exports = buildKwadrantSection;


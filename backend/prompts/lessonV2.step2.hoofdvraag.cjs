// prompts/lessonV2.step2.hoofdvraag.cjs
// Sectie 1 – MAIN QUESTION (hoofdvraag)
// Doel: als het concept al een hoofdvraag heeft, moet die EXACT worden overgenomen.
// Alleen als het concept geen hoofdvraag heeft, formuleert het model zelf een nieuwe.

function buildHoofdvraagSection(concept = {}) {
  const existingQuestion = (concept.hoofdvraag || "").trim();

  return `
==================================================
HOOFDVRAAG – CONCEPT-FIRST
==================================================

BESTAANDE HOOFDVRAAG UIT HET CONCEPT (KAN LEGEN STRING ZIJN):

"${existingQuestion}"

REGELS:

1. ALS ER AL EEN HOOFDVRAAG IS (NIET LEEG)
--------------------------------------------------
- De bovenstaande zin is de hoofdvraag zoals die in het lesvoorstel (concept) is geformuleerd.
- In de JSON-output van deze stap MOET je deze vraag:
  - EXACT overnemen als waarde van "hoofdvraag";
  - in het NEDERLANDS laten;
  - NIET vertalen, NIET herformuleren, NIET inkorten of uitbreiden.
- Dus:
  - data.hoofdvraag === de bestaande vraag uit het concept.

2. ALS ER GEEN HOOFDVRAAG IS (LEEG)
--------------------------------------------------
Formuleer dan ZELF een nieuwe hoofdvraag die:
- maximaal 1 zin is;
- duidelijk vertrekt vanuit impliciete, enigszins naïeve leerlingverbazing, bijvoorbeeld:
  - hoe konden mensen iets gevaarlijks of extreem ingrijpends toch normaal, logisch of noodzakelijk vinden;
- presentistisch mag klinken ("Hoe konden ze...", "Waarom vonden mensen het normaal dat...",
  "Waarom zagen ze het gevaar niet?"), maar:
  - gebruik GEEN expliciete verwijzing naar het feit dat wij nu de afloop kennen;
  - vermijd woorden als "achteraf", "wij weten nu", "nu we weten hoe het afloopt";
- gericht is op HUN tijd en keuzes, niet op ons oordeel;
- bij voorkeur een concreet perspectief raakt (bijv. politieke leiders, burgers, militairen, jongeren, kunstenaars);
- in duidelijk NEDERLANDS is geformuleerd.

VOORBEELDEN VAN STIJL (NIET LETTERLIJK OVERNEMEN):
- "Hoe konden politieke leiders in de Koude Oorlog denken dat steeds meer kernwapens hun land juist veiliger maakten?"
- "Hoe konden zoveel mensen de wapenwedloop tussen Oost en West als normaal accepteren, terwijl de dreiging zo groot was?"
- "Waarom leek de enorme militaire en technologische wedloop in de Koude Oorlog voor tijdgenoten een logische manier om veiligheid te organiseren?"
`;
}

module.exports = buildHoofdvraagSection;


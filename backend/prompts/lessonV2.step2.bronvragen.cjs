// prompts/lessonV2.step2.bronvragen.cjs
// Sectie 4 – bronvragen (4 per bron, genummerd)

function buildBronvragenSection() {
  return `
==================================================
BRONVRAGEN – PRECIES 4 PER BRON, GENUMMERD
==================================================

DOEL:
Per bron genereer je vragen waarmee leerlingen drie denkstappen maken:
1) OBSERVEREN – wat staat er letterlijk in / is er te zien?
2) INTERPRETEREN – wat betekenen die observaties in de context van toen?
3) LINK MET HOOFDVRAAG – wat zegt dit over de hoofdvraag
   (bijv. hoe men iets gevaarlijks of extreem ingrijpends toch normaal of logisch kon vinden)?

REGELS:
- Je maakt PER BRON PRECIES 4 VRAGEN.
- Elke vraag is een STRING die begint met een nummer en punt:
  - "1. ...", "2. ...", "3. ...", "4. ...".
- De 4 vragen moeten SAMEN:
  - minimaal 1 observatievraag bevatten,
  - minimaal 1 interpretatievraag,
  - minimaal 1 expliciete koppeling met de hoofdvraag.

VOORBEELDEN VAN TYPE (NIET KOPIËREN, ALLEEN STIJL):
- Observatie:
  - "1. Welke beelden, woorden of symbolen vallen het meest op in deze bron?"
  - "1. Welke personen of gebeurtenissen staan centraal in de bron?"
- Interpretatie:
  - "2. Wat laten deze details zien over de ideeën, angsten of doelen van de betrokkenen in die tijd?"
  - "3. Welke belangen of overtuigingen kunnen een rol hebben gespeeld bij wat er in de bron gebeurt?"
- Link met hoofdvraag:
  - "4. Wat laat deze bron zien over de manier waarop tijdgenoten de dreiging of de wapenwedloop als normaal of noodzakelijk konden ervaren?"
  - "3. Hoe draagt deze bron bij aan het begrijpen waarom mensen toen anders naar veiligheid keken dan wij nu?"

VERBODEN FORMATS (NIET GEBRUIKEN):
- Vermijd lege formats als:
  - "Hoe helpt deze bron je om ... te begrijpen?"
  - "In hoeverre helpt dit fragment te verklaren..."
  - "Wat zegt deze bron over..."
- Formuleer concreet en inhoudelijk:
  - verwijs naar specifieke elementen (personen, uitspraken, gebeurtenissen, symbolen, cijfers);
  - zorg dat de koppeling met de hoofdvraag inhoudelijk is en niet alleen een standaardformule.

STIJL:
- Schrijf op niveau 3/4 HAVO/VWO, helder en concreet;
- Vermijd overdreven vakjargon; als een term als "strategisch" nodig is,
  zorg dat de context de betekenis duidelijk maakt.
`;
}

module.exports = buildBronvragenSection;


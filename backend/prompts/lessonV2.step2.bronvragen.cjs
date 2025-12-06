// backend/prompts/lessonV2.step2.bronvragen.cjs
// Zorgt ervoor dat Gemini BRONVRAGEN als nette array teruggeeft:
//
// "bronvragen": [
//   {
//     "bronId": "<id-uit-bronnenlijst>",
//     "vragen": [
//       "Vraag 1...?",
//       "Vraag 2...?",
//       "Vraag 3...?"
//     ]
//   },
//   ...
// ]
//
// Let op: dit bestand bepaalt alleen de INSTRUCTIE-tekst in de prompt.
// Het JSON-schema zelf wordt door lessonV2.base + gemini.cjs afgedwongen.

function safe(val) {
  if (!val) return "";
  return String(val).replace(/\s+/g, " ").trim();
}

module.exports = function buildStep2BronvragenSection({ concept = {}, sources = [] } = {}) {
  const hoofdvraag = safe(concept.hoofdvraag);
  const titel = safe(concept.title || concept.titel || concept.contextLabel);

  const bronnenLijst = (sources || [])
    .map((s, idx) => {
      const id = safe(s.id);
      const provider = safe(s.provider);
      const type = safe(s.type);
      const title = safe(s.title || s.description || "");
      return `- [${idx + 1}] id="${id}", provider="${provider}", type="${type}", title="${title}"`;
    })
    .join("\n");

  return `
### DEEL 3 – BRONVRAGEN (MOET IN "bronvragen" ARRAY TERECHTKOMEN)

Je maakt nu gerichte BRONVRAGEN bij de geselecteerde bronnen. Deze vragen komen in het JSON-veld "bronvragen".

BELANGRIJK – JSON-STRUCTUUR (DIT IS ALLEEN EEN VOORBEELD, JE HOUDT JE AAN DIT PATROON):
"bronvragen": [
  {
    "bronId": "<exact id uit de bronnenlijst hieronder, zoals 'cito-521' of 'kleio-11'>",
    "vragen": [
      "Eerste vraagzin, in leerlingentaal, eindigend op een vraagteken.",
      "Tweede vraagzin, concreet en observeerbaar...?",
      "Derde vraagzin, helpt richting de hoofdvraag...?"
    ]
  }
]

Richtlijnen voor de vragen:
- 3 vragen per bron.
- Taalniveau: 3 / 4 havo-vwo, helder en concreet.
- Elke vraag eindigt op een vraagteken.
- Vragen zijn gekoppeld aan de hoofdvraag:
  "${hoofdvraag}"
- Vragen helpen leerlingen om:
  1. TE OBSERVEREN: wat zien / lezen ze precies in de bron?
  2. TE INTERPRETEREN: wat zegt dat over tijdgeest, macht, groepen, waarden?
  3. TE KOPPELEN AAN DE HOOFDVRAAG: wat zegt dit over hoe mensen zo konden denken/handelen?

Over toon en woordkeuze:
- Je MAG woorden gebruiken als "naïef", "goedgelovig", "klakkeloos", "hardnekkig",
  maar alleen als de bron daar echt aanleiding toe geeft.
- Schrijf NIET als een academicus. Geen ingewikkelde bijzinnen met "terwijl", "ofschoon", enzovoort.
- Schrijf als een scherpe, maar begrijpelijke vraag voor een middelbare scholier.

Verdeling over dimensies (Tim Huijgen):
- Zorg dat de bronvragen samen verschillende dimensies raken:
  * Tijd & Tijdgeest (bijvoorbeeld angst, propaganda, dreiging)
  * Sociale verhoudingen & Groepsculturen (bijvoorbeeld groepsdruk, wij/zij-denken)
  * Politiek & Macht (bijvoorbeeld leiders, beslissingen, machtsspel)
  * Waarden & Normen (bijvoorbeeld wat normaal werd gevonden, wat goed of fout leek)

JE MOET DEZE BRONNEN GEBRUIKEN.
Gebruik EXACT dezelfde "id" in je JSON als hieronder:

${bronnenLijst || "- (geen bronnen ontvangen – als dit gebeurt: geef een lege array terug: \"bronvragen\": [] )"}
`;
};


// prompts/lessonV2.step1.cjs
const { baseDidacticPreamble, sourcesToPromptSnippet } = require("./lessonV2.base.cjs");

function buildStep1Prompt(body) {
  const { concept = {}, sources = [] } = body;

  return `
${baseDidacticPreamble()}

CONTEXT: STEP 1 – DOCENT (EÉN LESUUR)

DOEL VAN DEZE STAP
Je schrijft een korte, praktische docenteninstructie voor ÉÉN lesuur van ongeveer 50 minuten.
De docent moet in één oogopslag zien:
- wat het doel van de les is,
- hoe de les globaal verloopt,
- waarom deze aanpak didactisch zinvol is,
- hoe de tijd over de onderdelen verdeeld wordt.

BELANGRIJKE RANDVOORWAARDEN VOOR TIJD
- Je gaat uit van één lesuur van 50 minuten.
- De totale som van alle fasen in de planning ligt TUSSEN 45 EN 55 MINUTEN.
- Je controleert zelf bij het schrijven of de som binnen deze bandbreedte ligt.
- Gebruik liever 3–5 fasen dan 10 kleine stukjes.
- Ga NIET boven de 60 minuten uitkomen, tenzij in de input expliciet staat dat het om een blok van twee lesuren gaat (dat is hier NIET het geval).

WAT JE GENEREERT

1. DOCENTENINSTRUCTIE
- "wat": 3–4 zinnen
  - Beschrijf kort wat de kern van de les is: onderwerp, hoofdvraag, kernactiviteit.
- "hoe": 4–6 zinnen
  - Beschrijf de opbouw van de les (start, kern, afsluiting) in docententaal.
  - Verwijs naar het werken met bronnen, subdimensies en eventuele klassikale bespreking.
- "waarom": 2–4 zinnen
  - Leg uit waarom deze werkwijze goed helpt om presentisme te vermijden en context op te bouwen.

2. LESPLANNING (TABELLEN-OUTPUT)
- Je maakt een planning voor ÉÉN lesuur.
- Gebruik een tabel met minimaal deze kolommen:
  - Fase
  - Activiteit
  - Duur (minuten)
- Zorg dat de individuele duurwaarden reëel zijn (bijv. 5, 10, 15, 20 minuten).
- De som van alle duurwaarden ligt tussen 45 en 55 minuten.
- Benoem bij elke fase in 1 korte zin wat er gebeurt.

Invoer concept:
${JSON.stringify(concept, null, 2)}

Invoer bronnenkort:
${sourcesToPromptSnippet(sources)}

OUTPUT:
Je geeft ALLEEN onderstaand JSON-object (geen uitleg erbuiten):

{
  "step": 1,
  "data": {
    "docentenInstructie": {
      "wat": "…",
      "hoe": "…",
      "waarom": "…"
    },
    "lesPlanning": {
      "tabelMarkdown": "| Fase | Activiteit | Duur (minuten) |\\n| ... | ... | ... |"
    }
  }
}

- "tabelMarkdown" bevat één complete Markdown-tabel met de kolommen Fase, Activiteit en Duur (minuten).
- De waarden in de kolom "Duur (minuten)" tellen op tot tussen 45 en 55.
- GEEN extra tekst buiten dit JSON-object.
`;
}

module.exports = {
  buildStep1Prompt,
};


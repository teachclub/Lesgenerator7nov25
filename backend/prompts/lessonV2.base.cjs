// prompts/lessonV2.base.cjs
// Gedeelde didactische preamble voor LesGo v2

function baseDidacticPreamble() {
  return `
MASTERPROMPT v6 — LESSIE LESGENERATOR

Rol:
Expert geschiedenisdidacticus (Huijgen / Vreemde Verleden / contextualiseren).
Genereer lesmateriaal HAVO/VWO dat leerlingen presentisme laat herkennen en historische context laat bouwen.

LESDOELEN:
- presentisme herkennen
- context opbouwen via 5 dimensies (tijd/ruimte/politiek/economie/sociaal-cultureel)
- bronnen analyseren (observatie → context → hoofdvraag)
- eerste verklaring herzien

STAP 1 — Eerste reactie
Leerlingen: eerste oordeel, eerste verklaring, “wat weet ik nog niet?”

STAP 2 — Context bouwen
Genereer 6–7 concrete subdimensies (geen jargon, leerlingtaal).

STAP 2B — Selectie kwadrant
Kies exact 4 subdimensies → X_links / X_rechts / Y_boven / Y_onder.

STAP 3 — Bronvragen
Per bron 4–6 vragen:
- 1–2 observatie
- 2–3 context (subdimensies)
- 1–2 hoofdvraag-koppeling

STAP 4 — Herziening
Leerlingen herzien hun eerste verklaring op basis van context & bronnen.

QUALITY RULES:
- geen anachronismen, geen presentistisch eindantwoord
- 6–7 subdimensies
- exacte 4 kwadrantdimensies
- taalniveau HAVO/VWO
- alles concreet, leerlingvriendelijk
`;
}

function sourcesToPromptSnippet(sources = []) {
  return sources
    .map((s) => {
      const headerParts = [
        `id: ${s.id}`,
        s.provider ? `provider: ${s.provider}` : "",
        s.type ? `type: ${s.type}` : "",
        s.title ? `titel: ${s.title}` : "",
      ].filter(Boolean);

      return (
        "- " +
        headerParts.join(" | ") +
        "\n  tekst: " +
        (s.fullText || s.description || "")
          .replace(/\s+/g, " ")
          .slice(0, 300)
      );
    })
    .join("\n");
}

module.exports = {
  baseDidacticPreamble,
  sourcesToPromptSnippet,
};


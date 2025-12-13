import React from "react";

interface LessonSource {
  id: number;
  title?: string;
  fullText: string;
  imageUrls?: string[];
  caption?: string;
}

interface KwadrantAsLabels {
  X_links: string;
  X_rechts: string;
  Y_boven: string;
  Y_onder: string;
}

interface LessonStep2Data {
  intro: string;
  hoofdvraag: string;
  sources: LessonSource[];
  bronvragen: string[];
  tabelUitleg: string;
  kwadrantUitleg: string;
  kwadrantAsLabels: KwadrantAsLabels;
}

/**
 * Tijdelijke mock-data zodat de pagina zelfstandig kan compileren en tonen
 * hoe Stap 2a is opgebouwd. Later vervangen we dit door echte, bron-specifieke
 * vragen uit de backend (masterprompt v6).
 */
const mockLessonStep2Data: LessonStep2Data = {
  intro:
    "In deze les ga je onderzoeken hoe mensen in het verleden dachten en handelden. Je gebruikt daarvoor bronnen uit die tijd. Je probeert te begrijpen in welke tijd, plaats en samenleving deze mensen leefden.",
  hoofdvraag:
    "Hoe helpt het onderzoeken van bronnen ons om de denkwereld van mensen in het verleden beter te begrijpen?",
  sources: [
    {
      id: 1,
      title: "Bron 1 – Tekstbron (voorbeeld)",
      fullText:
        "Dit is een voorbeeld van een brontekst. Hier zou normaal de volledige historische brontekst komen te staan, zonder afkortingen. Leerlingen lezen de bron zorgvuldig en gebruiken deze bij het beantwoorden van de vragen.",
      imageUrls: [],
    },
    {
      id: 2,
      title: "Bron 2 – Beeldbron (voorbeeld)",
      fullText:
        "Dit is een voorbeeld van een beeldbron met begeleidende tekst. In de echte les komt hier de oorspronkelijke bronbeschrijving of toelichting.",
      imageUrls: [
        "https://via.placeholder.com/400x250?text=Voorbeeld+afbeelding+bron+2",
      ],
      caption: "Voorbeeld van een historische afbeelding die bij de bron hoort.",
    },
  ],
  /**
   * Let op:
   * Dit zijn VOORBEELD-vragen die laten zien welk type denken we willen.
   * In de echte les worden deze vragen per bron op maat gegenereerd door Gemini
   * (inhoudsspecifiek, gekoppeld aan contextualiseringsdimensies).
   */
  bronvragen: [
    "Welke concrete details in deze bron helpen je bepalen wanneer en waar deze situatie zich afspeelt? Noem minstens twee aanwijzingen uit de tekst of afbeelding.",
    "Wat merk je aan deze bron over de mensen die erin voorkomen (bijvoorbeeld hun positie, belangen of zorgen)? Licht dat toe met een voorbeeld uit de bron.",
    "Wat zegt de bron over hoe de samenleving of machtsverhoudingen in deze tijd werkten? Welke zinsnede, uitspraak of scène laat dat het beste zien?",
    "Als je deze bron naast de hoofdvraag legt, welke nieuwe gedachte of vraag levert dat jou op? Schrijf dat in je eigen woorden op.",
  ],
  tabelUitleg:
    "In de tabel noteer je per bron eerst je belangrijkste observaties (wat zie/lees je precies), daarna je interpretatie (wat betekent dat volgens jou) en tenslotte de link met de hoofdvraag.",
  kwadrantUitleg:
    "In het kwadrant plaats je begrippen of voorbeelden uit de bronnen. Op de horizontale as kijk je naar de vraag: is dit vooral tijd-/contextgebonden of juist herkenbaar en menselijk van alle tijden? Op de verticale as kijk je naar de impact: gaat het om iets met grote invloed op de samenleving of om iets kleins en persoonlijks.",
  kwadrantAsLabels: {
    X_links: "Sterk bepaald door tijd en context",
    X_rechts: "Herkenbaar / van alle tijden",
    Y_boven: "Grote impact op samenleving",
    Y_onder: "Kleine impact / persoonlijk",
  },
};

const LessonStep2aPage: React.FC = () => {
  const data = mockLessonStep2Data;

  return (
    <div
      className="lesson-step2a-page"
      style={{ padding: "1.5rem", maxWidth: "960px", margin: "0 auto" }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          Les Go – Stap 2a: Leerlinginleiding & bronnen
        </h1>
        <p style={{ margin: 0, fontStyle: "italic" }}>
          Sandbox-versie om de inhoudelijke structuur van Stap 2a te testen.
        </p>
      </header>

      {/* Intro & hoofdvraag */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>Inleiding</h2>
        <p>{data.intro}</p>

        <h3
          style={{
            fontSize: "1.2rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          Hoofdvraag
        </h3>
        <p>
          <strong>{data.hoofdvraag}</strong>
        </p>
      </section>

      {/* Bronnen met afbeeldingen */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>Bronnen</h2>
        {data.sources.map((source) => (
          <article
            key={source.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "#fafafa",
            }}
          >
            <header style={{ marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>
                {source.title ?? `Bron ${source.id}`}
              </h3>
            </header>

            <div style={{ whiteSpace: "pre-wrap", marginBottom: "0.75rem" }}>
              {source.fullText}
            </div>

            {source.imageUrls && source.imageUrls.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                {source.imageUrls.map((url) => (
                  <figure key={url} style={{ margin: 0, marginBottom: "0.75rem" }}>
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(url)}`}
                      alt={source.caption ?? "Bronafbeelding"}
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    />
                    {source.caption && (
                      <figcaption
                        style={{
                          fontSize: "0.9rem",
                          color: "#555",
                          marginTop: "0.25rem",
                        }}
                      >
                        {source.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Bronvragen */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
          Vragen bij de bronnen
        </h2>
        <ol style={{ paddingLeft: "1.25rem" }}>
          {data.bronvragen.map((vraag, index) => (
            <li key={index} style={{ marginBottom: "0.35rem" }}>
              {vraag}
            </li>
          ))}
        </ol>
      </section>

      {/* Uitleg tabel & kwadrant */}
      <section>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
          Werken met tabel en kwadrant
        </h2>

        <h3
          style={{
            fontSize: "1.2rem",
            marginTop: "0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          De tabel
        </h3>
        <p>{data.tabelUitleg}</p>

        <h3
          style={{
            fontSize: "1.2rem",
            marginTop: "0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          Het kwadrant
        </h3>
        <p>{data.kwadrantUitleg}</p>

        <div
          style={{
            marginTop: "0.75rem",
            border: "1px dashed #bbb",
            borderRadius: "8px",
            padding: "0.75rem",
            fontSize: "0.95rem",
          }}
        >
          <p style={{ marginTop: 0, marginBottom: "0.25rem" }}>
            <strong>Aslabels voor het kwadrant:</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            <li>
              <strong>X-as links:</strong> {data.kwadrantAsLabels.X_links}
            </li>
            <li>
              <strong>X-as rechts:</strong> {data.kwadrantAsLabels.X_rechts}
            </li>
            <li>
              <strong>Y-as boven:</strong> {data.kwadrantAsLabels.Y_boven}
            </li>
            <li>
              <strong>Y-as onder:</strong> {data.kwadrantAsLabels.Y_onder}
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default LessonStep2aPage;


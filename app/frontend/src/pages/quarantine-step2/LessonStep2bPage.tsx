import React from "react";

interface KwadrantAsLabels {
  X_links: string;
  X_rechts: string;
  Y_boven: string;
  Y_onder: string;
}

interface LessonStep2bData {
  uitleg: string;
  tabelKolommen: string[];
  kwadrantAsLabels: KwadrantAsLabels;
}

/**
 * Mock-data voor een leeg werkblad: tabel + kwadrant.
 * Later vullen we dit met echte labels uit de backend.
 */
const mockLessonStep2bData: LessonStep2bData = {
  uitleg:
    "Gebruik dit werkblad om je observaties, interpretaties en de link met de hoofdvraag overzichtelijk te noteren. Plaats daarna belangrijke begrippen in het kwadrant.",
  tabelKolommen: [
    "Bron / begrippen",
    "Belangrijkste observaties",
    "Interpretatie",
    "Link met hoofdvraag",
  ],
  kwadrantAsLabels: {
    X_links: "Sterk bepaald door tijd en context",
    X_rechts: "Herkenbaar / van alle tijden",
    Y_boven: "Grote impact op samenleving",
    Y_onder: "Kleine impact / persoonlijk",
  },
};

const LessonStep2bPage: React.FC = () => {
  const data = mockLessonStep2bData;

  return (
    <div
      className="lesson-step2b-page"
      style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          Les Go – Stap 2b: Werkblad tabel & kwadrant
        </h1>
        <p style={{ margin: 0, fontStyle: "italic" }}>
          Sandbox-versie voor het printbare werkblad (landscape-tabellen en
          kwadrant).
        </p>
      </header>

      {/* Korte uitleg */}
      <section style={{ marginBottom: "1.5rem" }}>
        <p>{data.uitleg}</p>
      </section>

      {/* Lege tabel */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>
          Tabel – Observaties, interpretatie en link met hoofdvraag
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: "800px",
            }}
          >
            <thead>
              <tr>
                {data.tabelKolommen.map((kolom) => (
                  <th
                    key={kolom}
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      textAlign: "left",
                      backgroundColor: "#f0f0f0",
                    }}
                  >
                    {kolom}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Een paar lege rijen als voorbeeld – leerlingen vullen in op papier */}
              {[1, 2, 3, 4].map((row) => (
                <tr key={row}>
                  {data.tabelKolommen.map((kolom, index) => (
                    <td
                      key={kolom + index}
                      style={{
                        border: "1px solid #ddd",
                        padding: "0.75rem",
                        height: "3rem",
                      }}
                    >
                      {/* bewust leeg gelaten */}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Leeg kwadrant */}
      <section>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>
          Kwadrant – Context vs. herkenbaarheid en impact
        </h2>
        <div
          style={{
            border: "1px solid #aaa",
            borderRadius: "8px",
            padding: "1rem",
            height: "360px",
            position: "relative",
          }}
        >
          {/* As-lijnen */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "5%",
              right: "5%",
              height: "0",
              borderTop: "1px solid #888",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "8%",
              bottom: "8%",
              width: "0",
              borderLeft: "1px solid #888",
            }}
          />

          {/* Label X-links */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "6%",
              transform: "translateY(-50%)",
              fontSize: "0.9rem",
            }}
          >
            {data.kwadrantAsLabels.X_links}
          </div>

          {/* Label X-rechts */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: "6%",
              transform: "translateY(-50%)",
              textAlign: "right",
              fontSize: "0.9rem",
            }}
          >
            {data.kwadrantAsLabels.X_rechts}
          </div>

          {/* Label Y-boven */}
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "0.9rem",
            }}
          >
            {data.kwadrantAsLabels.Y_boven}
          </div>

          {/* Label Y-onder */}
          <div
            style={{
              position: "absolute",
              bottom: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "0.9rem",
            }}
          >
            {data.kwadrantAsLabels.Y_onder}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LessonStep2bPage;


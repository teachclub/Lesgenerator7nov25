import React from "react";

interface SamenwerkingKolom {
  naam: string;
  hints: string[];
}

interface SamenwerkingGroep {
  groepLabel: string;
  bronnenLabel: string;
  kolommen: SamenwerkingKolom[];
}

interface LessonStep3Data {
  inleiding: string;
  toelichting: string;
  groepen: SamenwerkingGroep[];
}

/**
 * Mock-data voor samenwerkingstabel (begrippen-hints).
 * Gericht op: observaties, interpretatie, link met hoofdvraag.
 */
const mockLessonStep3Data: LessonStep3Data = {
  inleiding:
    "In deze stap ga je samenwerken in groepjes. Jullie verdelen de bronnen en begrippen en helpen elkaar om de hoofdvraag beter te beantwoorden.",
  toelichting:
    "Gebruik de tabel hieronder als houvast. De begrippen zijn geen volledige zinnen, maar korte hints. Jullie taak is om deze begrippen om te zetten in eigen woorden en te koppelen aan concrete voorbeelden uit de bronnen.",
  groepen: [
    {
      groepLabel: "Groep A",
      bronnenLabel: "Bron 1–2",
      kolommen: [
        {
          naam: "Belangrijkste observaties",
          hints: ["jaartallen", "plaatsnaam", "betrokken groepen"],
        },
        {
          naam: "Interpretatie",
          hints: ["macht", "angst", "idealen"],
        },
        {
          naam: "Link met hoofdvraag",
          hints: ["denkwereld machthebbers", "reactie bevolking"],
        },
      ],
    },
    {
      groepLabel: "Groep B",
      bronnenLabel: "Bron 3–4",
      kolommen: [
        {
          naam: "Belangrijkste observaties",
          hints: ["symbool", "houding personen", "publiek"],
        },
        {
          naam: "Interpretatie",
          hints: ["propaganda", "protest", "identiteit"],
        },
        {
          naam: "Link met hoofdvraag",
          hints: ["beeldvorming", "normen en waarden"],
        },
      ],
    },
  ],
};

const LessonStep3Page: React.FC = () => {
  const data = mockLessonStep3Data;

  return (
    <div
      className="lesson-step3-page"
      style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          Les Go – Stap 3: Samenwerking & begrippen
        </h1>
        <p style={{ margin: 0, fontStyle: "italic" }}>
          Sandbox-versie voor de samenwerkingstabel met hints.
        </p>
      </header>

      {/* Inleiding & toelichting */}
      <section style={{ marginBottom: "1.5rem" }}>
        <p>{data.inleiding}</p>
        <p>{data.toelichting}</p>
      </section>

      {/* Tabel per groep */}
      {data.groepen.map((groep) => (
        <section key={groep.groepLabel} style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>
            {groep.groepLabel}
          </h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: "0.75rem",
              fontSize: "0.95rem",
              color: "#555",
            }}
          >
            Werkt met: <strong>{groep.bronnenLabel}</strong>
          </p>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                minWidth: "700px",
              }}
            >
              <thead>
                <tr>
                  {groep.kolommen.map((kolom) => (
                    <th
                      key={kolom.naam}
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.5rem",
                        textAlign: "left",
                        backgroundColor: "#f0f0f0",
                        verticalAlign: "top",
                      }}
                    >
                      {kolom.naam}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {groep.kolommen.map((kolom) => (
                    <td
                      key={kolom.naam}
                      style={{
                        border: "1px solid #ddd",
                        padding: "0.75rem",
                        verticalAlign: "top",
                      }}
                    >
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: "1.1rem",
                          listStyleType: "disc",
                          fontSize: "0.95rem",
                        }}
                      >
                        {kolom.hints.map((hint) => (
                          <li key={hint}>{hint}</li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
};

export default LessonStep3Page;


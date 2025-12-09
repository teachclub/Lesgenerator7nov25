import React from "react";

interface LessonStep4Data {
  inleiding: string;
  reflectievragen: string[];
}

/**
 * Mock-data voor reflectievragen gericht op:
 * - contextualisering
 * - verschil toen/nu
 * - normen en waarden
 * - rol van bronnen
 */
const mockLessonStep4Data: LessonStep4Data = {
  inleiding:
    "Tot slot kijk je terug op de les en de bronnen. Je denkt na over wat je hebt geleerd over het verleden én over hoe jij daar nu naar kijkt.",
  reflectievragen: [
    "Wat heeft je het meest verrast aan de denkwereld van mensen in de tijd waarover deze les ging?",
    "Welke verschillen zie je tussen de normen en waarden toen en die van jou (of onze samenleving) nu?",
    "Noem één voorbeeld uit een bron dat je helpt om de hoofdvraag beter te begrijpen. Waarom juist dit voorbeeld?",
    "Hoe betrouwbaar vind je de bronnen die je hebt gebruikt? Wat kun je ermee, en wat juist niet?",
    "Heeft deze les jouw kijk op dit historische onderwerp veranderd? Leg uit waarom wel of niet.",
  ],
};

const LessonStep4Page: React.FC = () => {
  const data = mockLessonStep4Data;

  return (
    <div
      className="lesson-step4-page"
      style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          Les Go – Stap 4: Reflectie
        </h1>
        <p style={{ margin: 0, fontStyle: "italic" }}>
          Sandbox-versie voor gerichte, beknopte reflectievragen.
        </p>
      </header>

      <section>
        <p style={{ marginBottom: "1rem" }}>{data.inleiding}</p>
        <ol style={{ paddingLeft: "1.25rem" }}>
          {data.reflectievragen.map((vraag, index) => (
            <li key={index} style={{ marginBottom: "0.5rem" }}>
              {vraag}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default LessonStep4Page;


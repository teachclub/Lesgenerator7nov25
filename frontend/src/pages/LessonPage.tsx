import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelectionStore, Source } from "../state/selection.store";

type Concept = {
  title: string;
  hook: string;
};

type DocentenInstructie = {
  wat: string;
  hoe: string;
  waarom: string;
};

type LesPlanning = {
  tabelMarkdown: string;
};

type Step1 = {
  docentenInstructie: DocentenInstructie;
  lesPlanning: LesPlanning;
};

type KwadrantLabels = {
  X_links: string;
  X_rechts: string;
  Y_boven: string;
  Y_onder: string;
};

type Step2 = {
  hoofdvraag: string;
  leerlingInleiding: string;
  kwadrantAsLabels: KwadrantLabels;
};

type BronVraag = {
  bronNummer: number;
  observeren: string;
  interpreteren: string;
  hoofdvraagRelatie: string;
};

type Step3 = {
  bronVragen: BronVraag[];
  samenwerkingTabelLeeg: string;
  kwadrantLeeg: string;
  reflectieOpdracht: string;
};

type BronAntwoord = {
  bronNummer: number;
  observerenAntwoord: string;
  interpreterenAntwoord: string;
  hoofdvraagRelatieAntwoord: string;
};

type Step4 = {
  samenwerkingTabelIngevuld: string;
  kwadrantIngevuld: string;
  bronAntwoorden: BronAntwoord[];
};

type FullLesson = {
  step1: Step1;
  step2: Step2;
  step3: Step3;
  step4: Step4;
};

type LocationState = {
  concept?: Concept;
};

type Status = "idle" | "loading" | "success" | "error";

// 👉 Rechtstreeks naar backend, Vite-proxy omzeilen
const API_BASE = "http://127.0.0.1:8081";

/**
 * Exact dezelfde image-logica als in A18.SelectionPanel:
 * - gebruikt source.imageUrl
 * - proxy voor Cito + Kleio (+ urls met 'kleio')
 */
const getImageUrl = (source: Source): string | null => {
  if (!source.imageUrl) return null;
  const url = source.imageUrl;
  // Proxy gebruiken voor Cito en Kleio
  const needsProxy =
    source.provider === "Cito" ||
    source.provider === "Kleio" ||
    url.includes("kleio");

  if (needsProxy) {
    return `http://localhost:8081/api/image-proxy?url=${encodeURIComponent(
      url
    )}`;
  }
  return url;
};

// Helper: Is dit een "echt" plaatje of een placeholder?
const isValidImage = (url?: string): boolean => {
  if (!url) return false;
  // Filter specifiek het grijze poppetje van Google/Cito
  if (url.includes("profile/picture")) return false;
  return true;
};

const getSourceText = (source: Source): string => {
  return (
    (source as any).fullText ||
    (source as any).content ||
    (source as any).description ||
    "Geen tekst beschikbaar."
  );
};

const LessonPage: React.FC = () => {
  const location = useLocation();
  const { concept } = (location.state || {}) as LocationState;

  // 🔥 Belangrijk: we gebruiken nu exact dezelfde bron-data als de selectie-kolom
  const { sources } = useSelectionStore();

  const [lesson, setLesson] = useState<FullLesson | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const hasInput = !!concept && Array.isArray(sources) && sources.length > 0;

  const handleGenerateLesson = async () => {
    if (!hasInput) {
      setError(
        "Er is geen concept of bronnen gevonden. Ga eerst terug en kies een lesvoorstel + bronnen."
      );
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/generate-lesson-v2/full`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          concept,
          sources,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Full lesson error:", text);
        throw new Error(
          `Backend-fout (${response.status}): ${response.statusText}`
        );
      }

      const data = (await response.json()) as {
        fullLesson?: FullLesson;
        [key: string]: any;
      };

      if (!data.fullLesson) {
        console.error("Onverwacht les-formaat ontvangen:", data);
        throw new Error(
          "De backend stuurde een les terug in een onverwacht formaat."
        );
      }

      setLesson(data.fullLesson);
      setStatus("success");
    } catch (err: any) {
      console.error("Fout bij het genereren van de les:", err);
      setError(err.message || "Onbekende fout bij het genereren van de les.");
      setStatus("error");
    }
  };

  const getBronVragenFor = (bronNummer: number): BronVraag | undefined =>
    lesson?.step3?.bronVragen?.find((b) => b.bronNummer === bronNummer);

  const getBronAntwoordenFor = (
    bronNummer: number
  ): BronAntwoord | undefined =>
    lesson?.step4?.bronAntwoorden?.find((b) => b.bronNummer === bronNummer);

  const renderMarkdownPre = (markdown?: string) => {
    if (!markdown) return null;
    return <pre className="markdown-block">{markdown}</pre>;
  };

  return (
    <div
      className="lesson-page"
      style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>
          Lessie Lesgenerator – Volledige les
        </h1>
        {concept ? (
          <>
            <h2 style={{ margin: 0 }}>{concept.title}</h2>
            {concept.hook && (
              <p style={{ marginTop: "0.25rem", fontStyle: "italic" }}>
                Verwonderingsvraag: {concept.hook}
              </p>
            )}
          </>
        ) : (
          <p style={{ color: "#b00" }}>
            Geen concept gevonden. Deze pagina verwacht een concept in{" "}
            <code>location.state</code>.
          </p>
        )}
      </header>

      <section
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleGenerateLesson}
          disabled={status === "loading" || !hasInput}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: 999,
            border: "none",
            cursor:
              status === "loading" || !hasInput ? "not-allowed" : "pointer",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
          }}
        >
          {status === "loading" ? "Les genereren..." : "Genereer volledige les"}
        </button>

        {status === "idle" && (
          <span style={{ fontSize: "0.9rem", color: "#555" }}>
            Gebruik de geselecteerde bronnen en het concept om een volledige les
            te genereren.
          </span>
        )}
        {status === "success" && (
          <span style={{ fontSize: "0.9rem", color: "#15803d" }}>
            Les succesvol gegenereerd.
          </span>
        )}
        {status === "error" && error && (
          <span style={{ fontSize: "0.9rem", color: "#b91c1c" }}>{error}</span>
        )}
      </section>

      {!hasInput && (
        <section style={{ marginBottom: "2rem", color: "#b91c1c" }}>
          <p>
            Er zijn geen bronnen of concept meegegeven. Ga terug naar de vorige
            stap en kies een lesvoorstel + bronnen.
          </p>
        </section>
      )}

      {/* Als er nog geen les is, maar wel input, kun je alvast de bronnen tonen */}
      {hasInput && !lesson && (
        <section style={{ marginBottom: "2rem" }}>
          <h3>Gekozen bronnen (preview)</h3>
          <p style={{ fontSize: "0.9rem", color: "#555" }}>
            Dit zijn de bronnen die naar de lesgenerator gestuurd worden.
          </p>
          <div style={{ display: "grid", gap: "1rem" }}>
            {sources.map((s, index) => {
              const hasImage = isValidImage(s.imageUrl);
              const imgUrl = hasImage ? getImageUrl(s) : null;

              return (
                <article
                  key={s.id ?? index}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.75rem",
                    padding: "0.75rem 1rem",
                    background: "#f9fafb",
                  }}
                >
                  <h4 style={{ margin: 0, marginBottom: "0.25rem" }}>
                    Bron {index + 1}
                    {s.title ? ` – ${s.title}` : ""}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "#6b7280",
                    }}
                  >
                    {s.provider && <>Provider: {s.provider} · </>}
                    {s.type && <>Type: {s.type}</>}
                  </p>

                  {imgUrl && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <img
                        src={imgUrl}
                        alt={s.title || `Afbeelding bron ${index + 1}`}
                        style={{
                          maxWidth: "100%",
                          borderRadius: "0.5rem",
                          display: "block",
                        }}
                        loading="lazy"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).style.display =
                            "none")
                        }
                      />
                    </div>
                  )}

                  <p
                    style={{
                      marginTop: "0.5rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {getSourceText(s)}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {lesson && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* DOCENTENVERSIE */}
          <section>
            <h2>Docentenversie</h2>
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
              }}
            >
              <article
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Docenteninstructie</h3>
                <p>
                  <strong>Wat:</strong>{" "}
                  {lesson.step1.docentenInstructie.wat}
                </p>
                <p>
                  <strong>Hoe:</strong>{" "}
                  {lesson.step1.docentenInstructie.hoe}
                </p>
                <p>
                  <strong>Waarom:</strong>{" "}
                  {lesson.step1.docentenInstructie.waarom}
                </p>
              </article>

              <article
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Lesplanning</h3>
                {renderMarkdownPre(lesson.step1.lesPlanning.tabelMarkdown)}
              </article>
            </div>
          </section>

          {/* LEERLINGENVERSIE – Inleiding + Hoofdvraag */}
          <section>
            <h2>Leerlingversie</h2>
            <article
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Inleiding & Hoofdvraag</h3>
              <p>
                <strong>Hoofdvraag:</strong> {lesson.step2.hoofdvraag}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {lesson.step2.leerlingInleiding}
              </p>
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.9rem",
                  color: "#4b5563",
                }}
              >
                <strong>Kwadrant-assen:</strong>{" "}
                {lesson.step2.kwadrantAsLabels.X_links} ↔{" "}
                {lesson.step2.kwadrantAsLabels.X_rechts} &nbsp; | &nbsp;
                {lesson.step2.kwadrantAsLabels.Y_boven} ↕{" "}
                {lesson.step2.kwadrantAsLabels.Y_onder}
              </p>
            </article>

            {/* Bronnen + vragen */}
            <article
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Bronnenonderzoek</h3>
              {sources && sources.length > 0 ? (
                <div style={{ display: "grid", gap: "1rem" }}>
                  {sources.map((s, index) => {
                    const bronNummer = index + 1;
                    const vragen = getBronVragenFor(bronNummer);
                    const antwoorden = getBronAntwoordenFor(bronNummer);
                    const hasImage = isValidImage(s.imageUrl);
                    const imgUrl = hasImage ? getImageUrl(s) : null;

                    return (
                      <div
                        key={s.id ?? bronNummer}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.75rem",
                          padding: "0.75rem 1rem",
                          background: "#f9fafb",
                        }}
                      >
                        <h4 style={{ marginTop: 0 }}>
                          Bron {bronNummer}
                          {s.title ? ` – ${s.title}` : ""}
                        </h4>
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: 0,
                          }}
                        >
                          {s.provider && <>Provider: {s.provider} · </>}
                          {s.type && <>Type: {s.type}</>}
                        </p>

                        {imgUrl && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <img
                              src={imgUrl}
                              alt={
                                s.title || `Afbeelding bron ${bronNummer}`
                              }
                              style={{
                                maxWidth: "100%",
                                borderRadius: "0.5rem",
                                display: "block",
                              }}
                              loading="lazy"
                              onError={(e) =>
                                ((e.target as HTMLImageElement).style.display =
                                  "none")
                              }
                            />
                          </div>
                        )}

                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {getSourceText(s)}
                        </p>

                        {vragen && (
                          <div style={{ marginTop: "0.75rem" }}>
                            <h5 style={{ margin: "0.5rem 0" }}>
                              Vragen bij deze bron
                            </h5>
                            <ol
                              style={{
                                paddingLeft: "1.25rem",
                                margin: 0,
                                listStyleType: "decimal",
                                listStylePosition: "outside",
                              }}
                            >
                              <li>{vragen.observeren}</li>
                              <li>{vragen.interpreteren}</li>
                              <li>{vragen.hoofdvraagRelatie}</li>
                            </ol>
                          </div>
                        )}

                        {antwoorden && (
                          <details style={{ marginTop: "0.75rem" }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                fontSize: "0.9rem",
                              }}
                            >
                              Voorbeeldantwoorden (docent)
                            </summary>
                            <div
                              style={{
                                marginTop: "0.5rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              <p>
                                <strong>Observeren:</strong>{" "}
                                {antwoorden.observerenAntwoord}
                              </p>
                              <p>
                                <strong>Interpreteren:</strong>{" "}
                                {antwoorden.interpreterenAntwoord}
                              </p>
                              <p>
                                <strong>Relatie met hoofdvraag:</strong>{" "}
                                {antwoorden.hoofdvraagRelatieAntwoord}
                              </p>
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>Geen bronnen gevonden.</p>
              )}
            </article>

            {/* Tabellen + reflectie */}
            <article
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Samenwerkingstabel (leerlingen)</h3>
              {renderMarkdownPre(lesson.step3.samenwerkingTabelLeeg)}
            </article>

            <article
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Context-kwadrant (leerlingen)</h3>
              {renderMarkdownPre(lesson.step3.kwadrantLeeg)}
            </article>

            <article
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Reflectieopdracht</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {lesson.step3.reflectieOpdracht}
              </p>
            </article>
          </section>

          {/* DOCENT – Antwoordmodellen / ingevulde tabellen */}
          <section>
            <h2>Docent – Antwoordmodel & ingevulde tabellen</h2>

            <article
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                Samenwerkingstabel (voorbeeldantwoorden)
              </h3>
              {renderMarkdownPre(lesson.step4.samenwerkingTabelIngevuld)}
            </article>

            <article
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                Context-kwadrant (voorbeeldinvulling)
              </h3>
              {renderMarkdownPre(lesson.step4.kwadrantIngevuld)}
            </article>
          </section>
        </div>
      )}
    </div>
  );
};

export default LessonPage;


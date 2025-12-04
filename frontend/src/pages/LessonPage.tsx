import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LessonConcept = {
  hoofdvraag?: string;
  hook?: string;
  context?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
};

type Source = {
  id: string | number;
  provider?: string;
  type?: string;
  title?: string;
  description?: string;
  fullText?: string;
  content?: string;
  url?: string | null;
  imageUrl?: string | null;
};

type Step1Data = {
  docentenInstructie?: {
    wat: string;
    hoe: string;
    waarom: string;
  };
  lesPlanning?: {
    tabelMarkdown: string;
  };
};

type BronVraag = {
  bronId: string | number;
  vragen: string[];
};

type InvulKolom = {
  id: string;
  label: string;
  omschrijving: string;
};

type InvulOpties = {
  kolomId: string;
  opties: string[];
};

type KwadrantLabels = {
  X_links: string;
  X_rechts: string;
  Y_boven: string;
  Y_onder: string;
};

type Step2Data = {
  hoofdvraag: string;
  leerlingInleiding: string;
  bronVragen: BronVraag[];
  invulTabel: {
    kolommen: InvulKolom[];
    meerkeuzeOpties: InvulOpties[];
  };
  kwadrantAsLabels?: KwadrantLabels;
  reflectieVragen: string[];
};

type Step3Data = {
  inleiding: string;
  bronnen: Source[];
  concept: LessonConcept;
};

type Step4Data = {
  bronAntwoorden: any[];
  invulTabelVoorbeeld: any[];
  kwadrantVoorbeelden: any[];
  reflectieVoorbeelden: string[];
};

type LessonState = {
  concept: LessonConcept;
  sources: Source[];
};

type ApiStepResponse<T> = {
  step: number;
  data: T;
};

function getImageProxy(url?: string | null): string | null {
  if (!url) return null;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

const LessonPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state as LessonState | undefined) || undefined;

  const [concept] = useState<LessonConcept | null>(state?.concept || null);
  const [sources] = useState<Source[]>(state?.sources || []);

  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null);
  const [step4Data, setStep4Data] = useState<Step4Data | null>(null);

  const [loadingStep1, setLoadingStep1] = useState(false);
  const [loadingStep2, setLoadingStep2] = useState(false);
  const [loadingStep3, setLoadingStep3] = useState(false);
  const [loadingStep4, setLoadingStep4] = useState(false);

  const [errorStep1, setErrorStep1] = useState<string | null>(null);
  const [errorStep2, setErrorStep2] = useState<string | null>(null);
  const [errorStep3, setErrorStep3] = useState<string | null>(null);
  const [errorStep4, setErrorStep4] = useState<string | null>(null);

  if (!concept || sources.length === 0) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <p>
          Geen lesdata gevonden. Keer terug naar de startpagina en kies eerst
          een lesvoorstel.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Terug naar start
        </button>
      </div>
    );
  }

  async function callStep<T>(
    step: 1 | 2 | 3 | 4,
    bodyExtra: any,
    setData: (d: T) => void,
    setError: (e: string | null) => void,
    setLoading: (b: boolean) => void
  ) {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/generate-lesson-v2/step${step}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          sources,
          ...bodyExtra,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`status ${res.status}: ${text}`);
      }

      const json = (await res.json()) as ApiStepResponse<T>;
      setData(json.data);
    } catch (err: any) {
      console.error(`step${step} error`, err);
      setError(err?.message || "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }

  const handleStep1 = () =>
    callStep<Step1Data>(1, {}, setStep1Data, setErrorStep1, setLoadingStep1);

  const handleStep2 = () =>
    callStep<Step2Data>(2, {}, setStep2Data, setErrorStep2, setLoadingStep2);

  const handleStep3 = () =>
    callStep<Step3Data>(3, {}, setStep3Data, setErrorStep3, setLoadingStep3);

  const handleStep4 = () =>
    callStep<Step4Data>(
      4,
      { step2Data },
      setStep4Data,
      setErrorStep4,
      setLoadingStep4
    );

  function renderError(msg: string | null) {
    if (!msg) return null;
    return (
      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          borderRadius: "0.75rem",
          background: "#fee2e2",
          color: "#991b1b",
          fontSize: "0.9rem",
        }}
      >
        {msg}
      </div>
    );
  }

  function renderMarkdownTable(md: string | undefined) {
    if (!md) return null;
    const lines = md.trim().split("\n");
    if (lines.length < 2) {
      return <pre>{md}</pre>;
    }

    const headerLine = lines[0];
    const headerCells = headerLine
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    const bodyLines = lines.slice(2);

    return (
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "0.5rem",
          fontSize: "0.9rem",
        }}
      >
        <thead>
          <tr>
            {headerCells.map((cell, idx) => (
              <th
                key={idx}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "0.25rem 0.5rem",
                  textAlign: "left",
                  background: "#f9fafb",
                }}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyLines.map((line, rowIdx) => {
            const cells = line
              .split("|")
              .map((c) => c.trim())
              .filter(Boolean);
            if (cells.length === 0) return null;
            return (
              <tr key={rowIdx}>
                {cells.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "0.25rem 0.5rem",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  function renderBronVragen() {
    if (!step2Data) return null;
    if (!step2Data.bronVragen || step2Data.bronVragen.length === 0) {
      return (
        <p style={{ fontSize: "0.9rem" }}>
          Geen bronvragen ontvangen in de JSON-output.
        </p>
      );
    }

    return (
      <div style={{ marginTop: "0.5rem" }}>
        {step2Data.bronVragen.map((bv, idx) => (
          <div
            key={`${bv.bronId}-${idx}`}
            style={{
              marginBottom: "0.75rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px dashed #e5e7eb",
            }}
          >
            <h4
              style={{
                margin: 0,
                marginBottom: "0.25rem",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              Bron {bv.bronId}
            </h4>
            <ol
              style={{
                margin: 0,
                paddingLeft: "1.25rem",
                fontSize: "0.9rem",
              }}
            >
              {bv.vragen.map((vraag, i) => (
                <li key={i}>{vraag}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  }

  function renderInvulTabelStructuur() {
    if (!step2Data) return null;
    const kolommen = step2Data.invulTabel?.kolommen || [];

    if (kolommen.length === 0) {
      return (
        <p style={{ fontSize: "0.9rem" }}>
          Geen invultabel-structuur ontvangen in de JSON-output.
        </p>
      );
    }

    // 4 lege rijen voor preview
    const emptyRows = [1, 2, 3, 4];

    return (
      <div style={{ marginTop: "0.5rem" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.9rem",
          }}
        >
          <thead>
            <tr>
              {kolommen.map((k) => (
                <th
                  key={k.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "0.4rem 0.6rem",
                    textAlign: "left",
                    background: "#f9fafb",
                  }}
                >
                  {k.label}
                </th>
              ))}
            </tr>
            <tr>
              {kolommen.map((k) => (
                <td
                  key={`${k.id}-desc`}
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "0.35rem 0.6rem",
                    fontSize: "0.8rem",
                    color: "#4b5563",
                  }}
                >
                  {k.omschrijving}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {emptyRows.map((row) => (
              <tr key={row}>
                {kolommen.map((k) => (
                  <td
                    key={`${k.id}-${row}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "0.75rem 0.6rem",
                      height: "2rem",
                    }}
                  >
                    {/* lege cel voor leerlingeninvulling */}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#6b7280",
          }}
        >
          Preview: leerlingen krijgen deze structuur met lege cellen om hun
          observaties, interpretaties en link met de hoofdvraag in te vullen.
        </p>
      </div>
    );
  }

  function renderKwadrantStructuur() {
    if (!step2Data || !step2Data.kwadrantAsLabels) {
      return (
        <p style={{ fontSize: "0.9rem" }}>
          Geen kwadrant-labels ontvangen in de JSON-output.
        </p>
      );
    }

    const labels = step2Data.kwadrantAsLabels;

    return (
      <div
        style={{
          marginTop: "0.5rem",
          maxWidth: "420px",
          border: "1px solid #e5e7eb",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            fontSize: "0.85rem",
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                  height: "3rem",
                }}
              />
              <td
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  textAlign: "center",
                  fontWeight: 600,
                  padding: "0.3rem",
                }}
              >
                {labels.Y_boven}
              </td>
              <td
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  borderLeft: "1px solid #e5e7eb",
                }}
              />
            </tr>
            <tr>
              <td
                style={{
                  borderRight: "1px solid #e5e7eb",
                  textAlign: "center",
                  fontWeight: 600,
                  padding: "0.3rem",
                }}
              >
                {labels.X_links}
              </td>
              <td
                style={{
                  borderLeft: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                  height: "3rem",
                }}
              />
              <td
                style={{
                  borderLeft: "1px solid #e5e7eb",
                  textAlign: "center",
                  fontWeight: 600,
                  padding: "0.3rem",
                }}
              >
                {labels.X_rechts}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  borderTop: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                }}
              />
              <td
                style={{
                  borderTop: "1px solid #e5e7eb",
                  textAlign: "center",
                  fontWeight: 600,
                  padding: "0.3rem",
                }}
              >
                {labels.Y_onder}
              </td>
              <td
                style={{
                  borderTop: "1px solid #e5e7eb",
                  borderLeft: "1px solid #e5e7eb",
                }}
              />
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const allSources = step3Data?.bronnen ?? sources;

  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: "1rem",
          background: "#f3f4f6",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
          Lesgenerator – Les Go v2
        </h1>
        <p
          style={{
            marginTop: "0.25rem",
            fontSize: "0.9rem",
            color: "#4b5563",
          }}
        >
          Tijdvak {concept.tvLabel || concept.tv || "onbekend"} · Kenmerkend
          aspect {concept.kaLabel || concept.ka || "onbekend"}
        </p>
        <p
          style={{
            marginTop: "0.25rem",
            fontSize: "0.9rem",
            color: "#111827",
          }}
        >
          <strong>Hoofdvraag (concept):</strong>{" "}
          {concept.hoofdvraag ||
            "Hoe keken mensen in die tijd zelf naar dit onderwerp?"}
        </p>

        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={handleStep1}
            disabled={loadingStep1}
            style={{
              borderRadius: "999px",
              padding: "0.4rem 0.9rem",
              border: "none",
              cursor: "pointer",
              background: "#4f46e5",
              color: "white",
              fontSize: "0.85rem",
            }}
          >
            {loadingStep1 ? "Bezig..." : "Les opnieuw genereren (step 1)"}
          </button>
          <button
            onClick={handleStep2}
            disabled={loadingStep2}
            style={{
              borderRadius: "999px",
              padding: "0.4rem 0.9rem",
              border: "none",
              cursor: "pointer",
              background: "#eab308",
              color: "#111827",
              fontSize: "0.85rem",
            }}
          >
            {loadingStep2 ? "Bezig..." : "Genereer leerlinggedeelte (step 2)"}
          </button>
          <button
            onClick={handleStep3}
            disabled={loadingStep3}
            style={{
              borderRadius: "999px",
              padding: "0.4rem 0.9rem",
              border: "none",
              cursor: "pointer",
              background: "#0ea5e9",
              color: "white",
              fontSize: "0.85rem",
            }}
          >
            {loadingStep3 ? "Bezig..." : "Genereer bronnenblad (step 3)"}
          </button>
          <button
            onClick={handleStep4}
            disabled={loadingStep4}
            style={{
              borderRadius: "999px",
              padding: "0.4rem 0.9rem",
              border: "none",
              cursor: "pointer",
              background: "#15803d",
              color: "white",
              fontSize: "0.85rem",
            }}
          >
            {loadingStep4 ? "Bezig..." : "Genereer antwoordmodel (step 4)"}
          </button>
        </div>
      </header>

      {renderError(errorStep1)}
      {renderError(errorStep2)}
      {renderError(errorStep3)}
      {renderError(errorStep4 && `Fout bij step 4 (antwoordmodel): ${errorStep4}`)}

      {/* Input: concept & bronnen */}
      <section
        style={{
          marginTop: "1rem",
          padding: "1rem 1.25rem",
          borderRadius: "1rem",
          border: "1px solid #e5e7eb",
          background: "white",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
          Input voor de les (concept & bronnen)
        </h2>

        <div
          style={{
            marginTop: "0.75rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: "0.25rem",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Lesconcept
          </h3>
          <p style={{ margin: 0 }}>
            <strong>Hoofdvraag:</strong>{" "}
            {concept.hoofdvraag ||
              "Hoe keken mensen in die tijd zelf naar dit onderwerp?"}
          </p>
          {concept.hook && (
            <p style={{ margin: "0.25rem 0 0" }}>
              <strong>Hook:</strong> {concept.hook}
            </p>
          )}
          {concept.context && (
            <p style={{ margin: "0.25rem 0 0" }}>
              <strong>Context:</strong> {concept.context}
            </p>
          )}
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Bronnen ({allSources.length})
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
              marginTop: "0.5rem",
            }}
          >
            {allSources.map((source, index) => {
              const imgUrl = getImageProxy(source.imageUrl || undefined);
              const fullText =
                source.fullText || source.content || source.description || "";

              return (
                <article
                  key={source.id ?? index}
                  style={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    padding: "0.75rem",
                    background: "#f9fafb",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      Bron {index + 1}
                    </div>
                    <div
                      style={{
                        padding: "0.1rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        background:
                          source.provider === "Kleio" ? "#dbf4ff" : "#e5e7eb",
                        color:
                          source.provider === "Kleio" ? "#0369a1" : "#374151",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {source.provider || "Onbekend"}
                    </div>
                  </div>

                  {imgUrl && (
                    <div
                      style={{
                        marginBottom: "0.5rem",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        background: "transparent",
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={source.title || source.description || ""}
                        style={{
                          display: "block",
                          width: "100%",
                          height: "auto",
                          maxHeight: "260px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}

                  {source.title && (
                    <h4
                      style={{
                        margin: 0,
                        marginBottom: "0.25rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                      }}
                    >
                      {source.title}
                    </h4>
                  )}

                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#4b5563",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {fullText}
                  </p>

                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.8rem",
                        color: "#2563eb",
                      }}
                    >
                      Bekijk origineel ↗
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* STEP 1 – docent */}
      {step1Data && (
        <section
          style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
            border: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            Docenteninstructie (step 1)
          </h2>

          <h3 style={{ margin: "0.5rem 0 0.25rem", fontSize: "0.95rem" }}>
            Wat
          </h3>
          <p style={{ margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
            {step1Data.docentenInstructie?.wat}
          </p>

          <h3 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.95rem" }}>
            Hoe
          </h3>
          <p style={{ margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
            {step1Data.docentenInstructie?.hoe}
          </p>

          <h3 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.95rem" }}>
            Waarom
          </h3>
          <p style={{ margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
            {step1Data.docentenInstructie?.waarom}
          </p>

          <h3 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.95rem" }}>
            Lesplanning
          </h3>
          {renderMarkdownTable(step1Data.lesPlanning?.tabelMarkdown)}
        </section>
      )}

      {/* STEP 2 – leerlingmateriaal */}
      {step2Data && (
        <section
          style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
            border: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            Leerlinggedeelte (step 2 – preview)
          </h2>

          <h3 style={{ margin: "0.25rem 0", fontSize: "0.95rem" }}>
            Hoofdvraag (leerling)
          </h3>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>{step2Data.hoofdvraag}</p>

          <h3 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.95rem" }}>
            Inleiding
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {step2Data.leerlingInleiding}
          </p>

          <h3 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.95rem" }}>
            Bronvragen (per bron, genummerd)
          </h3>
          {renderBronVragen()}

          <h3 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.95rem" }}>
            Invultabel (structuur – lege cellen)
          </h3>
          {renderInvulTabelStructuur()}

          <h3 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.95rem" }}>
            Kwadrant (structuur – 4 subdimensies op de assen)
          </h3>
          {renderKwadrantStructuur()}

          <h3 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.95rem" }}>
            Reflectievragen (kort overzicht)
          </h3>
          <ul
            style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}
          >
            {step2Data.reflectieVragen.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      {/* STEP 3 – bronnenblad preview */}
      {step3Data && (
        <section
          style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
            border: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            Bronnenblad (step 3 – preview)
          </h2>
          <p style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
            {step3Data.inleiding}
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.8rem",
              color: "#6b7280",
            }}
          >
            Dit is in feite hetzelfde bronnenoverzicht als boven, maar dan in
            de structuur van het bronnenblad voor export.
          </p>
        </section>
      )}

      {/* STEP 4 – antwoordmodel preview */}
      {step4Data && (
        <section
          style={{
            marginTop: "1.25rem",
            marginBottom: "2rem",
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
            border: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            Antwoordmodel (step 4 – preview)
          </h2>
          <p
            style={{
              fontSize: "0.9rem",
              marginBottom: "0.5rem",
            }}
          >
            Dit is een verkorte preview van het antwoordmodel. Voor gebruik in
            de les exporteer je dit later als los docentbestand.
          </p>
          <pre
            style={{
              margin: 0,
              padding: "0.75rem",
              borderRadius: "0.75rem",
              background: "#f3f4f6",
              fontSize: "0.8rem",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(step4Data, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
};

export default LessonPage;


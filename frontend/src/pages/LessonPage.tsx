import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

type Concept = {
  hoofdvraag?: string;
  hook?: string;
  context?: string;
  [key: string]: any;
};

type Source = {
  id: number | string;
  title?: string;
  type?: string;
  fullText?: string;
  content?: string;
  description?: string;
  [key: string]: any;
};

type DocentenInstructie = {
  wat: string;
  hoe: string;
  waarom: string;
};

type LesPlanning = {
  tabelMarkdown: string;
};

type Step1Data = {
  docentenInstructie: DocentenInstructie;
  lesPlanning: LesPlanning;
};

type KwadrantAsLabels = {
  X_links: string;
  X_rechts: string;
  Y_boven: string;
  Y_onder: string;
};

type Step2Data = {
  hoofdvraag: string;
  leerlingInleiding: string;
  kwadrantAsLabels: KwadrantAsLabels;
};

type LocationState = {
  tv?: number;
  ka?: string;
  tvLabel?: string;
  kaLabel?: string;
  concept?: Concept;
  sources?: Source[];
};

const LessonPage: React.FC = () => {
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const [loadingStep1, setLoadingStep1] = useState(false);
  const [loadingStep2, setLoadingStep2] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);

  // Kleine helper: payload bouwen uit state, met een veilige fallback
  const buildPayload = useCallback(() => {
    const {
      tv = 10,
      ka = "KA47",
      tvLabel = "Tijdvak 10",
      kaLabel = "KA47 voorbeeld",
      concept,
      sources,
    } = state;

    const fallbackConcept: Concept = {
      hoofdvraag:
        concept?.hoofdvraag ||
        "Waarom dachten mensen toen dat dit logisch was?",
      hook: concept?.hook || "Waarom deden ze dit eigenlijk?",
      context:
        concept?.context ||
        "Leerlingen denken nu dat dit vanzelfsprekend of dom was.",
      ...concept,
    };

    const fallbackSources: Source[] =
      sources && sources.length > 0
        ? sources
        : [
            {
              id: 1,
              title: "Bron 1 (fallback)",
              type: "tekst",
              fullText:
                "Dit is een testbron... (fallback omdat er geen bronnen in state zaten).",
            },
          ];

    return {
      tv,
      ka,
      tvLabel,
      kaLabel,
      concept: fallbackConcept,
      sources: fallbackSources,
    };
  }, [state]);

  const fetchStep1 = useCallback(async () => {
    try {
      setLoadingStep1(true);
      setError(null);

      const payload = buildPayload();

      const res = await fetch("/api/generate-lesson-v2/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Step1 failed: ${res.status} ${res.statusText} – ${text}`,
        );
      }

      const json = await res.json();
      if (!json || !json.data) {
        throw new Error("Onverwachte response-structuur van step1-endpoint.");
      }

      setStep1Data(json.data as Step1Data);
    } catch (e: any) {
      console.error("[LessonPage] step1 error:", e);
      setError(e.message || "Er ging iets mis bij het ophalen van de les (step 1).");
    } finally {
      setLoadingStep1(false);
    }
  }, [buildPayload]);

  const fetchStep2 = useCallback(async () => {
    try {
      setLoadingStep2(true);
      setError(null);

      const payload = buildPayload();

      const res = await fetch("/api/generate-lesson-v2/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Step2 failed: ${res.status} ${res.statusText} – ${text}`,
        );
      }

      const json = await res.json();
      if (!json || !json.data) {
        throw new Error("Onverwachte response-structuur van step2-endpoint.");
      }

      setStep2Data(json.data as Step2Data);
    } catch (e: any) {
      console.error("[LessonPage] step2 error:", e);
      setError(
        e.message ||
          "Er ging iets mis bij het ophalen van de leerlinginleiding (step 2).",
      );
    } finally {
      setLoadingStep2(false);
    }
  }, [buildPayload]);

  // Optioneel: automatisch step1 laden bij binnenkomen
  useEffect(() => {
    fetchStep1();
  }, [fetchStep1]);

  const handleRegenerateStep1 = () => {
    fetchStep1();
  };

  const handleGenerateStep2 = () => {
    fetchStep2();
  };

  const isAnyLoading = loadingStep1 || loadingStep2;

  return (
    <div className="lesson-page" style={{ padding: "1.5rem", maxWidth: 1000 }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Lesgenerator – Les Go v2</h1>
        <p style={{ color: "#555", margin: 0 }}>
          Tijdvak {state.tv ?? 10} · {state.tvLabel ?? "Tijdvak 10"} –{" "}
          {state.ka ?? "KA47"} · {state.kaLabel ?? "KA47 voorbeeld"}
        </p>
      </header>

      <section
        style={{
          marginBottom: "1rem",
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleRegenerateStep1}
          disabled={loadingStep1 || isAnyLoading}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 6,
            border: "1px solid #ccc",
            cursor: isAnyLoading ? "wait" : "pointer",
          }}
        >
          {loadingStep1 ? "Les genereren…" : "Les opnieuw genereren (step 1)"}
        </button>

        <button
          type="button"
          onClick={handleGenerateStep2}
          disabled={loadingStep2 || isAnyLoading}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 6,
            border: "1px solid #ccc",
            cursor: isAnyLoading ? "wait" : "pointer",
          }}
        >
          {loadingStep2
            ? "Leerlinggedeelte genereren…"
            : "Genereer leerlinggedeelte (step 2)"}
        </button>
      </section>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 6,
            background: "#ffe5e5",
            border: "1px solid #ffaaaa",
            color: "#660000",
            whiteSpace: "pre-wrap",
          }}
        >
          <strong>Fout:</strong> {error}
        </div>
      )}

      {!step1Data && !isAnyLoading && !error && (
        <p style={{ color: "#777" }}>
          Nog geen les geladen. Klik op{" "}
          <em>“Les opnieuw genereren (step 1)”</em> om te starten.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* DOCENTENINSTRUCTIE – STEP 1 */}
        {step1Data && (
          <section
            style={{
              padding: "1rem 1.25rem",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Docenteninstructie (step 1)</h2>
            <div style={{ marginBottom: "0.75rem" }}>
              <h3 style={{ marginBottom: "0.25rem" }}>Wat</h3>
              <p style={{ marginTop: 0 }}>{step1Data.docentenInstructie.wat}</p>
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <h3 style={{ marginBottom: "0.25rem" }}>Hoe</h3>
              <p style={{ marginTop: 0 }}>{step1Data.docentenInstructie.hoe}</p>
            </div>
            <div>
              <h3 style={{ marginBottom: "0.25rem" }}>Waarom</h3>
              <p style={{ marginTop: 0 }}>
                {step1Data.docentenInstructie.waarom}
              </p>
            </div>
          </section>
        )}

        {/* LESPLANNING – STEP 1 */}
        {step1Data && (
          <section
            style={{
              padding: "1rem 1.25rem",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Lesplanning (Markdown-tabel)</h2>
            <p style={{ marginTop: 0, color: "#666" }}>
              Dit is de Markdown-tabel zoals het backend-endpoint step1 die
              aanlevert. Je kunt deze later door je eigen Markdown-component
              laten renderen.
            </p>
            <pre
              style={{
                background: "#f7f7f7",
                padding: "0.75rem",
                borderRadius: 6,
                overflowX: "auto",
                fontSize: "0.9rem",
                lineHeight: 1.4,
              }}
            >
{step1Data.lesPlanning.tabelMarkdown}
            </pre>
          </section>
        )}

        {/* LEERLINGINLEIDING & KWADRANT – STEP 2 */}
        {step2Data && (
          <section
            style={{
              padding: "1rem 1.25rem",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Leerlinginleiding & kwadrant (step 2)
            </h2>

            <div style={{ marginBottom: "0.75rem" }}>
              <h3 style={{ marginBottom: "0.25rem" }}>Hoofdvraag</h3>
              <p style={{ marginTop: 0 }}>{step2Data.hoofdvraag}</p>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <h3 style={{ marginBottom: "0.25rem" }}>Inleiding voor leerlingen</h3>
              <p
                style={{
                  marginTop: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {step2Data.leerlingInleiding}
              </p>
            </div>

            <div>
              <h3 style={{ marginBottom: "0.25rem" }}>Kwadrant-assen</h3>
              <table
                style={{
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.25rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      X-links
                    </td>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      {step2Data.kwadrantAsLabels.X_links}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.25rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      X-rechts
                    </td>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      {step2Data.kwadrantAsLabels.X_rechts}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.25rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      Y-boven
                    </td>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      {step2Data.kwadrantAsLabels.Y_boven}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.25rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      Y-onder
                    </td>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      {step2Data.kwadrantAsLabels.Y_onder}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default LessonPage;


import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type TvKaInfo = {
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

type LessonConcept = {
  hoofdvraag?: string;
  hook?: string;
  context?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
};

const LessonStep3Page: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as {
    tvKa?: TvKaInfo;
    concept?: LessonConcept;
    sources?: Source[];
  };

  const tvKa: TvKaInfo = state.tvKa || {};
  const concept: LessonConcept = state.concept || {};
  const sources: Source[] = state.sources || [];

  const numberedSources = useMemo(
    () =>
      (sources || []).map((s, index) => ({
        ...s,
        displayNumber: index + 1,
      })),
    [sources]
  );

  const hasSources = numberedSources.length > 0;

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Stap 3 – Bronnenblad</h1>

      <p
        style={{
          marginBottom: "0.75rem",
          fontSize: "0.9rem",
          maxWidth: "900px",
        }}
      >
        Dit is het bronnenblad voor de les. De bronnen zijn genummerd als{" "}
        <strong>Bron 1, Bron 2, …</strong>. Gebruik deze nummers in de
        opdrachten en in het antwoordmodel. Interne IDs zoals{" "}
        <code>cito-543</code> worden hier bewust niet getoond.
      </p>

      {(tvKa.tvLabel || tvKa.kaLabel || concept.hoofdvraag) && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
            fontSize: "0.85rem",
          }}
        >
          {tvKa.tvLabel && (
            <div style={{ marginBottom: "0.25rem" }}>
              <strong>Tijdvak:</strong> {tvKa.tvLabel}
            </div>
          )}
          {tvKa.kaLabel && (
            <div style={{ marginBottom: "0.25rem" }}>
              <strong>Kenmerkend aspect:</strong> {tvKa.kaLabel}
            </div>
          )}
          {concept.hoofdvraag && (
            <div>
              <strong>Hoofdvraag:</strong> {concept.hoofdvraag}
            </div>
          )}
        </div>
      )}

      {!hasSources && (
        <div
          style={{
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid #ffb3b3",
            backgroundColor: "#ffe6e6",
            fontSize: "0.85rem",
          }}
        >
          Er zijn geen bronnen doorgegeven aan deze stap. Ga terug naar de
          vorige stap en controleer of de bronnen correct zijn meegegeven.
        </div>
      )}

      {hasSources && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1rem",
          }}
        >
          {numberedSources.map((source) => {
            const provider = (source.provider || "").toLowerCase();
            const isKleio = provider.includes("kleio");

            const mainText =
              source.fullText || source.content || source.description || "";

            return (
              <div
                key={source.id}
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid #dddddd",
                  padding: "0.75rem",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  minHeight: "180px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    alignItems: "baseline",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                      backgroundColor: "#f3f4ff",
                      border: "1px solid #d0d4ff",
                    }}
                  >
                    Bron {String((source as any).displayNumber)}
                  </div>
                  {source.provider && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#555",
                        textAlign: "right",
                      }}
                    >
                      {source.provider}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    marginTop: "0.2rem",
                    wordBreak: "break-word",
                  }}
                >
                  {source.title || "Zonder titel"}
                </div>

                {mainText && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      marginTop: "0.2rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {mainText}
                  </div>
                )}

                {source.imageUrl && (
                  <div style={{ marginTop: "0.35rem" }}>
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(
                        source.imageUrl
                      )}`}
                      alt={
                        source.title ||
                        `Bron ${String((source as any).displayNumber)}`
                      }
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: "0.5rem",
                        border: "1px solid #e5e5e5",
                      }}
                    />
                  </div>
                )}

                {isKleio && source.url && (
                  <div style={{ marginTop: "0.35rem" }}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: "0.8rem",
                        textDecoration: "none",
                        color: "#2563eb",
                      }}
                    >
                      Bekijk bron in originele context
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "1.25rem" }}>
        <button
          type="button"
          onClick={goBack}
          style={{
            fontSize: "0.85rem",
            padding: "0.4rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid #cccccc",
            backgroundColor: "#f5f5f5",
            cursor: "pointer",
          }}
        >
          ← Terug naar vorige stap
        </button>
      </div>
    </div>
  );
};

export default LessonStep3Page;


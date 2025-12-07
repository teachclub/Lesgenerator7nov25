import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Location } from "history";
import { TvKaOption } from "../data/tvKaPresets";

type LessonProposal = {
  id?: string | number;
  title?: string;
  hoofdvraag?: string;
  hook?: string;
  context?: string;
  description?: string;
  [key: string]: unknown;
};

type Step1Response = {
  concept?: {
    hoofdvraag?: string;
    hook?: string;
    context?: string;
    tv?: number | string;
    tvLabel?: string;
    ka?: string;
    kaLabel?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type LocationState = {
  step1Data?: Step1Response | null;
  proposal?: LessonProposal;
  selectedTvKa?: TvKaOption | null;
};

const LessonStep2Page: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as Location & { state?: LocationState };

  const step1Data = location.state?.step1Data ?? null;
  const proposal = location.state?.proposal;
  const selectedTvKa = location.state?.selectedTvKa ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Data, setStep2Data] = useState<unknown | null>(null);

  if (!step1Data || !selectedTvKa) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Lesgenerator – Stap 2</h1>
        <p>
          Er is geen stap 1-output of TV/KA-informatie meegegeven. Ga terug
          naar stap 1.
        </p>
        <button
          type="button"
          onClick={() => navigate("/lesson/step1")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
          }}
        >
          ← Terug naar Stap 1
        </button>
      </div>
    );
  }

  const handleGenerateStep2 = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    setStep2Data(null);

    try {
      const body = {
        // Geef de volledige step1Data door als input voor stap 2:
        step1Data,
        proposal,
        tvKa: {
          tv: selectedTvKa.tv,
          tvLabel: selectedTvKa.tvLabel,
          ka: selectedTvKa.ka,
          kaLabel: selectedTvKa.kaLabel,
        },
      };

      const response = await fetch("/api/generate-lesson-v2/step2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Serverfout (${response.status}): ${text || response.statusText}`
        );
      }

      const data = await response.json();
      setStep2Data(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Er ging iets mis bij het genereren van stap 2."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = (): void => {
    navigate("/lesson/step1", {
      state: { proposal, selectedTvKa },
    });
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
        Lessie / LesGO – Stap 2
      </h1>

      {/* Contextblok */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          Context: tijdvak, KA en hoofdvraag
        </h2>
        <p style={{ margin: 0 }}>
          <strong>Tijdvak:</strong> {selectedTvKa.tvLabel}
          <br />
          <strong>KA:</strong> {selectedTvKa.kaLabel}
        </p>
        {step1Data.concept?.hoofdvraag && (
          <p style={{ marginTop: "0.5rem" }}>
            <strong>Hoofdvraag (Stap 1):</strong>{" "}
            {step1Data.concept.hoofdvraag}
          </p>
        )}
      </section>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={handleGenerateStep2}
          disabled={loading}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Bezig met genereren..." : "Genereer Stap 2-les"}
        </button>

        <button
          type="button"
          onClick={handleGoBack}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
          }}
        >
          ← Terug naar Stap 1
        </button>
      </div>

      {/* Foutmelding */}
      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            borderRadius: 4,
            backgroundColor: "#ffe6e6",
            color: "#a00",
          }}
        >
          {error}
        </div>
      )}

      {/* Debug-weergave van Step2-output */}
      {step2Data && (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "1rem",
            marginTop: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Output Stap 2 (ruwe weergave)
          </h2>
          <pre
            style={{
              maxHeight: 400,
              overflow: "auto",
              background: "#f7f7f7",
              padding: "0.75rem",
              borderRadius: 4,
              fontSize: "0.85rem",
            }}
          >
            {JSON.stringify(step2Data, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
};

export default LessonStep2Page;


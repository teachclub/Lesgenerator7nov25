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

type LocationState = {
  proposal?: LessonProposal;
  selectedTvKa?: TvKaOption | null;
};

type Step1Response = {
  // Houd het bewust flexibel: MP6 kan veel velden teruggeven.
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
  // Vaak komen hier ook docent-/leerlingversies/projectdelen in terug:
  docentVersie?: unknown;
  leerlingVersie?: unknown;
  bronnen?: unknown;
  [key: string]: unknown;
};

const LessonStep1Page: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as Location & { state?: LocationState };

  const proposal = location.state?.proposal;
  const selectedTvKa = location.state?.selectedTvKa ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step1Data, setStep1Data] = useState<Step1Response | null>(null);

  if (!proposal || !selectedTvKa) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Lesgenerator – Stap 1</h1>
        <p>
          Er is geen voorstel of tijdvak/Kenmerkend Aspect meegegeven. Ga terug
          naar de lesvoorstellenpagina en kies opnieuw.
        </p>
        <button
          type="button"
          onClick={() => navigate("/proposals")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
          }}
        >
          ← Terug naar lesvoorstellen
        </button>
      </div>
    );
  }

  const handleGenerateStep1 = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    setStep1Data(null);

    try {
      const body = {
        concept: {
          // Basis uit gekozen proposal:
          // (MP6 gebruikt dit als startpunt voor hoofdvraag/hook/context.)
          ...proposal,
          // En expliciet het tv/ka-blok erbij:
          tv: selectedTvKa.tv,
          tvLabel: selectedTvKa.tvLabel,
          ka: selectedTvKa.ka,
          kaLabel: selectedTvKa.kaLabel,
        },
        // Extra veld (optioneel) als backend dat prettig vindt:
        tvKa: {
          tv: selectedTvKa.tv,
          tvLabel: selectedTvKa.tvLabel,
          ka: selectedTvKa.ka,
          kaLabel: selectedTvKa.kaLabel,
        },
      };

      const response = await fetch("/api/generate-lesson-v2/step1", {
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

      const data = (await response.json()) as Step1Response;
      setStep1Data(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Er ging iets mis bij het genereren van stap 1."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToStep2 = (): void => {
    if (!step1Data) return;

    navigate("/lesson/step2", {
      state: {
        step1Data,
        proposal,
        selectedTvKa,
      },
    });
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
        Lessie / LesGO – Stap 1 (Masterprompt v6)
      </h1>

      {/* Contextblok: gekozen tv/ka + voorstel */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          Gekozen tijdvak & kenmerkend aspect
        </h2>
        <p style={{ margin: 0 }}>
          <strong>Tijdvak:</strong> {selectedTvKa.tvLabel}
          <br />
          <strong>KA:</strong> {selectedTvKa.kaLabel}
        </p>
      </section>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          Gekozen lesvoorstel
        </h2>
        <p style={{ margin: "0 0 0.25rem 0" }}>
          <strong>Titel:</strong> {proposal.title || "Zonder titel"}
        </p>
        {proposal.hoofdvraag && (
          <p style={{ margin: "0 0 0.25rem 0" }}>
            <strong>Hoofdvraag (voorstel):</strong> {proposal.hoofdvraag}
          </p>
        )}
        {proposal.hook && (
          <p style={{ margin: "0 0 0.25rem 0" }}>
            <strong>Hook:</strong> {proposal.hook}
          </p>
        )}
        {proposal.description && (
          <p style={{ margin: "0 0 0.25rem 0" }}>{proposal.description}</p>
        )}
      </section>

      {/* Actieknoppen */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={handleGenerateStep1}
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
          {loading ? "Bezig met genereren..." : "Genereer Stap 1-les"}
        </button>

        <button
          type="button"
          onClick={handleGoToStep2}
          disabled={!step1Data}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            opacity: step1Data ? 1 : 0.5,
          }}
        >
          Ga verder naar Stap 2 →
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

      {/* Debug-weergave van Step1-output (voor ontwikkelfase) */}
      {step1Data && (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "1rem",
            marginTop: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Output Stap 1 (ruwe weergave)
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#555" }}>
            In deze migratiefase tonen we de ruwe JSON-output van Masterprompt
            v6 zodat we kunnen controleren of TV/KA en structuur goed
            doorkomen.
          </p>
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
            {JSON.stringify(step1Data, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
};

export default LessonStep1Page;


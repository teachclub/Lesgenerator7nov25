import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LessonNav from "../components/LessonNav";
import Step4View from "./lessonV2/Step4View";

type LessonConcept = {
  hoofdvraag?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
  masterSignature?: string;
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

type TvKaInfo = {
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
};

type Step2ApiResponse = {
  step?: string;
  data?: {
    chainSignature?: string;
    leerling?: any;
  };
  error?: string;
  message?: string;
};

type Step4ApiResponse = {
  step?: string;
  data?: {
    chainSignature?: string;
    leerling?: any;
  };
  error?: string;
  message?: string;
};

export default function LessonStep4Page() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as {
    tvKa?: TvKaInfo;
    concept?: LessonConcept;
    sources?: Source[];
    step2?: Step2ApiResponse;
    step4?: Step4ApiResponse;
  };

  const tvKa = state.tvKa || {};
  const concept = state.concept;
  const sources = state.sources || [];
  const step2 = state.step2 || null;

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    state.step4 ? "done" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [step4, setStep4] = useState<Step4ApiResponse | null>(state.step4 || null);

  const leerlingData = step4?.data?.leerling || null;

  const canRun = !!concept?.hoofdvraag && sources.length > 0 && !!step2?.data?.leerling;

  const runStep4 = async () => {
    if (!canRun) return;

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/generate-lesson-v2/step4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvKa,
          concept,
          sources,
          step2,
        }),
      });

      const text = await res.text();
      const json = JSON.parse(text) as Step4ApiResponse;

      if (!res.ok || json.error) {
        throw new Error(json.message || json.error || `Backend-fout step4 (${res.status})`);
      }

      if (!json.data || !json.data.leerling) {
        throw new Error("Ongeldige step4-response: data.leerling ontbreekt");
      }

      setStep4(json);
      setStatus("done");

      navigate("/lesson/step4", {
        replace: true,
        state: { ...state, step4: json },
      });
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Onbekende fout bij Step 4");
    }
  };

  if (!concept || sources.length === 0) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 980, margin: "0 auto" }}>
        <h1>Lesgenerator – Step 4</h1>
        <p>Er missen concept of bronnen. Ga terug naar de lesvoorstellen.</p>
        <button
          type="button"
          onClick={() => navigate("/proposals")}
          style={{ padding: "0.6rem 0.9rem", borderRadius: "0.6rem" }}
        >
          ← Terug naar lesvoorstellen
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "0.75rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        ← Terug
      </button>

      <LessonNav
        current="step4"
        canGoStep2={!!step2}
        canGoStep3={!!step2}
        canGoStep4={true}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <h1 style={{ margin: 0 }}>Lesgenerator – Step 4 (antwoordmodel)</h1>
        <button
          type="button"
          onClick={runStep4}
          disabled={!canRun || status === "loading"}
          style={{
            marginLeft: "0.75rem",
            padding: "0.6rem 0.9rem",
            borderRadius: "0.6rem",
            border: "1px solid #d1d5db",
            cursor: !canRun || status === "loading" ? "not-allowed" : "pointer",
            opacity: !canRun ? 0.5 : 1,
          }}
        >
          {status === "loading" ? "Bezig…" : "Genereer Step 4"}
        </button>
      </div>

      {!canRun && (
        <div style={{ marginTop: "0.75rem", color: "#555" }}>
          Step 4 kan nog niet draaien: genereer eerst Step 2 (leerlingmateriaal).
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            color: "#a10000",
            background: "#ffe5e5",
            padding: "0.75rem",
            borderRadius: "0.6rem",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <Step4View status={status} error={error} leerlingData={leerlingData} />
      </div>
    </div>
  );
}


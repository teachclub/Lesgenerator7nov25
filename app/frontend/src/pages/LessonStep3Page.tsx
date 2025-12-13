import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LessonNav from "../components/LessonNav";
import Step3View from "./lessonV2/Step3View";

type LessonConcept = {
  hoofdvraag?: string;
  hook?: string;
  context?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
  lesopbrengst?: string;
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

type Step3ApiResponse = {
  step?: string;
  data?: {
    chainSignature?: string;
    bronnenblad?: {
      instructie?: string;
      bronnen?: any[];
    };
    meta?: any;
  };
  error?: string;
  message?: string;
};

export default function LessonStep3Page() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as {
    tvKa?: TvKaInfo;
    concept?: LessonConcept;
    sources?: Source[];
    step1?: any;
    step2?: any;
    step3?: Step3ApiResponse;
    step4?: any;
  };

  const tvKa = state.tvKa || {};
  const concept = state.concept || null;
  const sources = state.sources || [];

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    state.step3 ? "done" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [step3, setStep3] = useState<Step3ApiResponse | null>(state.step3 || null);

  const canRun = sources.length > 0;

  const runStep3 = async () => {
    if (!canRun) return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/generate-lesson-v2/step3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tvKa, concept, sources }),
      });

      const text = await res.text();
      const json = JSON.parse(text) as Step3ApiResponse;

      if (!res.ok || json.error) {
        throw new Error(json.message || json.error || `Backend-fout step3 (${res.status})`);
      }

      if (!json.data?.bronnenblad?.bronnen) {
        throw new Error("Ongeldige step3-response: data.bronnenblad.bronnen ontbreekt");
      }

      setStep3(json);
      setStatus("done");

      navigate("/lesson/step3", {
        replace: true,
        state: { ...state, step3: json },
      });
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Onbekende fout bij Step 3");
    }
  };

  if (!concept || sources.length === 0) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 980, margin: "0 auto" }}>
        <h1>Lesgenerator – Step 3</h1>
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
        style={{ marginBottom: "0.75rem", border: "none", background: "transparent", cursor: "pointer" }}
      >
        ← Terug
      </button>

      <LessonNav
        current="step3"
        canGoStep2={!!state.step1}
        canGoStep3={true}
        canGoStep4={!!state.step4}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <h1 style={{ margin: 0 }}>Lesgenerator – Step 3 (Bronnenblad)</h1>
        <button
          type="button"
          onClick={runStep3}
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
          {status === "loading" ? "Bezig…" : "Genereer Step 3"}
        </button>
      </div>

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
        <Step3View status={status} error={error} step3={step3} />
      </div>
    </div>
  );
}


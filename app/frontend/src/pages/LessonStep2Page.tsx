import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LessonNav from "../components/LessonNav";
import Step2View from "./lessonV2/Step2View";

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

type Step1Response = {
  step?: string;
  data?: {
    chainSignature?: string;
    docent?: any;
  };
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

export default function LessonStep2Page() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as {
    tvKa?: TvKaInfo;
    concept?: LessonConcept;
    sources?: Source[];
    step1?: Step1Response;
    step2?: Step2ApiResponse;
    step3?: any;
    step4?: any;
  };

  const tvKa = state.tvKa || {};
  const concept = state.concept;
  const sources = state.sources || [];
  const step1 = state.step1 || null;

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    state.step2 ? "done" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [step2, setStep2] = useState<Step2ApiResponse | null>(state.step2 || null);

  const leerlingData = step2?.data?.leerling || null;

  const deelvragen = useMemo(() => {
    const dv = step1?.data?.docent?.deelvragen;
    return Array.isArray(dv) ? dv : [];
  }, [step1]);

  const canRun =
    !!concept?.hoofdvraag &&
    sources.length > 0 &&
    Array.isArray(deelvragen) &&
    deelvragen.length === 4;

  const runStep2 = async () => {
    if (!canRun) return;

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/generate-lesson-v2/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvKa,
          concept,
          sources,
          deelvragen,
          step1,
        }),
      });

      const text = await res.text();
      const json = JSON.parse(text) as Step2ApiResponse;

      if (!res.ok || json.error) {
        throw new Error(json.message || json.error || `Backend-fout step2 (${res.status})`);
      }

      if (!json.data || !json.data.leerling) {
        throw new Error("Ongeldige step2-response: data.leerling ontbreekt");
      }

      setStep2(json);
      setStatus("done");

      navigate("/lesson/step2", {
        replace: true,
        state: { ...state, step2: json },
      });
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Onbekende fout bij Step 2");
    }
  };

  const goStep3 = () => {
    navigate("/lesson/step3", { state: { ...state, step2 } });
  };

  if (!concept || sources.length === 0) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 980, margin: "0 auto" }}>
        <h1>Lesgenerator – Step 2</h1>
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
        current="step2"
        canGoStep2={true}
        canGoStep3={!!step2}
        canGoStep4={false}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Lesgenerator – Step 2</h1>

        <button
          type="button"
          onClick={runStep2}
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
          {status === "loading" ? "Bezig…" : "Genereer Step 2"}
        </button>

        <button
          type="button"
          onClick={goStep3}
          disabled={!step2}
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: "0.6rem",
            border: "1px solid #d1d5db",
            cursor: step2 ? "pointer" : "not-allowed",
            opacity: step2 ? 1 : 0.45,
          }}
        >
          Naar Step 3 →
        </button>
      </div>

      {!canRun && (
        <div style={{ marginTop: "0.75rem", color: "#555" }}>
          Step 2 kan nog niet draaien: genereer eerst Step 1 zodat de 4 deelvragen beschikbaar zijn.
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
        <Step2View status={status} error={error} leerlingData={leerlingData} />
      </div>
    </div>
  );
}


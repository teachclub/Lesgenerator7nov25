import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LessonNav from "../components/LessonNav";
import LessonPrintV5 from "../components/lesson/LessonPrintV5";

import "../styles/printV5.css";

export default function LessonStep5Page() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as any;

  const concept = state.concept || null;
  const sources = Array.isArray(state.sources) ? state.sources : [];
  const hasStep2 = !!state.step2;

  if (!concept || sources.length === 0) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
        <h1>Lesgenerator – Step 5 (Print)</h1>
        <p>
          Er missen concept of bronnen in de state. Ga terug naar de lesvoorstellen
          en kies opnieuw.
        </p>
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

  if (!hasStep2) {
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
          current="step5"
          canGoStep2={!!state.step1}
          canGoStep3={false}
          canGoStep4={false}
          canGoStep5={false}
        />

        <h1 style={{ marginTop: 0 }}>Lesgenerator – Step 5 (Print)</h1>
        <p style={{ color: "#555" }}>
          Genereer eerst Step 2 (leerlingmateriaal). Step 5 print de volledige set
          (Step 1–4) strak, maar hij verandert niets.
        </p>

        <button
          type="button"
          onClick={() => navigate("/lesson/step2", { state })}
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: "0.6rem",
            border: "1px solid #d1d5db",
            cursor: "pointer",
          }}
        >
          Naar Step 2 →
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", maxWidth: 1200, margin: "0 auto" }}>
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
        current="step5"
        canGoStep2={!!state.step1}
        canGoStep3={!!state.step2}
        canGoStep4={!!state.step2}
        canGoStep5={!!state.step2}
      />

      <LessonPrintV5
        tvKa={state.tvKa}
        concept={state.concept}
        sources={state.sources}
        step1={state.step1}
        step2={state.step2}
        step3={state.step3}
        step4={state.step4}
      />
    </div>
  );
}


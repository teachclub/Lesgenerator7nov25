import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

type StepKey = "step1" | "step2" | "step3" | "step4";

export default function LessonNav({
  current,
  canGoStep2,
  canGoStep3,
  canGoStep4,
}: {
  current: StepKey;
  canGoStep2?: boolean;
  canGoStep3?: boolean;
  canGoStep4?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const state: any = location.state || {};
  const hasStep2 = !!state.step2;
  const hasConcept = !!state.concept;
  const hasSources = Array.isArray(state.sources) && state.sources.length > 0;

  const step2Ok = !!canGoStep2 || hasStep2;
  const step3Ok = !!canGoStep3 || hasStep2;
  const step4Ok = !!canGoStep4 || hasStep2;

  const go = (path: string, enabled: boolean) => {
    if (!enabled) return;
    navigate(path, { state });
  };

  const btnStyle = (active: boolean, enabled: boolean): React.CSSProperties => ({
    padding: "0.55rem 0.8rem",
    borderRadius: "0.7rem",
    border: "1px solid #d1d5db",
    background: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#111827",
    opacity: enabled ? 1 : 0.45,
    cursor: enabled ? "pointer" : "not-allowed",
    fontWeight: active ? 800 : 600,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "wrap",
        marginBottom: "1rem",
      }}
    >
      <button
        type="button"
        onClick={() => go("/lesson/step1", hasConcept && hasSources)}
        style={btnStyle(current === "step1", hasConcept && hasSources)}
        title={
          !hasConcept || !hasSources
            ? "Ga eerst via lesvoorstellen zodat concept + bronnen in state zitten."
            : ""
        }
      >
        Step 1
      </button>

      <button
        type="button"
        onClick={() => go("/lesson/step2", step2Ok)}
        style={btnStyle(current === "step2", step2Ok)}
        title={!step2Ok ? "Genereer eerst Step 2 op de Step 2 pagina." : ""}
      >
        Step 2
      </button>

      <button
        type="button"
        onClick={() => go("/lesson/step3", step3Ok)}
        style={btnStyle(current === "step3", step3Ok)}
        title={!step3Ok ? "Step 3 kan pas na Step 2." : ""}
      >
        Step 3
      </button>

      <button
        type="button"
        onClick={() => go("/lesson/step4", step4Ok)}
        style={btnStyle(current === "step4", step4Ok)}
        title={!step4Ok ? "Step 4 kan pas na Step 2 (Step 4 = Step 2 + antwoorden)." : ""}
      >
        Step 4
      </button>
    </div>
  );
}


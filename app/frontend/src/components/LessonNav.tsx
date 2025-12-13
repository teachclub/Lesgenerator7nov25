import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

type StepKey = "step1" | "step2" | "step3" | "step4";

type Props = {
  current: StepKey;
  canGoStep2?: boolean;
  canGoStep3?: boolean;
  canGoStep4?: boolean;
};

export default function LessonNav({
  current,
  canGoStep2 = false,
  canGoStep3 = false,
  canGoStep4 = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || {}) as any;

  const go = (path: string) => {
    navigate(path, { state });
  };

  const btn = (
    label: string,
    path: string,
    active: boolean,
    enabled: boolean
  ) => (
    <button
      type="button"
      onClick={() => go(path)}
      disabled={!enabled}
      style={{
        padding: "0.45rem 0.75rem",
        borderRadius: "0.6rem",
        border: "1px solid #d1d5db",
        background: active ? "#111827" : "white",
        color: active ? "white" : "#111827",
        fontWeight: active ? 700 : 500,
        opacity: enabled ? 1 : 0.45,
        cursor: enabled ? "pointer" : "not-allowed",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: "1rem",
      }}
    >
      {btn("Step 1", "/lesson/step1", current === "step1", true)}
      {btn("Step 2", "/lesson/step2", current === "step2", canGoStep2)}
      {btn("Step 3", "/lesson/step3", current === "step3", canGoStep3)}
      {btn("Step 4", "/lesson/step4", current === "step4", canGoStep4)}
    </div>
  );
}


import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

function TabButton({
  label,
  to,
  active,
  onGo,
}: {
  label: string;
  to: string;
  active: boolean;
  onGo: (to: string) => void;
}) {
  return (
    <button
      onClick={() => onGo(to)}
      style={{
        padding: "0.4rem 0.7rem",
        fontWeight: active ? 700 : 400,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: active ? "#f3f3f3" : "#fff",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default function LessonLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const path = loc.pathname || "";

  const onGo = (to: string) => {
    nav(to, { state: loc.state });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <TabButton label="Step 1" to="/lesson/step1" active={path.includes("/lesson/step1")} onGo={onGo} />
        <TabButton label="Step 2" to="/lesson/step2" active={path.includes("/lesson/step2")} onGo={onGo} />
        <TabButton label="Step 3" to="/lesson/step3" active={path.includes("/lesson/step3")} onGo={onGo} />
        <TabButton label="Step 4" to="/lesson/step4" active={path.includes("/lesson/step4")} onGo={onGo} />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <Outlet />
      </div>
    </div>
  );
}


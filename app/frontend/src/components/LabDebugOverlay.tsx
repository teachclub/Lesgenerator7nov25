import { useEffect, useState } from "react";
import { getEvents, subscribe } from "../lib/labDebugStore";

export default function LabDebugOverlay() {
  const [events, setEvents] = useState(getEvents());

  useEffect(() => subscribe(() => setEvents([...getEvents()])), []);

  return (
    <div style={{
      position: "fixed",
      right: 12,
      bottom: 12,
      width: 360,
      background: "#111",
      color: "#fff",
      padding: 10,
      fontSize: 12,
      zIndex: 9999,
      borderRadius: 6
    }}>
      <strong>LAB debug</strong>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {events.map(e => (
          <li key={e.id} style={{ marginTop: 6 }}>
            <span style={{ color: e.ok ? "#6f6" : "#f66" }}>
              {e.ok ? "OK" : "ERR"}
            </span>{" "}
            {e.endpoint} · {e.ms}ms {e.error && `· ${e.error}`}
          </li>
        ))}
      </ul>
    </div>
  );
}


export default function LabStatus({ state }: { state: "idle"|"loading"|"error" }) {
  const map = {
    idle: "🟢 Klaar",
    loading: "🟡 Bezig…",
    error: "🔴 Fout"
  };
  return <div style={{ marginBottom: 12 }}>{map[state]}</div>;
}


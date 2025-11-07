import React, { useCallback, useEffect, useState } from "react";
import A06_Chips from "../components/A06.Chips";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export default function ChipsPanel() {
  const [query, setQuery] = useState("Rembrandt");
  const [tv, setTv] = useState("");
  const [ka, setKa] = useState("");
  const [chips, setChips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchChips = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/chips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, tv, ka }),
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.chips)) {
        setChips(data.chips);
      } else {
        setChips([]);
        if (data?.error) setErr(String(data.error));
      }
    } catch {
      setChips([]);
      setErr("chips_failed");
    } finally {
      setLoading(false);
    }
  }, [query, tv, ka]);

  useEffect(() => {
    fetchChips();
  }, []); // init

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">Chips Demo</h1>

      <div className="flex gap-2 items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoekterm"
          className="border rounded p-1"
        />
        <input
          value={tv}
          onChange={(e) => setTv(e.target.value)}
          placeholder="TV (bv. TV6)"
          className="border rounded p-1"
        />
        <input
          value={ka}
          onChange={(e) => setKa(e.target.value)}
          placeholder="KA (bv. 23)"
          className="border rounded p-1"
        />
        <button
          type="button"
          onClick={fetchChips}
          className="px-3 py-1 border rounded"
          disabled={loading}
        >
          {loading ? "Laden..." : "Haal chips"}
        </button>
      </div>

      {err && <div className="text-sm text-red-600">Fout: {err}</div>}

      <A06_Chips
        chips={chips}
        onChipClick={(value) => {
          setQuery(value);
          fetchChips();
        }}
      />
    </div>
  );
}


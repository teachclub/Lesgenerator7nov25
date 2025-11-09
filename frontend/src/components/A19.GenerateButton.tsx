import { useState } from "react";
import { useQueryStore } from "@/state/query.store";
import { useFiltersStore } from "@/state/filters.store";
import { useProposalsStore } from "@/state/proposals.store";

function apiBase() {
  const raw = (import.meta.env.VITE_API_BASE || "http://localhost:8080") as string;
  return raw.replace(/\/+$/, "");
}

export default function A19GenerateButton() {
  const buildQuery = useQueryStore((s) => s.buildQuery);
  const noImage   = useFiltersStore((s) => s.noImage);
  const noText    = useFiltersStore((s) => s.noText);
  const noCartoon = useFiltersStore((s) => s.noCartoon);

  const proposals    = useProposalsStore((s) => s.proposals);
  const selectedId   = useProposalsStore((s) => s.selectedId);
  const setProposals = useProposalsStore((s) => s.setProposals);
  const setLoading   = useProposalsStore((s) => s.setLoading);
  const select       = useProposalsStore((s) => s.select);

  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>("");

  async function onClick() {
    const term = buildQuery();
    if (!term) return setError("Geen zoektermen ingevuld.");
    setError(null);
    setRawText("");
    setLoading(true);

    try {
      const res = await fetch(`${apiBase()}/api/search-preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ term, filters: { noImage, noText, noCartoon } }),
      });

      const text = await res.text();
      setRawText(text);

      let json: any = null;
      try { json = JSON.parse(text); } catch {}

      if (!json) throw new Error(`HTTP ${res.status}: geen geldige JSON`);

      const list =
        json.proposals ||
        json.data?.proposals ||
        json.cards ||
        json.suggestions ||
        [];

      if (!Array.isArray(list)) throw new Error("Response bevat geen voorstel-lijst");
      setProposals(list);
    } catch (e: any) {
      setError(e?.message || "Onbekende fout");
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button onClick={onClick} className="px-4 py-2 rounded bg-black text-white">Genereer Lesvoorstellen</button>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {proposals.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3">
          {proposals.slice(0,3).map((p: any) => (
            <button
              key={p.id || p.title}
              onClick={() => select(p.id || p.title)}
              className={`text-left border rounded p-3 ${selectedId === (p.id || p.title) ? "bg-black text-white" : "bg-white"}`}
            >
              <div className="font-semibold">{p.title || "Voorstel"}</div>
              {p.summary && <div className="text-sm opacity-80">{p.summary}</div>}
            </button>
          ))}
        </div>
      )}

      {rawText && proposals.length === 0 && !error && (
        <pre style={{whiteSpace:"pre-wrap",fontSize:"12px",background:"#f6f6f6",padding:"8px",borderRadius:"6px"}}>{rawText.slice(0,1500)}</pre>
      )}
    </div>
  );
}


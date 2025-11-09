import { useEffect, useState } from "react";
import { fetchChips } from "@/lib/api";
import { useQueryStore } from "@/state/query.store";

type Chip = { label: string; kind: "person" | "event" | "concept" | "place" | "institution" | "format"; count?: number };

export default function Chips() {
  const { suggestSeed, terms, setTerm } = useQueryStore();
  const [chips, setChips] = useState<Chip[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!suggestSeed) return;
    setBusy(true);
    fetchChips(suggestSeed, { perKind: { person: 8, event: 6, concept: 8, place: 6 } })
      .then((r) => setChips(r.chips))
      .catch(() => setChips([]))
      .finally(() => setBusy(false));
  }, [suggestSeed]);

  function handleChipClick(label: string) {
    const idx = (terms.findIndex((t) => !t.trim()) as 0 | 1 | 2) ?? 2;
    const safeIdx = idx === -1 ? 2 : idx;
    setTerm(safeIdx, label);
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm opacity-70">{busy ? "Chips laden…" : suggestSeed ? `Suggesties voor: ${suggestSeed}` : "Klik 'Zoek Suggesties'."}</div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c, i) => (
          <button key={`${c.kind}-${c.label}-${i}`} onClick={() => handleChipClick(c.label)} className="px-3 py-1 rounded-full border text-sm" title={c.count ? String(c.count) : ""}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}


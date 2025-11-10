import React, { useState } from "react";
import { CHIPSET_REMBRANDT, CHIPSET_HITLER, Chip } from "../api/chipsets";
import { searchByChips } from "../api/a12.search";

type Props = {
  onResult: (payload: {
    ok: boolean;
    count?: number;
    items?: Array<{
      id?: string;
      type?: "text" | "image" | string;
      title?: string;
      provider?: string;
      url?: string;
      thumb?: string;
      raw?: unknown;
    }>;
    error?: string;
    paramsSent?: unknown;
  }) => void;
  rows?: number;
};

export default function A22_ChipsetQuickPick({ onResult, rows = 24 }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const run = async (chips: Chip[], key: string) => {
    if (busy) return;
    setBusy(key);
    setErr("");
    try {
      const data = await searchByChips({ chips, rows });
      onResult(data);
      if (!data?.ok) setErr(String(data?.error || "search_failed"));
    } catch {
      setErr("search_failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="border rounded-2xl p-3 space-y-2">
      <div className="text-sm font-semibold">Snel starten met chipsets</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run(CHIPSET_REMBRANDT, "rembrandt")}
          className="px-3 py-1.5 border rounded-xl text-sm"
          disabled={busy !== null}
          title="Europeana-zoek met Rembrandt-chipset"
        >
          {busy === "rembrandt" ? "Zoeken..." : "Rembrandt (kunsthistorisch)"}
        </button>
        <button
          type="button"
          onClick={() => run(CHIPSET_HITLER, "hitler")}
          className="px-3 py-1.5 border rounded-xl text-sm"
          disabled={busy !== null}
          title="Europeana-zoek met Hitler/propaganda-chipset"
        >
          {busy === "hitler" ? "Zoeken..." : "Hitler (propaganda 1930–33)"}
        </button>
      </div>
      {err && <div className="text-sm opacity-80">Fout: {err}</div>}
    </div>
  );
}


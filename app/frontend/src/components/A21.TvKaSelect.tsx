import React, { useMemo, useState } from "react";
import { tvKaOptions, TvKaOption } from "../data/tvKaPresets";

interface Props {
  onSelect: (selection: { tv?: string; ka?: string; kaTitel?: string }) => void;
}

function buildTijdvakken(options: TvKaOption[]): { tv: number; tvLabel: string }[] {
  const map = new Map<number, string>();
  for (const opt of options) {
    if (!map.has(opt.tv)) {
      map.set(opt.tv, opt.tvLabel);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([tv, tvLabel]) => ({ tv, tvLabel }));
}

function stripKaPrefix(kaLabel: string): string {
  const parts = kaLabel.split("-");
  if (parts.length <= 1) return kaLabel.trim();
  return parts.slice(1).join("-").trim();
}

function canonicalKaId(input: string): string | undefined {
  const s = String(input || "").trim().toUpperCase();
  const m = s.match(/\bKA\s*0*([0-9]{1,2})\b/) || s.match(/^0*([0-9]{1,2})$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > 49) return undefined;
  return `KA${n}`;
}

export function A21TvKaSelect({ onSelect }: Props) {
  const [selectedTv, setSelectedTv] = useState<string>("");
  const [selectedKaValue, setSelectedKaValue] = useState<string>("");
  const [selectedKaCanonical, setSelectedKaCanonical] = useState<string>("");

  const tijdvakken = useMemo(() => buildTijdvakken(tvKaOptions), []);

  const kas = useMemo(
    () => (selectedTv ? tvKaOptions.filter((opt) => String(opt.tv) === selectedTv) : []),
    [selectedTv]
  );

  const handleTvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTv(val);
    setSelectedKaValue("");
    setSelectedKaCanonical("");
    onSelect({ tv: val, ka: undefined });
  };

  const handleKaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedKaValue(val);

    const kaOpt = kas.find((k) => k.ka === val);
    const kaTitel = kaOpt ? stripKaPrefix(kaOpt.kaLabel) : undefined;

    const kaCanonical = canonicalKaId(val);
    setSelectedKaCanonical(kaCanonical || "");

    onSelect({
      tv: selectedTv || undefined,
      ka: kaCanonical,
      kaTitel,
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded border border-gray-200 shadow-sm">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Stap 1: Kies Tijdvak
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded text-sm"
          value={selectedTv}
          onChange={handleTvChange}
        >
          <option value="">-- Selecteer --</option>
          {tijdvakken.map((tv) => (
            <option key={tv.tv} value={String(tv.tv)}>
              {tv.tvLabel}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Stap 2: Kies Kenmerkend Aspect
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
          value={selectedKaValue}
          onChange={handleKaChange}
          disabled={!selectedTv}
        >
          <option value="">{selectedTv ? "-- Kies KA --" : "Kies eerst tijdvak"}</option>
          {kas.map((ka) => (
            <option key={ka.ka} value={ka.ka}>
              {ka.kaLabel}
            </option>
          ))}
        </select>
      </div>

      {selectedKaCanonical && (
        <div className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded">
          ✓ {selectedKaCanonical} geselecteerd
        </div>
      )}
    </div>
  );
}


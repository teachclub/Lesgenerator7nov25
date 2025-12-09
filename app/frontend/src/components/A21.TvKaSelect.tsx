import React, { useMemo, useState } from "react";
import { tvKaOptions, TvKaOption } from "../data/tvKaPresets";

interface Props {
  onSelect: (selection: { tv?: string; ka?: string; kaTitel?: string }) => void;
}

/**
 * Helper: unieke tijdvakken uit tvKaOptions halen
 */
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

/**
 * Helper: titel zonder "KAxx - " prefix (optioneel)
 */
function stripKaPrefix(kaLabel: string): string {
  const parts = kaLabel.split("-");
  if (parts.length <= 1) return kaLabel.trim();
  return parts.slice(1).join("-").trim();
}

export function A21TvKaSelect({ onSelect }: Props) {
  const [selectedTv, setSelectedTv] = useState<string>("");
  const [selectedKa, setSelectedKa] = useState<string>("");

  // Tijdvakken op basis van tvKaPresets
  const tijdvakken = useMemo(() => buildTijdvakken(tvKaOptions), []);

  // KA’s gefilterd op gekozen tijdvak
  const kas = useMemo(
    () =>
      selectedTv
        ? tvKaOptions.filter((opt) => String(opt.tv) === selectedTv)
        : [],
    [selectedTv]
  );

  const handleTvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTv(val);
    setSelectedKa("");

    // Alleen tv doorgeven; KA resetten
    onSelect({ tv: val, ka: undefined });
  };

  const handleKaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedKa(val);

    const kaOpt = kas.find((k) => k.ka === val);
    const kaTitel = kaOpt ? stripKaPrefix(kaOpt.kaLabel) : undefined;

    onSelect({
      tv: selectedTv || undefined,
      ka: val,
      kaTitel,
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded border border-gray-200 shadow-sm">
      {/* STAP 1 */}
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

      {/* STAP 2 */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Stap 2: Kies Kenmerkend Aspect
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
          value={selectedKa}
          onChange={handleKaChange}
          disabled={!selectedTv}
        >
          <option value="">
            {selectedTv ? "-- Kies KA --" : "Kies eerst tijdvak"}
          </option>
          {kas.map((ka) => (
            <option key={ka.ka} value={ka.ka}>
              {ka.kaLabel}
            </option>
          ))}
        </select>
      </div>

      {selectedKa && (
        <div className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded">
          ✓ KA{selectedKa} geselecteerd
        </div>
      )}
    </div>
  );
}


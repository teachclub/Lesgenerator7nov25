import { useMemo } from "react";

type Props = {
  chips: string[];
  selected: string[];
  onToggle: (value: string) => void;
  loading?: boolean;
  error?: string | null;
};

export default function ChipsBar({ chips, selected, onToggle, loading, error }: Props) {
  const set = useMemo(() => new Set(selected), [selected]);
  if (loading) return <div className="p-2 text-sm">Laden…</div>;
  if (error) return <div className="p-2 text-sm text-red-600">{error}</div>;
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {chips.map((c) => (
        <button
          key={c}
          onClick={() => onToggle(c)}
          className={`px-3 py-1 rounded-full border text-sm ${set.has(c) ? "bg-black text-white" : "bg-white"} `}
        >
          {c}
        </button>
      ))}
    </div>
  );
}


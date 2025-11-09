import { useSelectionStore } from "@/state/selection.store";

export default function Verzamelbak() {
  const { selected, max, clear } = useSelectionStore();
  return (
    <div className="border rounded p-3 grid gap-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Verzamelbakje</div>
        <div className="text-sm opacity-80">
          {selected.length}/{max}
        </div>
      </div>
      <div className="grid gap-2">
        {selected.map((s) => (
          <div key={s.id} className="text-sm">
            <a className="underline" href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
            <span className="ml-2 text-xs opacity-70">{s.type}</span>
          </div>
        ))}
        {selected.length === 0 && <div className="text-sm opacity-70">Nog geen bronnen geselecteerd.</div>}
      </div>
      <button onClick={clear} className="px-3 py-1 rounded border">
        Leegmaken
      </button>
    </div>
  );
}


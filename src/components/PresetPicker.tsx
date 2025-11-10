import { useState } from "react";
import { searchPreset } from "../lib/search";

type PresetItem = {
  provider: string;
  id: string;
  type: "TEXT" | "IMAGE";
  title: string;
  data_provider?: string;
  lang?: string;
  thumbnail?: string;
  link?: string;
};

export default function PresetPicker() {
  const [query, setQuery] = useState("Rembrandt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratio, setRatio] = useState<{ text: number; image: number } | null>(null);
  const [preset, setPreset] = useState<PresetItem[]>([]);
  const [selection, setSelection] = useState<PresetItem[]>([]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await searchPreset(query, 6);
      setRatio(res.ratio || null);
      setPreset(res.preset || []);
      setSelection(res.preset || []);
    } catch (e: any) {
      setError(e?.message || "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  function removeFromSelection(id: string) {
    setSelection(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Preset bronnen zoeken</h1>

      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoekterm"
        />
        <button
          onClick={run}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Zoeken…" : "Zoek preset"}
        </button>
      </div>

      {ratio && (
        <div className="text-sm">
          Verhouding voorgesteld: {ratio.text} tekst, {ratio.image} beeld
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {preset.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Voorstel (preset)</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {preset.map(item => (
              <li key={item.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 border rounded">{item.type}</span>
                  {item.data_provider && <span className="text-xs">{item.data_provider}</span>}
                </div>
                <div className="font-medium">{item.title}</div>
                {item.type === "IMAGE" && item.thumbnail && (
                  <img src={item.thumbnail} alt={item.title} className="w-full h-32 object-cover rounded" />
                )}
                <div className="flex justify-between items-center">
                  {item.link ? (
                    <a href={item.link} target="_blank" className="text-sm underline">Open bron</a>
                  ) : <span className="text-sm text-gray-500">Geen link</span>}
                  <button
                    onClick={() => removeFromSelection(item.id)}
                    className="text-sm px-2 py-1 border rounded"
                  >
                    Verwijder uit selectie
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Selectie</h2>
        {selection.length === 0 && <div className="text-sm text-gray-600">Nog geen bronnen geselecteerd.</div>}
        {selection.length > 0 && (
          <ul className="space-y-2">
            {selection.map(item => (
              <li key={item.id} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="truncate">
                  <span className="text-xs mr-2 px-2 py-1 border rounded">{item.type}</span>
                  <span className="font-medium">{item.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.link && <a href={item.link} target="_blank" className="text-sm underline">Open</a>}
                  <button
                    onClick={() => removeFromSelection(item.id)}
                    className="text-sm px-2 py-1 border rounded"
                  >
                    Verwijder
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


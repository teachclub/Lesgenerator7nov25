import { useMemo, useState } from "react";
import { kleioSearch, generateFromKleio, KleioHit } from "../lib/api";

export default function KleioSearch() {
  const [q, setQ] = useState("Soekarno");
  const [limit, setLimit] = useState(10);
  const [hits, setHits] = useState<KleioHit[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<"search" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  async function onSearch() {
    setError(null);
    setOutput("");
    setLoading("search");
    try {
      const results = await kleioSearch(q, limit);
      setHits(results);
      const map: Record<string, boolean> = {};
      results.forEach((h) => (map[h.url] = false));
      setSelected(map);
    } catch (e: any) {
      setError(e?.message || "Zoeken mislukte.");
    } finally {
      setLoading(null);
    }
  }

  function toggle(url: string) {
    setSelected((prev) => ({ ...prev, [url]: !prev[url] }));
  }

  async function onGenerate() {
    setError(null);
    setLoading("generate");
    setOutput("");
    try {
      const urls = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (urls.length === 0) throw new Error("Selecteer eerst minimaal 1 bron.");
      const data = await generateFromKleio(urls);
      const text =
        data?.text ??
        (data?.ideas ? JSON.stringify(data.ideas, null, 2) : JSON.stringify(data, null, 2));
      setOutput(text);
    } catch (e: any) {
      setError(e?.message || "Genereren mislukte.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold">Kleio — ECHTE bronnen & Generate</h2>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium">Zoekterm</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="bv. Soekarno"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Limit</label>
          <input
            type="number"
            className="w-24 border rounded px-3 py-2"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value || "10", 10))}
            min={1}
            max={50}
          />
        </div>
        <button
          onClick={onSearch}
          disabled={loading === "search"}
          className="border rounded px-4 py-2"
        >
          {loading === "search" ? "Zoeken…" : "Haal ÉCHTE bronnen op"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1 border rounded px-2 py-1">
          Gevonden: <strong>{hits.length}</strong>
        </span>
        <span className="inline-flex items-center gap-1 border rounded px-2 py-1">
          Geselecteerd: <strong>{selectedCount}</strong>
        </span>
        {loading && <span>⏳ {loading === "search" ? "Zoeken…" : "Genereren…"}</span>}
        {error && <span className="text-red-600">⚠️ {error}</span>}
      </div>

      {hits.length > 0 && (
        <ul className="divide-y border rounded">
          {hits.map((h) => (
            <li key={h.url} className="p-3 flex items-start gap-3">
              <input
                type="checkbox"
                checked={!!selected[h.url]}
                onChange={() => toggle(h.url)}
                className="mt-1"
              />
              <div className="min-w-0">
                <div className="font-semibold truncate">{h.title || h.url}</div>
                <a
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline break-all"
                >
                  {h.url}
                </a>
                {h.snippet && (
                  <p className="text-sm text-gray-700 mt-1">{h.snippet}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button
          onClick={onGenerate}
          disabled={loading === "generate" || selectedCount === 0}
          className="border rounded px-4 py-2"
        >
          {loading === "generate" ? "Genereren…" : "Genereer 3 les-ideeën"}
        </button>
      </div>

      {output && (
        <div className="mt-2">
          <h3 className="font-semibold mb-2">Output</h3>
          <pre className="whitespace-pre-wrap border rounded p-3 text-sm overflow-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}


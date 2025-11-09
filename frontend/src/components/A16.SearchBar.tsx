import { useQueryStore, Mode } from "@/state/query.store";

export default function A16SearchBar() {
  const { terms, mode, setTerm, setMode, setSuggestSeed, buildQuery } = useQueryStore();
  function onSuggest() {
    const seed = buildQuery();
    if (seed) setSuggestSeed(seed);
  }
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="border rounded px-3 py-2 w-full" placeholder="Zoekterm 1" value={terms[0]} onChange={(e) => setTerm(0, e.target.value)} />
        <input className="border rounded px-3 py-2 w-full" placeholder="Zoekterm 2" value={terms[1]} onChange={(e) => setTerm(1, e.target.value)} />
        <input className="border rounded px-3 py-2 w-full" placeholder="Zoekterm 3" value={terms[2]} onChange={(e) => setTerm(2, e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        {(["AND", "OR"] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1 rounded border ${mode === m ? "bg-black text-white" : "bg-white"}`}>
            {m === "AND" ? "EN" : "OF"}
          </button>
        ))}
        <button type="button" onClick={onSuggest} className="ml-auto px-3 py-1 rounded border">Zoek Suggesties</button>
      </div>
    </div>
  );
}


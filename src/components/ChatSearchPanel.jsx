import { useState } from "react";

export default function ChatSearchPanel() {
  const [message, setMessage] = useState("");
  const [useThesaurus, setUseThesaurus] = useState(true); // ✅ nieuw
  const [intent, setIntent] = useState(null);
  const [chips, setChips] = useState([]);
  const [critique, setCritique] = useState([]);
  const [clarify, setClarify] = useState([]);
  const [paramsPreview, setParamsPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function callChatSearch(execute = false, override = null) {
    setLoading(true);
    setResults(null);
    try {
      const base = override || { message, execute };
      const body = { ...base, thesaurus: useThesaurus }; // ✅ flag meesturen
      const r = await fetch("/api/chat-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "Unknown error");
      setIntent(data.intent);
      setChips(data.chips || []);
      setCritique(data.europeana?.critique || []);
      setParamsPreview(data.europeana?.params || null);
      setClarify(data.intent?.clarify || []);
      setResults(data.results || null);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleChip(idx) {
    setChips((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], active: !next[idx].active };
      return next;
    });
  }

  async function executeSearch() {
    const who = chips.filter(c => c.facet === "who" && c.active).map(c => c.value);
    const what = chips.filter(c => c.facet === "what" && c.active).map(c => c.value);
    const where = chips.filter(c => c.facet === "where" && c.active).map(c => c.value);
    const type = chips.filter(c => c.facet === "TYPE" && c.active).map(c => c.value);
    const yearChip = chips.find(c => c.facet === "YEAR" && c.active);
    let yearRange = null;
    if (yearChip && /(\d+)-(\d+)/.test(yearChip.value)) {
      const m = yearChip.value.match(/(\d+)-(\d+)/);
      yearRange = { from: +m[1], to: +m[2] };
    }
    const override = {
      message: intent?.anchor || message,
      execute: true,
      who, what, where, type, yearRange,
    };
    await callChatSearch(true, override);
  }

  const inactiveCount = chips.filter(c => c.active === false).length;

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-4">
      <div className="rounded-2xl border p-3">
        <label className="block text-sm font-medium mb-2">
          Beschrijf wat je zoekt — noem jaartallen, personen/actoren, plaatsen en begrippen.
        </label>
        <textarea
          className="w-full border rounded-xl p-3"
          rows={3}
          placeholder='Bijv.: "Churchill speeches & Ministry of Information posters, London, 1940–1941" of "Stalin NKVD show trials, Moscow, 1936–1938, IMAGE+TEXT"'
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => callChatSearch(false)}
            className="px-3 py-2 rounded-xl bg-black text-white"
            disabled={loading || !message.trim()}
          >
            {loading ? "Bezig…" : "Voorstel maken"}
          </button>
          <button
            onClick={executeSearch}
            className="px-3 py-2 rounded-xl border"
            disabled={loading || !intent || (clarify && clarify.length > 0)}
            title={clarify && clarify.length > 0 ? "Beantwoord eerst de vragen" : "Zoek nu in Europeana"}
          >
            Zoek nu
          </button>
          <label className="text-sm flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              checked={useThesaurus}
              onChange={(e) => setUseThesaurus(e.target.checked)}
            />
            <span>+thesaurus</span>
            {inactiveCount > 0 && (
              <span className="text-xs text-gray-600">({inactiveCount} suggesties)</span>
            )}
          </label>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Tip: gebruik meertalige/historische termen: <em>Wahlplakat/affiche</em>, <em>speech/address</em>.
        </p>
      </div>

      {clarify && clarify.length > 0 && (
        <div className="rounded-2xl border p-3">
          <div className="font-medium mb-2">Nog even aanvullen:</div>
          <ul className="list-disc pl-5 space-y-1">
            {clarify.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 mt-2">
            Zet het antwoord in het tekstvak en klik opnieuw op <em>Voorstel maken</em>.
          </p>
        </div>
      )}

      {chips && chips.length > 0 && (
        <div className="rounded-2xl border p-3">
          <div className="font-medium mb-2">Zoeksuggesties (chips)</div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c, idx) => (
              <button
                key={idx}
                onClick={() => toggleChip(idx)}
                className={`px-3 py-1 rounded-full border text-sm ${
                  c.active ? "bg-black text-white" : "bg-white opacity-80"
                }`}
                title={c.facet}
              >
                {c.facet}:{c.value}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Zwarte chips = actief in de query. Witte chips = thesaurus-suggesties (klik om te activeren).
          </p>
        </div>
      )}

      {paramsPreview && (
        <div className="rounded-2xl border p-3">
          <div className="font-medium mb-2">Query-preview</div>
          <pre className="text-xs whitespace-pre-wrap">
{`query: ${paramsPreview.query}
`}{(paramsPreview.qf || []).map((x) => `qf: ${x}\n`).join("")}{`media=${paramsPreview.media} profile=${paramsPreview.profile} rows=${paramsPreview.rows}`}
          </pre>
          {critique && critique.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
              {critique.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {results && (
        <div className="rounded-2xl border p-3">
          <div className="font-medium mb-2">Resultaten</div>
          <p className="text-sm text-gray-600 mb-2">
            Vervang deze JSON-weergave door jouw kaarten (thumbnail, titel, jaar, provider).
          </p>
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}


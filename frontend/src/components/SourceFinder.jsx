// src/components/SourceFinder.jsx — chips fix + filters (tekst/beeld/cartoons) + selectie + voorstellen.
import React, { useMemo, useState } from 'react';

const API = (import.meta?.env?.VITE_API_BASE) || 'http://localhost:8080';
function cls(...xs) { return xs.filter(Boolean).join(' '); }

function ResultItem({ item, checked, onToggle }) {
  return (
    <label className="flex items-start gap-3 p-2 border-b">
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <a href={item.url} target="_blank" rel="noreferrer" className="font-medium underline">
            {item.title || '(zonder titel)'}
          </a>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">{item.provider}</span>
        </div>
        {item.snippet ? <p className="text-sm text-gray-600 mt-1">{item.snippet}</p> : null}
        <p className="text-xs text-gray-400 mt-1 break-all">{item.url}</p>
      </div>
    </label>
  );
}

export default function SourceFinder() {
  const [mode, setMode] = useState('tvka'); // 'tvka' | 'term'
  const [tv, setTv] = useState('TV9');
  const [ka, setKa] = useState('Het voeren van twee wereldoorlogen');
  const [term, setTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState([]);           // [{term, hits}]
  const [resultsByChip, setResultsByChip] = useState({}); // term -> Result[]
  const [activeChip, setActiveChip] = useState(null);

  const [selected, setSelected] = useState([]);     // Result[]
  const selectedUrls = useMemo(() => new Set(selected.map(s => s.url)), [selected]);

  const [requiredCount, setRequiredCount] = useState(3);

  const [genLoading, setGenLoading] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [proposalWarning, setProposalWarning] = useState(null);
  const [chosenIdx, setChosenIdx] = useState(null);

  // Providers en filters
  const providers = useMemo(() => ['europeana','historiana'], []);
  const [filterText, setFilterText] = useState(false);
  const [filterImage, setFilterImage] = useState(false);
  const [filterCartoon, setFilterCartoon] = useState(false);

  function buildEuropeanaFilters() {
    const qf = [];
    if (filterText) qf.push('TYPE:TEXT');
    if (filterImage) qf.push('TYPE:IMAGE');
    // Cartoons hebben geen native TYPE; we doen keyword-filtering backendzijde.
    return qf;
  }
  function buildKinds() {
    const k = [];
    if (filterText) k.push('text');
    if (filterImage) k.push('image');
    if (filterCartoon) k.push('cartoon');
    return k;
  }

  function toggleSelect(item) {
    setSelected(prev => {
      const exists = prev.find(x => x.url === item.url);
      if (exists) return prev.filter(x => x.url !== item.url);
      return [...prev, item];
    });
  }

  async function suggestVerified({ tv, ka, userQuery }) {
    const body = {
      tv, ka,
      userQuery: userQuery || '',
      providers,
      limitChips: 16,
      minHits: 1,
      returnResultsFor: 'ALL',
      maxPerChipResults: 8,
      filters: buildEuropeanaFilters(),
      kinds: buildKinds(),
    };
    const r = await fetch(`${API}/api/suggest-verified`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function handleSearchTVKA() {
    setLoading(true);
    setChips([]); setResultsByChip({}); setActiveChip(null);
    try {
      const data = await suggestVerified({ tv, ka, userQuery: '' });
      setChips(data.chips || []);
      setResultsByChip(data.resultsByChip || {});
      const first = (data.chips || []).find(c => (data.resultsByChip?.[c.term] || []).length > 0);
      setActiveChip(first ? first.term : null);
    } catch (e) {
      console.error(e);
      alert('Zoeksuggesties ophalen mislukte.');
    } finally { setLoading(false); }
  }

  async function handleSearchTerm() {
    setLoading(true);
    setChips([]); setResultsByChip({}); setActiveChip(null);
    try {
      // tv/ka mogen leeg; backend voegt zelf associaties toe op basis van term.
      const data = await suggestVerified({ tv: '', ka: '', userQuery: term || '' });
      setChips(data.chips || []);
      setResultsByChip(data.resultsByChip || {});
      const first = (data.chips || []).find(c => (data.resultsByChip?.[c.term] || []).length > 0);
      setActiveChip(first ? first.term : null);
    } catch (e) {
      console.error(e);
      alert('Zoeksuggesties ophalen mislukte.');
    } finally { setLoading(false); }
  }

  async function openChip(term) {
    setActiveChip(term);
    if (!resultsByChip[term]) {
      try {
        const body = {
          tv, ka,
          userQuery: mode === 'term' ? term : '',
          providers,
          limitChips: 16,
          minHits: 1,
          returnResultsFor: [term],
          maxPerChipResults: 8,
          filters: buildEuropeanaFilters(),
          kinds: buildKinds(),
        };
        const r = await fetch(`${API}/api/suggest-verified`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        setResultsByChip(prev => ({ ...prev, ...(data.resultsByChip || {}) }));
      } catch (e) { console.error(e); }
    }
  }

  async function generateProposals() {
    if (selected.length < 3) return alert('Selecteer minimaal 3 bronnen.');
    if (selected.length > 6) return alert('Selecteer maximaal 6 bronnen.');
    const useSel = selected.slice(0, requiredCount).map(({ title, url }) => ({ title, url }));

    setGenLoading(true);
    setProposals([]); setProposalWarning(null); setChosenIdx(null);
    try {
      const body = { context: { tv, ka }, selection: useSel };
      const r = await fetch(`${API}/api/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await r.json();
      if (!data.ok) return alert(data.error || 'Genereren mislukt.');
      if (data.waarschuwing) setProposalWarning(data.waarschuwing);
      const v = Array.isArray(data.voorstellen) ? data.voorstellen : [];
      setProposals(v.length ? v : [
        { titel: 'Voorstel A (mock)', samenvatting: 'Presentisme-focus / analysevragen' },
        { titel: 'Voorstel B (mock)', samenvatting: 'Oorzaken & Gevolgen / dimensies' },
        { titel: 'Voorstel C (mock)', samenvatting: 'Dimensie & Betekenis / kwadrant' },
      ]);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
      console.error(e); alert('Genereren mislukt (netwerk?).');
    } finally { setGenLoading(false); }
  }

  function finalizeLesson() {
    if (chosenIdx == null) return alert('Kies eerst een lesvoorstel.');
    alert(`Les gegenereerd op basis van voorstel ${chosenIdx + 1}. (Zie console)`);
  }

  const activeResults = useMemo(() => activeChip ? (resultsByChip[activeChip] || []) : [], [resultsByChip, activeChip]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Mode toggles */}
      <div className="flex gap-2 mb-4">
        <button className={cls('px-3 py-1.5 rounded border', mode === 'tvka' ? 'bg-black text-white' : 'bg-white')} onClick={() => setMode('tvka')}>1) TV + KA Zoeken</button>
        <button className={cls('px-3 py-1.5 rounded border', mode === 'term' ? 'bg-black text-white' : 'bg-white')} onClick={() => setMode('term')}>2) Vrije zoekterm</button>
      </div>

      {/* Filters */}
      <div className="border rounded p-3 mb-4">
        <div className="font-semibold mb-2">Filters</div>
        <label className="mr-4 text-sm"><input type="checkbox" className="mr-1" checked={filterText} onChange={e=>setFilterText(e.target.checked)} /> Tekst</label>
        <label className="mr-4 text-sm"><input type="checkbox" className="mr-1" checked={filterImage} onChange={e=>setFilterImage(e.target.checked)} /> Beeld</label>
        <label className="mr-4 text-sm"><input type="checkbox" className="mr-1" checked={filterCartoon} onChange={e=>setFilterCartoon(e.target.checked)} /> Cartoons</label>
        <span className="text-xs text-gray-500 ml-2">Cartoons filtert op trefwoorden (cartoon/karikatuur/spotprent/satire).</span>
      </div>

      {mode === 'tvka' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 border rounded p-3">
            <h3 className="font-semibold mb-2">Context: Tijdvak & Kenmerkend Aspect</h3>
            <label className="block text-sm mb-1">Tijdvak (bv. TV9)</label>
            <input value={tv} onChange={(e) => setTv(e.target.value)} className="w-full border rounded px-2 py-1 mb-2" placeholder="TV9" />
            <label className="block text-sm mb-1">Kenmerkend Aspect</label>
            <input value={ka} onChange={(e) => setKa(e.target.value)} className="w-full border rounded px-2 py-1 mb-3" placeholder="Het voeren van twee wereldoorlogen" />
            <button onClick={handleSearchTVKA} disabled={loading} className="w-full px-3 py-2 rounded bg-blue-600 text-white">{loading ? 'Zoeken…' : 'Zoek (TV + KA)'}</button>
            <p className="text-xs text-gray-500 mt-2">Chips geverifieerd op Europeana & Historiana.</p>
          </div>

          <div className="md:col-span-2 border rounded p-3">
            <h3 className="font-semibold mb-2">Gevalideerde Zoeksuggesties</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {chips.length === 0 && <span className="text-sm text-gray-500">Nog geen suggesties.</span>}
              {chips.map(c => (
                <button key={c.term} onClick={() => setActiveChip(c.term)} className={cls('px-2 py-1 rounded border text-sm', activeChip === c.term ? 'bg-black text-white' : 'bg-white')} title={`${c.hits || 0} treffers`}>
                  {c.term} <span className="opacity-60">({c.hits || 0})</span>
                </button>
              ))}
            </div>
            <div className="border rounded">
              <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                <div><strong>Treffers</strong> {activeChip ? <span className="text-gray-600">voor “{activeChip}”</span> : null}</div>
                <div className="text-xs text-gray-500">Klik titel om bron te bekijken</div>
              </div>
              <div>
                {activeChip && activeResults.length === 0 && <div className="p-3 text-sm text-gray-500">Geen treffers voor deze chip.</div>}
                {activeChip && activeResults.map(it => (
                  <ResultItem key={it.url} item={it} checked={selectedUrls.has(it.url)} onToggle={() => toggleSelect(it)} />
                ))}
                {!activeChip && <div className="p-3 text-sm text-gray-500">Kies eerst een chip.</div>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 border rounded p-3">
            <h3 className="font-semibold mb-2">Vrije zoekterm</h3>
            <input value={term} onChange={(e) => setTerm(e.target.value)} className="w-full border rounded px-2 py-1 mb-3" placeholder='Bijv. "Hitler" of "drukpers"' />
            <button onClick={handleSearchTerm} disabled={loading || !term.trim()} className="w-full px-3 py-2 rounded bg-blue-600 text-white">{loading ? 'Zoeken…' : 'Zoek (term)'}</button>
            <p className="text-xs text-gray-500 mt-2">Associaties geverifieerd; alleen termen met echte hits blijven over.</p>
          </div>

          <div className="md:col-span-2 border rounded p-3">
            <h3 className="font-semibold mb-2">Gevalideerde Zoeksuggesties</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {chips.length === 0 && <span className="text-sm text-gray-500">Nog geen suggesties.</span>}
              {chips.map(c => (
                <button key={c.term} onClick={() => setActiveChip(c.term)} className={cls('px-2 py-1 rounded border text-sm', activeChip === c.term ? 'bg-black text-white' : 'bg-white')} title={`${c.hits || 0} treffers`}>
                  {c.term} <span className="opacity-60">({c.hits || 0})</span>
                </button>
              ))}
            </div>
            <div className="border rounded">
              <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                <div><strong>Treffers</strong> {activeChip ? <span className="text-gray-600">voor “{activeChip}”</span> : null}</div>
                <div className="text-xs text-gray-500">Klik titel om bron te bekijken</div>
              </div>
              <div>
                {activeChip && activeResults.length === 0 && <div className="p-3 text-sm text-gray-500">Geen treffers voor deze chip.</div>}
                {activeChip && activeResults.map(it => (
                  <ResultItem key={it.url} item={it} checked={selectedUrls.has(it.url)} onToggle={() => toggleSelect(it)} />
                ))}
                {!activeChip && <div className="p-3 text-sm text-gray-500">Kies eerst een chip.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selectie + generate */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 border rounded">
          <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
            <strong>Geselecteerde bronnen ({selected.length})</strong>
            <button className="text-xs underline" onClick={() => setSelected([])} disabled={selected.length === 0}>Leegmaken</button>
          </div>
          <div className="p-3">
            <label className="block text-sm mb-1">Aantal te gebruiken bronnen</label>
            <select className="w-full border rounded px-2 py-1" value={requiredCount} onChange={e=>setRequiredCount(Number(e.target.value))}>
              {[3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-2">We gebruiken automatisch de eerste {requiredCount} geselecteerde bronnen.</p>
          </div>
          <div>
            {selected.length === 0 && <div className="p-3 text-sm text-gray-500">Nog niets geselecteerd.</div>}
            {selected.map(it => (
              <div key={it.url} className="p-2 border-t">
                <div className="flex items-center gap-2">
                  <a href={it.url} target="_blank" rel="noreferrer" className="font-medium underline">{it.title || '(zonder titel)'}</a>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">{it.provider}</span>
                </div>
                {it.snippet ? <p className="text-sm text-gray-600 mt-1">{it.snippet}</p> : null}
                <button className="mt-1 text-xs underline text-red-600" onClick={() => toggleSelect(it)}>Verwijderen</button>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 border rounded p-3">
          <h3 className="font-semibold mb-2">Lesvoorstellen genereren</h3>
          <div className="flex items-center gap-2">
            <button disabled={genLoading || selected.length < 3} className={cls('px-4 py-2 rounded', selected.length < 3 ? 'bg-gray-300 text-gray-600' : 'bg-green-600 text-white')} onClick={generateProposals}>
              {genLoading ? 'Bezig…' : `Genereer lesvoorstellen (${requiredCount})`}
            </button>
            <span className="text-sm text-gray-600">Minimaal 3, maximaal 6 bronnen.</span>
          </div>

          {proposalWarning && <div className="mt-3 p-2 border rounded bg-gray-50 text-sm">{proposalWarning}</div>}

          {proposals.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Kies één lesvoorstel</h4>
              <div className="border rounded">
                {proposals.map((p, idx) => (
                  <label key={idx} className="flex items-start gap-3 p-3 border-b">
                    <input type="radio" name="proposal" checked={chosenIdx === idx} onChange={() => setChosenIdx(idx)} className="mt-1" />
                    <div className="flex-1">
                      <div className="font-medium">{p.titel || p.title || `Voorstel ${idx + 1}`}</div>
                      {p.samenvatting || p.summary ? (
                        <p className="text-sm text-gray-600 mt-1">{p.samenvatting || p.summary}</p>
                      ) : p.content ? (
                        <p className="text-sm text-gray-600 mt-1">{String(p.content).slice(0, 240)}…</p>
                      ) : (
                        <pre className="text-xs text-gray-600 mt-1" style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(p, null, 2)}</pre>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <button disabled={chosenIdx == null} className={cls('px-4 py-2 rounded', chosenIdx == null ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white')} onClick={finalizeLesson}>
                  Genereer les!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


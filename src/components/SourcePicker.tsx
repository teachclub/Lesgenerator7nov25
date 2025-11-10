import React, { useState } from 'react';
import { suggestSources, SuggestSource } from '../lib/api';

interface Props {
  tijdvakId: string;
  kaId: string;
  onSelectedChange: (sel: SuggestSource[]) => void;
}

export default function SourcePicker({ tijdvakId, kaId, onSelectedChange }: Props) {
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SuggestSource[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  const isSearchDisabled =
    loading || term.trim().length < 2 || !tijdvakId || !kaId;

  async function handleSearch() {
    if (isSearchDisabled) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await suggestSources({
        tijdvakId,
        kaId,
        zoekterm: term.trim(),
      });
      setResults(resp.sources || []);
      const s = new Set<string>();
      setSelectedUrls(s);
      onSelectedChange([]);
    } catch (e: any) {
      setError('Zoeken mislukte. Controleer backend /api/suggest.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function toggle(url: string) {
    const next = new Set(selectedUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelectedUrls(next);
    const sel = results.filter(r => next.has(r.url));
    onSelectedChange(sel);
  }

  return (
    <div>
      <h2>Stap 2: Bronnen zoeken in Kleio</h2>
      <p>Vul een zoekterm in (bijv. <i>Soekarno, Luther</i>). Klik op <b>Zoeken</b>. Vink aan wat je wilt gebruiken.</p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Bijv. Soekarno"
          style={{ width: 520, padding: 6 }}
        />
        <button onClick={handleSearch} disabled={isSearchDisabled}>
          {loading ? 'Zoeken…' : 'Zoeken'}
        </button>
      </div>

      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      {!loading && results.length === 0 && term.trim() && (
        <p style={{ marginTop: 8 }}>Nog geen resultaten. Zoeken maar! 🔎</p>
      )}

      <div style={{ marginTop: 12 }}>
        {results.map((r) => (
          <label key={r.url} style={{ display: 'block', padding: '10px 8px', border: '1px solid #ddd', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={selectedUrls.has(r.url)}
              onChange={() => toggle(r.url)}
              style={{ marginRight: 8 }}
            />
            <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
            <div style={{ color: '#555' }}>{r.description}</div>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        Geselecteerd: <b>{selectedUrls.size}</b>
      </div>
    </div>
  );
}


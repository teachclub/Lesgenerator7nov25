import React, { useEffect } from 'react';
import { A21TvKaSelect } from './A21.TvKaSelect';
import { useQueryStore } from '../state/query.store';

interface SearchBarProps {
  onTriggerSearch: () => void;
  isLoading: boolean;
}

export function A16SearchBar({ onTriggerSearch, isLoading }: SearchBarProps) {
  const { 
    terms, tv, ka, mode,
    setTerm, setTv, setKa, setMode, addTermField 
  } = useQueryStore();

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    const validTerms = terms.map(t => t.trim()).filter(Boolean);
    if (validTerms.length > 0 || (tv && ka)) {
      onTriggerSearch();
    } else {
      alert('Vul een zoekterm in, of selecteer een Tijdvak + Kenmerkend Aspect.');
    }
  };
  
  useEffect(() => {
    if (tv && ka) {
      onTriggerSearch();
    }
  }, [tv, ka]);

  return (
    <form className="search-bar-a16" onSubmit={handleSearchClick}>
      <div className="search-field-group">
        <label>Vrije zoektermen:</label>
        {terms.map((term, index) => (
          <input
            key={index}
            type="text"
            value={term}
            onChange={(e) => setTerm(index, e.target.value)}
            placeholder={index === 0 ? "Bijv. 'Luther' (Hoofdzoekterm)..." : "Optionele term..."}
            disabled={isLoading}
          />
        ))}
        <button type="button" onClick={addTermField} disabled={isLoading} className="add-term-btn">
          + Veld toevoegen
        </button>
      </div>

      <div className="search-mode-toggle">
        <label>
          <input type="radio" value="AND" checked={mode === 'AND'} onChange={() => setMode('AND')} />
          EN (Verfijnen: alle termen)
        </label>
        <label>
          <input type="radio" value="OR" checked={mode === 'OR'} onChange={() => setMode('OR')} />
          OF (Vergroten: één van de termen)
        </label>
      </div>

      <div className="search-or-divider">
        <span>OF</span>
      </div>

      <div className="search-field-group">
        <label>Zoek op Tijdvak (TV) en Kenmerkend Aspect (KA):</label>
        
        <A21TvKaSelect 
          selectedTv={tv}
          onTvChange={setTv}
          selectedKa={ka}
          onKaChange={setKa}
          disabled={isLoading}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Suggesties laden...' : 'Zoek Suggesties (Chips)'}
      </button>
    </form>
  );
}

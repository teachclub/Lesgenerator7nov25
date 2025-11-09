import React from 'react';
import { A21TvKaSelect } from './A21.TvKaSelect';
import { useQueryStore } from '../state/query.store';

interface SearchBarProps {
  onSearch: (term: string, tv: string, ka: string) => void;
  isLoading: boolean;
}

export function A16SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const { term, tv, ka, setTerm, setTv, setKa } = useQueryStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (term.trim() || (tv && ka)) {
      onSearch(term.trim(), tv, ka);
    } else {
      alert('Vul een zoekterm in, of selecteer een Tijdvak + Kenmerkend Aspect.');
    }
  };

  return (
    <form className="search-bar-a16" onSubmit={handleSearch}>
      <div className="search-field-group">
        <label htmlFor="search-term">Vrije zoekterm:</label>
        <input
          id="search-term"
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Bijv. 'Maarten Luther'..."
          disabled={isLoading}
        />
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
        {isLoading ? 'Bezig...' : 'Zoek Bronnen (S1)'}
      </button>
    </form>
  );
}

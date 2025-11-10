import React, { useState } from 'react';

// (We hebben A21.TvKaSelect nog niet, dus we gebruiken een placeholder)
// import { A21TvKaSelect } from './A21.TvKaSelect';

// --- Props ---
// Deze component 'lift' zijn state omhoog naar de pagina
interface SearchBarProps {
  onSearch: (term: string, tv: string, ka: string) => void;
  isLoading: boolean;
}

/**
 * A16: De 'S1' invoer (zoekterm / TV+KA).
 * Deze component beheert de invoervelden en roept 'onSearch' aan
 * wanneer de gebruiker op de zoekknop klikt.
 */
export function A16SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [term, setTerm] = useState('');
  const [tv, setTv] = useState(''); // Tijdvak
  const [ka, setKa] = useState(''); // Kenmerkend Aspect

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Voorkom dubbelklikken
    
    // Valideer dat er *iets* is ingevuld
    if (term.trim() || (tv && ka)) {
      onSearch(term.trim(), tv, ka);
    } else {
      // Optioneel: geef feedback
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
        {/* TODO: Vervang deze placeholders zodra A21.TvKaSelect.tsx af is.
          <A21TvKaSelect 
            selectedTv={tv}
            onTvChange={setTv}
            selectedKa={ka}
            onKaChange={setKa}
            disabled={isLoading}
          />
        */}
        <input 
          type="text" 
          placeholder="[Placeholder: A21.TvKaSelect komt hier]" 
          disabled 
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Bezig...' : 'Zoek Bronnen (S1)'}
      </button>
    </form>
  );
}

import React from 'react';
import { useQueryStore } from '../../state/query.store';

export const SearchBar: React.FC = () => {
  const {
    terms,
    mode,
    setSearchTerm,
    addSearchTerm,
    removeSearchTerm,
    setMode,
  } = useQueryStore();

  return (
    <div className="search-bar-container">
      <h3>Zoektermen</h3>
      {terms.map((term, index) => (
        <div key={index} className="search-field">
          <input
            type="text"
            value={term}
            onChange={(e) => setSearchTerm(index, e.target.value)}
            placeholder={`Zoekterm ${index + 1}`}
          />
          {terms.length > 1 && (
            <button onClick={() => removeSearchTerm(index)} title="Verwijder veld">
              &times;
            </button>
          )}
        </div>
      ))}
      <button onClick={addSearchTerm} className="add-term-btn">
        + Veld toevoegen
      </button>

      <div className="mode-toggle">
        <label>
          <input
            type="radio"
            name="mode"
            value="AND"
            checked={mode === 'AND'}
            onChange={() => setMode('AND')}
          />
          EN
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="OR"
            checked={mode === 'OR'}
            onChange={() => setMode('OR')}
          />
          OF
        </label>
      </div>
    </div>
  );
};

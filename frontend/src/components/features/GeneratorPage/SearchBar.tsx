import React from 'react';
import { useQueryStore } from '../../../state/query.store';
import { useShallow } from 'zustand/react/shallow';

export const SearchBar: React.FC = () => {
  const { queries, setQuery, executeSearch } = useQueryStore(
    useShallow((state) => ({
      queries: state.queries || [''],
      setQuery: state.setQuery,
      executeSearch: state.executeSearch,
    }))
  );

  const currentQuery = queries[0] || '';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch(currentQuery);
    }
  };

  const insertOperator = (op: string) => {
    // Voeg operator toe met spaties eromheen
    const newValue = `${currentQuery} ${op} `.replace(/\s+/g, ' ');
    setQuery(0, newValue);
    // Focus terug naar input (optioneel, vereist ref, houden we nu simpel)
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-1">
          Zoekterm
        </label>
        <input
          type="text"
          value={currentQuery}
          onChange={(e) => setQuery(0, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Bijv. Luther AND aflaat"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
        />
      </div>

      {/* BOOLEAN OPERATORS */}
      <div className="flex gap-2">
        <button 
          onClick={() => insertOperator('AND')}
          className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded border border-gray-300 hover:bg-gray-200"
          title="Beide termen moeten voorkomen"
        >
          + EN (AND)
        </button>
        <button 
          onClick={() => insertOperator('OR')}
          className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded border border-gray-300 hover:bg-gray-200"
          title="Eén van de termen moet voorkomen"
        >
          + OF (OR)
        </button>
        <button 
          onClick={() => insertOperator('NOT')}
          className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded border border-gray-300 hover:bg-gray-200"
          title="Term mag NIET voorkomen"
        >
          + NIET (NOT)
        </button>
      </div>
    </div>
  );
};

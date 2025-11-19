import React from 'react';
import { useQueryStore } from '../../../state/query.store';
import { useShallow } from 'zustand/react/shallow';

export const SearchBar: React.FC = () => {
  // We halen veilig de queries en acties op
  const { queries, setQuery, executeSearch } = useQueryStore(
    useShallow((state) => ({
      queries: state.queries || [''], // Fallback array als hij leeg is
      setQuery: state.setQuery,
      executeSearch: state.executeSearch,
    }))
  );

  // Helper voor enter-toets
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch(queries[0]);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
      <h2 className="font-bold text-gray-800 text-lg">Zoektermen</h2>
      
      {/* Zoekterm 1 (Actief) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Zoekterm 1
        </label>
        <input
          type="text"
          value={queries[0] || ''}
          onChange={(e) => setQuery(0, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Typ hier je zoekterm"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Zoekterm 2 (Visueel aanwezig, placeholder voor toekomst) */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Zoekterm 2 (Optioneel)
        </label>
        <input
          type="text"
          placeholder="Optioneel"
          disabled
          className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-400 cursor-not-allowed"
        />
      </div>

      {/* Zoekterm 3 (Visueel aanwezig, placeholder voor toekomst) */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Zoekterm 3 (Optioneel)
        </label>
        <input
          type="text"
          placeholder="Optioneel"
          disabled
          className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-400 cursor-not-allowed"
        />
      </div>
    </div>
  );
};

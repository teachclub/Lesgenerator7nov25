import React from 'react';
import { useQueryStore } from '../../../state/query.store';
import { useShallow } from 'zustand/react/shallow';

export const SearchActions: React.FC = () => {
  const { queries, executeSearch, loading } = useQueryStore(
    useShallow((state) => ({
      queries: state.queries || [''],
      executeSearch: state.executeSearch,
      loading: state.loading,
    }))
  );

  const handleSearch = () => {
    if (loading) return;
    
    // Pak de zoekterm (mag leeg zijn)
    const term = queries[0] || '';
    
    // GEEN BLOKKADES MEER. Gewoon zoeken.
    // Als het leeg is, geeft Cito alles terug.
    executeSearch(term);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <button
        onClick={handleSearch}
        disabled={loading}
        className={`w-full px-4 py-3 rounded-lg font-bold text-white transition-all shadow-md
          ${loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'
          }`}
      >
        {loading ? '🔍 Zoeken...' : 'Zoek Bronnen'}
      </button>
    </div>
  );
};

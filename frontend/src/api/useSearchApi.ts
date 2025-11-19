import { useQueryStore } from '../state/query.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const useSearchApi = () => {
  const setSearchResult = useQueryStore((s) => s.setSearchResult);

  const search = async (terms: string[], mode: 'AND' | 'OR', filters: any, doelgroep: string) => {
    setSearchResult({ isLoading: true, isError: false, data: null });
    try {
      const operator = mode === 'OR' ? ' OR ' : ' AND ';
      const queryString = terms.filter(t => t.trim() !== '').join(operator);

      if (!queryString) {
        setSearchResult({ isLoading: false, isError: false, data: { items: [], totalResults: 0 } });
        return;
      }
      
      const res = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // DE PAYLOAD FIX: Stuur { query: terms } (per backend `a12.search.cjs`)
        body: JSON.stringify({ query: terms, mode, filters, doelgroep }), 
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setSearchResult({ isLoading: false, isError: false, data });
    } catch (err: any) {
      console.error('[useSearchApi] search error:', err);
      setSearchResult({ isLoading: false, isError: true, data: null });
    }
  };

  return { search };
};

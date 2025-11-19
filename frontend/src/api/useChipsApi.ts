import { useQueryStore } from '../state/query.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const useChipsApi = () => {
  const setChipsResult = useQueryStore((s) => s.setChipsResult);

  const fetchChips = async (terms: string[], mode: 'AND' | 'OR', filters: any, doelgroep: string) => {
    setChipsResult({ isLoading: true, isError: false, data: null });
    try {
      const operator = mode === 'OR' ? ' OR ' : ' AND ';
      const queryString = terms.filter(t => t.trim() !== '').join(operator);

      if (!queryString) {
        setChipsResult({ isLoading: false, isError: false, data: [] });
        return;
      }

      const res = await fetch(`${API_URL}/chips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Dit is correct: de 'chips' API (a06) verwacht een *string*
        body: JSON.stringify({ query: queryString, filters, doelgroep }), 
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setChipsResult({ isLoading: false, isError: false, data: data.chips });
    } catch (err: any) {
      console.error('[useChipsApi] fetchChips error:', err);
      setChipsResult({ isLoading: false, isError: true, data: null });
    }
  };

  return { fetchChips };
};

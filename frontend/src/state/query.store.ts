import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface QueryState {
  hits: any[];
  totalHits: number;
  loading: boolean;
  error: string | null;
  queries: string[];
  selectedHit: any | null;
  
  // Filters
  filters: {
    providers: string[];
    types: string[];
    tijdvak: string;      // NIEUW: Geselecteerd tijdvak ID
    kas: string[];        // NIEUW: Lijst met geselecteerde KA's
  };

  executeSearch: (query: string) => Promise<void>;
  toggleArrayFilter: (key: 'providers' | 'types' | 'kas', value: string) => void;
  setFilterValue: (key: 'tijdvak', value: string) => void; // NIEUW: Voor dropdowns
  setSelectedHit: (hit: any) => void;
  setQuery: (index: number, value: string) => void;
}

const normalizeHits = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.hits && Array.isArray(data.hits)) return data.hits;
  return [];
};

export const useQueryStore = create<QueryState>()(
  devtools((set, get) => ({
    hits: [],
    totalHits: 0,
    loading: false,
    error: null,
    selectedHit: null,
    queries: [''],
    filters: {
      providers: ['Cito', 'Kleio'],
      types: ['TEXT', 'IMAGE'],
      tijdvak: '', 
      kas: [],
    },

    toggleArrayFilter: (key, value) => {
      const current = get().filters[key];
      if (!Array.isArray(current)) return;

      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      
      set((state) => ({
        filters: { ...state.filters, [key]: next },
      }));
    },

    setFilterValue: (key, value) => {
      set((state) => ({
        filters: { ...state.filters, [key]: value },
      }));
    },

    setSelectedHit: (hit) => set({ selectedHit: hit }),

    setQuery: (index, value) => {
      const newQueries = [...get().queries];
      newQueries[index] = value;
      set({ queries: newQueries });
    },

    executeSearch: async (queryInput: string) => {
      set({ loading: true, error: null });
      const { filters } = get();
      
      // Update ook de query state
      set({ queries: [queryInput] });

      try {
        const response = await fetch('http://localhost:8080/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: [queryInput], 
            filters 
          }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const rawData = await response.json();
        const hits = normalizeHits(rawData);

        set({ 
          hits, 
          totalHits: hits.length, 
          loading: false 
        });

      } catch (err: any) {
        console.error('Search error:', err);
        set({ 
          error: err.message || 'Fout bij zoeken.', 
          loading: false, 
          hits: [] 
        });
      }
    },
  }))
);

import { create } from 'zustand';

// --- Types ---

// Dit definieert de 'S1' (Search) en 'S2' (Filter) invoer
export interface QueryState {
  // S1 (Search)
  term: string;
  tv: string; // Tijdvak
  ka: string; // Kenmerkend Aspect

  // S2 (Filters)
  ratio: number;
  max: number;
  filters: string[]; // ['alleen_tekst', 'spotprent']
}

interface QueryActions {
  // S1
  setTerm: (term: string) => void;
  setTv: (tv: string) => void;
  setKa: (ka: string) => void;
  // S2
  setRatio: (ratio: number) => void;
  setMax: (max: number) => void;
  setFilter: (filterId: string, isSelected: boolean) => void;
  
  // Helper om de S1+S2 input voor de /api/search-preset call te pakken
  getPresetInput: () => {
    term: string;
    tv: string;
    ka: string;
    ratio: number;
    max: number;
    filters: string[];
  };
}

// --- Standaard Waarden ---
const initialState: QueryState = {
  // S1
  term: '',
  tv: '',
  ka: '',
  // S2
  ratio: 0.7, // Standaard 70%
  max: 20,    // Standaard max 20
  filters: [],
};

// --- De Store ---

/**
 * State store voor alle S1 (zoek) en S2 (filter) parameters.
 */
export const useQueryStore = create<QueryState & QueryActions>((set, get) => ({
  ...initialState,

  // --- S1 Acties ---
  setTerm: (term) => set({ term }),
  setTv: (tv) => set({ tv }),
  setKa: (ka) => set({ ka }),

  // --- S2 Acties ---
  setRatio: (ratio) => set({ ratio }),
  setMax: (max) => set({ max }),
  setFilter: (filterId, isSelected) =>
    set((state) => {
      const currentFilters = state.filters;
      if (isSelected && !currentFilters.includes(filterId)) {
        // Voeg toe
        return { filters: [...currentFilters, filterId] };
      }
      if (!isSelected && currentFilters.includes(filterId)) {
        // Verwijder
        return { filters: currentFilters.filter((f) => f !== filterId) };
      }
      // Geen wijziging
      return {};
    }),

  // --- Helper/Selector ---
  getPresetInput: () => {
    const { term, tv, ka, ratio, max, filters } = get();
    return { term, tv, ka, ratio, max, filters };
  },
}));

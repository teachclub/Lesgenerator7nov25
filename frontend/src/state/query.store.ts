import { create } from 'zustand';

export type SearchMode = 'AND' | 'OR';

export interface QueryState {
  terms: string[];
  mode: SearchMode;
  tv: string;
  ka: string;
  filters: string[];
}

interface QueryActions {
  setTerm: (index: number, value: string) => void;
  addTermField: () => void;
  setMode: (mode: SearchMode) => void;
  setTv: (tv: string) => void;
  setKa: (ka: string) => void;
  setFilter: (filterId: string, isSelected: boolean) => void;
  
  getSearchQuery: () => string;
  getPresetInput: () => {
    term: string;
    filters: string[];
  };
}

const initialState: QueryState = {
  terms: ['', '', ''],
  mode: 'OR',
  tv: '',
  ka: '',
  filters: [],
};

export const useQueryStore = create<QueryState & QueryActions>((set, get) => ({
  ...initialState,

  setTerm: (index, value) => set((state) => {
    const newTerms = [...state.terms];
    newTerms[index] = value;
    return { terms: newTerms };
  }),

  addTermField: () => set(state => ({
    terms: [...state.terms, '']
  })),

  setMode: (mode) => set({ mode }),
  setTv: (tv) => set({ tv }),
  setKa: (ka) => set({ ka }),

  setFilter: (filterId, isSelected) =>
    set((state) => {
      const currentFilters = state.filters;
      if (isSelected && !currentFilters.includes(filterId)) {
        return { filters: [...currentFilters, filterId] };
      }
      if (!isSelected && currentFilters.includes(filterId)) {
        return { filters: currentFilters.filter((f) => f !== filterId) };
      }
      return {};
    }),

  getSearchQuery: () => {
    const { terms, mode } = get();
    const validTerms = terms.map(t => t.trim()).filter(Boolean);
    if (validTerms.length === 0) return '';
    if (validTerms.length === 1) return validTerms[0];
    return validTerms.map(t => `(${t})`).join(` ${mode} `);
  },
  
  getPresetInput: () => {
    const { tv, ka, filters } = get();
    const term = get().getSearchQuery() || ka || tv;
    return { term, filters };
  },
}));

import { create } from 'zustand';

export interface QueryState {
  term: string;
  tv: string;
  ka: string;
  filters: string[];
}

interface QueryActions {
  setTerm: (term: string) => void;
  setTv: (tv: string) => void;
  setKa: (ka: string) => void;
  setFilter: (filterId: string, isSelected: boolean) => void;
  
  getPresetInput: () => {
    term: string;
    tv: string;
    ka: string;
    filters: string[];
  };
}

const initialState: QueryState = {
  term: '',
  tv: '',
  ka: '',
  filters: [],
};

export const useQueryStore = create<QueryState & QueryActions>((set, get) => ({
  ...initialState,

  setTerm: (term) => set({ term }),
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

  getPresetInput: () => {
    const { term, tv, ka, filters } = get();
    return { term, tv, ka, filters };
  },
}));

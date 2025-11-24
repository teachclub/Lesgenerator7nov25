import { create } from 'zustand';

export interface QueryState {
  term: string;
  tv: string;
  ka: string[]; // <--- NU EEN ARRAY

  filters: {
    images: boolean;
    text: boolean;
    kleio: boolean;
    cito: boolean;
  };

  setTerm: (term: string) => void;
  setTv: (tv: string) => void;
  setKa: (ka: string[]) => void; // <--- NU EEN ARRAY
  toggleFilter: (key: keyof QueryState['filters']) => void;

  getSearchPayload: () => any;
}

export const useQueryStore = create<QueryState>((set, get) => ({
  term: '',
  tv: '',
  ka: [], // Start leeg

  filters: {
    images: true,
    text: true,
    kleio: true,
    cito: true
  },

  setTerm: (term) => set({ term }),
  setTv: (tv) => set({ tv }),
  setKa: (ka) => set({ ka }),

  toggleFilter: (key) => set((state) => ({
    filters: { ...state.filters, [key]: !state.filters[key] }
  })),

  getSearchPayload: () => {
    const s = get();
    return {
      term: s.term,
      tv: s.tv,
      ka: s.ka, // Stuurt nu ['ka1_1', 'ka1_2']
      filters: s.filters
    };
  }
}));

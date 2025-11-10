import { create } from 'zustand';

export type QueryFilter = 'geen beeldbronnen' | 'geen tekstbronnen' | 'geen spotprenten';

interface QueryState {
  terms: string[];
  mode: 'AND' | 'OR';
  filters: Set<QueryFilter>;
  setSearchTerm: (index: number, value: string) => void;
  addSearchTerm: () => void;
  removeSearchTerm: (index: number) => void;
  setMode: (mode: 'AND' | 'OR') => void;
  toggleFilter: (filter: QueryFilter) => void;
  getSearchQuery: () => string;
}

export const useQueryStore = create<QueryState>((set, get) => ({
  terms: ['', '', ''],
  mode: 'AND',
  filters: new Set(),

  setSearchTerm: (index, value) => {
    set((state) => {
      const newTerms = [...state.terms];
      newTerms[index] = value;
      return { terms: newTerms };
    });
  },

  addSearchTerm: () => {
    set((state) => ({
      terms: [...state.terms, ''],
    }));
  },

  removeSearchTerm: (index) => {
    set((state) => ({
      terms: state.terms.filter((_, i) => i !== index),
    }));
  },

  setMode: (mode) => {
    set({ mode });
  },

  toggleFilter: (filter) => {
    set((state) => {
      const newFilters = new Set(state.filters);
      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }
      return { filters: newFilters };
    });
  },

  getSearchQuery: () => {
    const { terms, mode } = get();
    const nonEmptyTerms = terms.filter(term => term.trim() !== '');
    if (nonEmptyTerms.length === 0) {
      return '';
    }
    return nonEmptyTerms.join(` ${mode} `);
  },
}));

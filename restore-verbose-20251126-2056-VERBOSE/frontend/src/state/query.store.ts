import { create } from 'zustand';

interface QueryState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

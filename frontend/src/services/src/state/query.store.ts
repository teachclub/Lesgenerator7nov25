import { create } from 'zustand';
import {
  fetchSearchResults,
  scrapeHitUrl,
  fetchEuropeanaRecord,
} from '../services/api.service';
import { SearchResult, Hit } from '../types/search-result.interface';
import { QueryState, FiltersState } from '../types/query.interface';

const initialFilters: FiltersState = {
  Cito: true,
  Europeana: true,
  Kleio: true,
};

export const useQueryStore = create<QueryState>((set, get) => ({
  // State
  query: '',
  filters: initialFilters,
  hits: [],
  isLoading: false,
  error: null,
  selectedHit: null,
  isDetailLoading: false,

  // Actions
  setQuery: (query: string) => set({ query }),
  setFilters: (filters: FiltersState) => set({ filters }),

  search: async () => {
    const { query, filters } = get();
    if (!query) return;

    set({ isLoading: true, error: null, hits: [], selectedHit: null });
    try {
      const result = await fetchSearchResults(query, filters);
      set({ hits: result.hits, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Zoeken mislukt', isLoading: false });
    }
  },

  // Dit is de NIEUWE functie uit jouw plan
  setSelectedHit: async (hit: Hit | null) => {
    if (!hit) {
      set({
        selectedHit: null,
        isDetailLoading: false,
      });
      return;
    }

    set({
      selectedHit: hit,
      isDetailLoading: true,
    });

    try {
      if (hit.provider === 'Cito') {
        set((state) => ({
          selectedHit: state.selectedHit
            ? {
                ...state.selectedHit,
                fullText: state.selectedHit.highlight,
              }
            : null,
          isDetailLoading: false,
        }));
      } else if (hit.provider === 'Kleio') {
        const fullText = await scrapeHitUrl(hit.url);
        set((state) => ({
          selectedHit: state.selectedHit
            ? {
                ...state.selectedHit,
                fullText,
              }
            : null,
          isDetailLoading: false,
        }));
      } else {
        set({
          isDetailLoading: false,
        });
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Ophalen mislukt';
      console.error(
        `Fout bij ophalen details voor ${hit.provider}:`,
        error
      );
      set((state) => ({
        selectedHit: state.selectedHit
          ? {
              ...state.selectedHit,
              fullText: `Fout bij ophalen data: ${errorMsg}`,
            }
          : null,
        isDetailLoading: false,
      }));
    }
  },
}));

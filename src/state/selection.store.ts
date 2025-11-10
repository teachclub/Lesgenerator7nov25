import { create } from 'zustand';
import type { Source, SelectionMode } from '../components/A18.SelectionPanel';

// --- Types ---

// Dit definieert de selectie-state
export interface SelectionState {
  mode: SelectionMode;
  sources: Source[]; // De lijst met geselecteerde bronnen
  maxSources: number; // Maximaal toegestaan (voor max-check)
}

interface SelectionActions {
  setMode: (mode: SelectionMode) => void;
  // Vervangt de *hele* lijst (bijv. bij 'preset' laden)
  setSources: (sources: Source[]) => void;
  addSource: (source: Source) => void;
  removeSource: (id: string) => void;
  // Helper
  canAddMore: () => boolean;
}

// --- Standaard Waarden ---
const initialState: SelectionState = {
  mode: 'preset', // Start in 'preset' modus
  sources: [],
  maxSources: 20, // (Deze waarde kan later worden bijgewerkt door de RatioPicker)
};

// --- De Store ---

/**
 * State store voor de geselecteerde bronnen en de selectie-modus.
 */
export const useSelectionStore = create<SelectionState & SelectionActions>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setSources: (sources) => set({ sources }),

  addSource: (source) =>
    set((state) => {
      // Voorkom duplicaten
      if (state.sources.find((s) => s.id === source.id)) {
        return {};
      }
      // Check of er nog plek is
      if (state.sources.length >= state.maxSources) {
        alert(`Je kunt maximaal ${state.maxSources} bronnen selecteren.`);
        return {};
      }
      return { sources: [...state.sources, source] };
    }),

  removeSource: (id) =>
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== id),
    })),

  canAddMore: () => {
    const { sources, maxSources } = get();
    return sources.length < maxSources;
  },
}));

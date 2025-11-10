import { create } from 'zustand';

export interface SelectedSource {
  id: string;
  title: string;
  type: string;
  url: string;
  preset: boolean;
}

const MAX_SELECTION = 12;

interface SelectionState {
  selected: SelectedSource[];
  max: number;
  isSelected: (id: string) => boolean;
  toggle: (source: SelectedSource) => void;
  setSources: (sources: SelectedSource[]) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selected: [],
  max: MAX_SELECTION,
  
  isSelected: (id: string) => get().selected.some(s => s.id === id),
  
  toggle: (source: SelectedSource) => set((state) => {
    const isCurrentlySelected = state.selected.some(s => s.id === source.id);
    if (isCurrentlySelected) {
      return { selected: state.selected.filter(s => s.id !== source.id) };
    } else {
      if (state.selected.length < state.max) {
        return { selected: [...state.selected, source] };
      }
      return state;
    }
  }),
  
  setSources: (sources: SelectedSource[]) => set({ selected: sources }),
}));

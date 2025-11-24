import { create } from 'zustand';
import { type Source } from '../components/A18.SelectionPanel'; // We gebruiken het type, niet het component

export interface SelectionState {
  sources: Source[]; // De lijst met gevonden/geselecteerde bronnen
  
  setSources: (sources: Source[]) => void;
  removeSource: (id: string) => void; // <--- DEZE HEBBEN WE NODIG
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  sources: [],

  setSources: (sources) => set({ sources }),
  
  removeSource: (id) => set((state) => ({
    sources: state.sources.filter(s => s.id !== id)
  })),
  
  clearSelection: () => set({ sources: [] })
}));

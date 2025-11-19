import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LessonProposal {
  id: number;
  title: string;
  mainQuestion: string;
  rationale: string;
  selectedSourceIds: string[];
}

interface SelectionState {
  sourcePool: any[]; 
  proposals: LessonProposal[];
  activeProposalId: number | null;
  basket: string[]; 

  setSourcePool: (sources: any[]) => void;
  setProposals: (proposals: LessonProposal[]) => void;
  selectProposal: (id: number) => void;
  toggleInBasket: (sourceId: string) => void;
  reset: () => void;
}

export const useSelectionStore = create<SelectionState>()(
  persist(
    (set, get) => ({
      sourcePool: [],
      proposals: [],
      activeProposalId: null,
      basket: [],

      setSourcePool: (sources) => set({ sourcePool: sources }),
      
      setProposals: (proposals) => set({ proposals, activeProposalId: null, basket: [] }),
      
      selectProposal: (id) => {
        const prop = get().proposals.find(p => p.id === id);
        if (prop) {
            set({ activeProposalId: id, basket: prop.selectedSourceIds });
        }
      },

      toggleInBasket: (sourceId) => {
          const current = get().basket;
          const isin = current.includes(sourceId);
          
          if (!isin && current.length >= 8) {
              alert("Maximaal 8 bronnen toegestaan in het mandje.");
              return;
          }

          const next = isin 
            ? current.filter(id => id !== sourceId)
            : [...current, sourceId];
            
          set({ basket: next });
      },

      reset: () => set({ sourcePool: [], proposals: [], activeProposalId: null, basket: [] })
    }),
    {
      name: 'selection-storage', 
    }
  )
);

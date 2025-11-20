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
  generatedLesson: string | null; // NIEUW

  setSourcePool: (sources: any[]) => void;
  setProposals: (proposals: LessonProposal[]) => void;
  selectProposal: (id: number) => void;
  setGeneratedLesson: (markdown: string) => void; // NIEUW: De functie die miste!
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
      generatedLesson: null,

      setSourcePool: (sources) => set({ sourcePool: sources }),
      setProposals: (proposals) => set({ proposals, activeProposalId: null, basket: [], generatedLesson: null }),
      
      selectProposal: (id) => {
        const prop = get().proposals.find(p => p.id === id);
        if (prop) {
            set({ activeProposalId: id, basket: prop.selectedSourceIds });
        }
      },

      // HIER IS HIJ:
      setGeneratedLesson: (markdown) => set({ generatedLesson: markdown }),

      toggleInBasket: (sourceId) => {
          const current = get().basket;
          const next = current.includes(sourceId) 
            ? current.filter(id => id !== sourceId)
            : [...current, sourceId];
          set({ basket: next });
      },

      reset: () => set({ sourcePool: [], proposals: [], activeProposalId: null, basket: [], generatedLesson: null })
    }),
    { name: 'selection-storage' }
  )
);

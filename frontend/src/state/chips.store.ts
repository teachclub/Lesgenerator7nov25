import { create } from 'zustand';

/** Een chip uit de suggesties */
export type Chip = {
  kind: 'persoon' | 'gebeurtenis' | 'plaats' | 'begrip';
  label: string;
  count?: number;
};

/** Gesorteerde chips zoals de UI ze verwacht */
export type SortedChips = {
  onderwerp: {
    personen: Chip[];
    gebeurtenissen: Chip[];
    plaatsen: Chip[];
    begrippen: Chip[];
  };
};

/** Lege, veilige default */
export const EMPTY_CHIPS: SortedChips = {
  onderwerp: {
    personen: [],
    gebeurtenissen: [],
    plaatsen: [],
    begrippen: [],
  },
};

type ChipsState = {
  chips: SortedChips;
  setChips: (next: SortedChips) => void;
  clear: () => void;
};

export const useChipsStore = create<ChipsState>((set) => ({
  chips: EMPTY_CHIPS,
  setChips: (next) => set({ chips: next ?? EMPTY_CHIPS }),
  clear: () => set({ chips: EMPTY_CHIPS }),
}));


import { create } from "zustand";

export type Filters = {
  noImage: boolean;
  noText: boolean;
  noCartoon: boolean;
};

type FiltersState = Filters & {
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
};

export const useFiltersStore = create<FiltersState>((set) => ({
  noImage: false,
  noText: false,
  noCartoon: false,
  set: (patch) => set((s) => ({ ...s, ...patch })),
  reset: () => set({ noImage: false, noText: false, noCartoon: false }),
}));


import { create } from "zustand";

export type Source = { id: string; title: string; type: string; url: string; preset?: boolean };

type SelectionState = {
  max: number;
  selected: Source[];
  toggle: (s: Source) => void;     // alleen togglen via user events
  isSelected: (id: string) => boolean;
  clear: () => void;
};

export const useSelectionStore = create<SelectionState>((set, get) => ({
  max: 12,
  selected: [],
  toggle: (s) =>
    set(() => {
      const cur = get().selected;
      const exists = cur.some((x) => x.id === s.id);
      if (exists) return { selected: cur.filter((x) => x.id !== s.id) };
      if (cur.length >= get().max) return { selected: cur }; // respecteer limiet
      return { selected: [...cur, s] };
    }),
  isSelected: (id) => get().selected.some((x) => x.id === id),
  clear: () => set({ selected: [] }),
}));


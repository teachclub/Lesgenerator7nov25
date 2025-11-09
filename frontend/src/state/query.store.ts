import { create } from "zustand";

export type Mode = "AND" | "OR";

type QueryState = {
  terms: [string, string, string];
  mode: Mode;
  suggestSeed: string;
  setTerm: (index: 0 | 1 | 2, value: string) => void;
  setMode: (m: Mode) => void;
  setSuggestSeed: (s: string) => void;
  reset: () => void;
  buildQuery: () => string;
};

export const useQueryStore = create<QueryState>((set, get) => ({
  terms: ["", "", ""],
  mode: "AND",
  suggestSeed: "",
  setTerm: (index, value) =>
    set((s) => {
      const next = [...s.terms] as [string, string, string];
      next[index] = value;
      return { terms: next };
    }),
  setMode: (m) => set({ mode: m }),
  setSuggestSeed: (s) => set({ suggestSeed: s }),
  reset: () => set({ terms: ["", "", ""], mode: "AND", suggestSeed: "" }),
  buildQuery: () => {
    const { terms, mode } = get();
    const filled = terms.map((t) => t.trim()).filter(Boolean);
    if (filled.length === 0) return "";
    const joiner = ` ${mode} `;
    return filled.length === 1 ? filled[0] : filled.map((t) => `(${t})`).join(joiner);
  },
}));


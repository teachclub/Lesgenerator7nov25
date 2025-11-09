import { create } from "zustand";

export type Proposal = { id: string; title: string; summary?: string };

type ProposalsState = {
  loading: boolean;
  proposals: Proposal[];
  selectedId: string | null;
  setLoading: (b: boolean) => void;
  setProposals: (p: Proposal[]) => void;
  select: (id: string | null) => void;
};

export const useProposalsStore = create<ProposalsState>((set) => ({
  loading: false,
  proposals: [],
  selectedId: null,
  setLoading: (b) => set({ loading: b }),
  setProposals: (p) => set({ proposals: p, selectedId: null }),
  select: (id) => set({ selectedId: id }),
}));


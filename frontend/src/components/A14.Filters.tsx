import { useFiltersStore } from "@/state/filters.store";

export default function A14Filters() {
  const { noImage, noText, noCartoon, set } = useFiltersStore();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={noImage} onChange={(e) => set({ noImage: e.target.checked })} /> geen beeldbronnen
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={noText} onChange={(e) => set({ noText: e.target.checked })} /> geen tekstbronnen
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={noCartoon} onChange={(e) => set({ noCartoon: e.target.checked })} /> geen spotprenten
      </label>
    </div>
  );
}


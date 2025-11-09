import A16SearchBar from "@/components/A16.SearchBar";
import A14Filters from "@/components/A14.Filters";
import Chips from "@/components/A06.Chips";
import A19GenerateButton from "@/components/A19.GenerateButton";
import { useProposalsStore } from "@/state/proposals.store";
import SelectionList from "@/components/A30.SelectionList";
import Verzamelbak from "@/components/A31.Verzamelbak";

export default function PresetZoekerPage() {
  const { selectedId } = useProposalsStore();
  return (
    <div className="p-4 grid gap-4">
      <div className="grid md:grid-cols-2 gap-4">
        <A16SearchBar />
        <Chips />
      </div>
      <A14Filters />
      <A19GenerateButton />
      {selectedId && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SelectionList />
          </div>
          <div className="md:col-span-1">
            <Verzamelbak />
          </div>
        </div>
      )}
    </div>
  );
}


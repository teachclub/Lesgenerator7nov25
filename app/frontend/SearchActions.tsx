import React from "react";
// (Aanname: de store bestaat op dit pad)
import { useQueryStore } from "../../state/query.store"; 

type SearchActionsProps = {
  onSearchHits: () => void;
  onGetChips: () => void;
  onGenerateProposals: () => void;
  isSearchingHits?: boolean;
  isGettingChips?: boolean;
  isGeneratingProposals?: boolean;
};

/**
 * SearchActions (Gerepareerd)
 * - crasht niet als terms nog undefined / lege slots bevatten
 */
export const SearchActions: React.FC<SearchActionsProps> = ({
  onSearchHits,
  onGetChips,
  onGenerateProposals,
  isSearchingHits = false,
  isGettingChips = false,
  isGeneratingProposals = false,
}) => {
  // Haal de terms en modus uit de query-store (met veilige defaults)
  
  // --- HIER ZAT DE FOUT (GECORRIGEERD) ---
  const terms = useQueryStore((s: any) => s.terms??); // <-- TOEGEVOEGD
  const mode = useQueryStore((s: any) => s.mode?? "AND");

  // VEILIG: ga er nooit vanuit dat elk element een string is
  const hasTerms =
    Array.isArray(terms) &&
    terms.some(
      (t: unknown) =>
        typeof t === "string" && t.trim().length > 0
    );

  const isBusy = isSearchingHits |

| isGettingChips |
| isGeneratingProposals;
  const disableActions =!hasTerms |

| isBusy;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSearchHits}
        disabled={disableActions}
        className="px-3 py-1 text-sm rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        Zoek Bronnen (Hits)
      </button>

      <button
        type="button"
        onClick={onGetChips}
        disabled={disableActions}
        className="px-3 py-1 text-sm rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        Geef Zoeksuggesties
      </button>

      <button
        type="button"
        onClick={onGenerateProposals}
        disabled={disableActions}
        className="px-3 py-1 text-sm rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        Genereer Lesvoorstellen
      </button>

      <div className="ml-2 text-xs text-gray-400 self-center">
        Mode: {mode} {hasTerms? "" : "— vul eerst één of meer zoektermen in"}
      </div>
    </div>
  );
};

export default SearchActions;

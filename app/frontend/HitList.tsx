import React from "react";
// We moeten 'Hit' nog definiëren, maar voor nu is 'any' prima
// import type { Hit } from "../../api/useSearchApi";
type Hit = any;

type HitListState = {
  data?: {
    items?: Hit; // Belangrijk: dit is een array
    totalResults?: number;
  };
  isLoading?: boolean; 
  isError?: boolean;
  error?: unknown;
};

type HitListProps = {
  state?: HitListState; // mag undefined zijn
};

/**
 * HitList (Gerepareerd)
 * - toont de Europeana-hits in kolom 2
 * - crasht niet als 'state' (nog) undefined is
 */
export const HitList: React.FC<HitListProps> = ({ state }) => {
  
  // --- HIER ZAT DE FOUT (GECORRIGEERD) ---
  const items: Hit = state?.data?.items??; // <-- TOEGEVOEGD
  const total = state?.data?.totalResults?? 0;
  const isLoading =!!state?.isLoading; 
  const isError =!!state?.isError;

  const errorMessage =
    state?.error && typeof (state.error as any).message === "string"
 ? (state.error as any).message
      : null;

  if (isLoading) {
    return (
      <div className="p-3 rounded-lg border border-gray-200 bg-white">
        <div className="text-sm text-gray-500">Treffers laden…</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 rounded-lg border border-red-200 bg-red-50">
        <div className="text-sm text-red-700">
          Fout bij zoeken: {errorMessage?? "onbekende fout"}
        </div>
      </div>
    );
  }

  if (items.length === 0) { // Deze check is nu veilig
    return (
      <div className="p-3 rounded-lg border border-gray-200 bg-white">
        <div className="text-sm text-gray-400">Nog geen resultaten.</div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-white">
      <div className="mb-2 text-sm font-medium text-gray-700">2. Treffers</div>
      <div className="mb-2 text-xs text-gray-500">
        {total} resultaten (eerste {items.length} getoond)
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((hit, idx) => (
          <li key={hit.id?? hit.link?? idx} className="border-b pb-1">
            <div className="font-medium">
              {hit.title |

| hit.description |
| "Zonder titel"}
            </div>
            {hit.link && (
              <a
                href={hit.link}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline"
              >
                open in Europeana
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HitList;

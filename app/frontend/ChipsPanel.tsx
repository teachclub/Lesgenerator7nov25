import { AlertCircle, Loader2, Tag } from 'lucide-react';
import { Chip } from '../../api/useChipsApi';
import { useMemo } from 'react';

interface ChipsPanelProps {
  chips: Chip[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onChipClick: (term: string) => void;
}

type ChipGroup = Record<string, Chip[]>;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const ChipsPanel = ({
  chips,
  isLoading,
  error,
  onChipClick,
}: ChipsPanelProps) => {
  const groupedChips = useMemo(() => {
    if (!chips) return {};
    return chips.reduce((acc, chip) => {
      const kind = capitalize(chip.kind || 'overig');
      if (!acc[kind]) {
        acc[kind] = [];
      }
      acc[kind].push(chip);
      return acc;
    }, {} as ChipGroup);
  }, [chips]);

  const categories = Object.keys(groupedChips).sort();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-gray-500 h-full">
          <Loader2 className="animate-spin h-8 w-8" />
          <span className="mt-2">Zoeksuggesties laden...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-red-600 h-full p-4">
          <AlertCircle className="h-8 w-8" />
          <span className="mt-2 text-center font-semibold">
            Fout bij ophalen suggesties
          </span>
          <span className="text-sm text-gray-700">{error.message}</span>
        </div>
      );
    }

    if (!chips || chips.length === 0) {
      return (
        <div className="flex items-center justify-center text-gray-500 h-full p-4">
          <span>Geen suggesties gevonden.</span>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        {categories.map((category) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-gray-600 mb-2 border-b pb-1 flex items-center">
              <Tag className="h-4 w-4 mr-2 text-gray-400" />
              {category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {groupedChips[category].map((chip) => (
                <button
                  key={chip.term}
                  onClick={() => onChipClick(chip.term)}
                  title={`Zoek verder met: "${chip.term}"`}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all
                    ${
                      chip.verified
                        ? 'bg-yellow-200 text-yellow-900 hover:bg-yellow-300'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }
                    shadow-sm border
                    ${
                      chip.verified
                        ? 'border-yellow-300'
                        : 'border-gray-300'
                    }
                  `}
                >
                  + {chip.term}{' '}
                  <span
                    className={`ml-1.5 text-xs ${
                      chip.verified
                        ? 'text-yellow-700'
                        : 'text-gray-500'
                    }`}
                  >
                    ({chip.count})
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-2 border-b border-gray-300 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">
          Zoeksuggesties (Geverifieerd)
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">{renderContent()}</div>
    </div>
  );
};

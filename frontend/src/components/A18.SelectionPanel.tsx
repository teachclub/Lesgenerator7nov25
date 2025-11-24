// Geen 'import React' meer nodig hier
export type SelectionMode = 'auto' | 'manual';

export interface Source {
  id: string;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  type?: string;
}

interface Props {
  sources: Source[];
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  onRemoveSource: (id: string) => void;
  isLoading: boolean;
}

// We halen 'mode' en 'onModeChange' hier weg omdat we ze nog niet gebruiken
export function A18SelectionPanel({ sources, onRemoveSource, isLoading }: Props) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-center bg-gray-100 p-2 rounded text-sm">
         <span className="font-semibold text-gray-600">Selectie ({sources.length})</span>
      </div>

      {/* Lijst */}
      {isLoading ? (
        <div className="text-gray-400 text-sm p-2">Laden...</div>
      ) : (
        <ul className="space-y-1">
          {sources.map((source) => (
            <li key={source.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
              <span className="truncate text-sm font-medium">{source.title}</span>
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSource(source.id);
                }}
                className="text-red-400 hover:text-red-600 ml-2"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

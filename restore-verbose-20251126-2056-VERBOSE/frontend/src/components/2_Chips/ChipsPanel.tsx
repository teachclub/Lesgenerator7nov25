import React from 'react';
import { useQueryStore } from '../../state/query.store';

export const ChipsPanel: React.FC = () => {
  // LUISTER NAAR DE STORE (de fix)
  const state = useQueryStore((s: any) => s.chipsResult);
  const terms = useQueryStore((s: any) => s.terms ?? []);
  const setTerm = useQueryStore((s: any) => s.setTerm);

  // Haal data uit de state
  const suggestions: any[] = state?.data ?? [];
  const isLoading = !!state?.isLoading;
  const isError = !!state?.isError;
  
  const handleChipClick = (chipLabel: string) => {
    // Vind het eerste lege veld
    const emptyIndex = terms.findIndex((t: string) => t.trim() === '');
    
    if (emptyIndex !== -1) {
      // Vul het eerste lege veld
      setTerm(emptyIndex, chipLabel);
    } else {
      // Of vervang het laatste veld (index 2)
      setTerm(2, chipLabel);
    }
  };

  if (isLoading) return <div className="text-yellow-600 italic p-2">Analyseren...</div>;

  if (isError) return <div className="text-red-500 p-2">Fout bij laden suggesties.</div>;
  
  if (suggestions.length === 0 && state?.data) {
      return <div className="text-sm text-gray-400 p-2">Geen specifieke suggesties gevonden.</div>;
  }
  
  if (suggestions.length === 0 && !state?.data) {
       return <div className="text-sm text-gray-400 p-2">Nog geen suggesties. Klik op 'Suggesties' om te starten.</div>;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {suggestions.map((chip: any, idx: number) => (
        <button
          key={idx}
          onClick={() => handleChipClick(chip.label)}
          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm border border-yellow-300 transition-colors text-left shadow-sm"
        >
          <span className="font-bold">+ {chip.label}</span>
          {chip.count && <span className="text-xs text-yellow-600 ml-1">({chip.count})</span>}
        </button>
      ))}
    </div>
  );
};

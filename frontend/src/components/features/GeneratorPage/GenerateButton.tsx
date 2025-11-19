import React from 'react';
import { useQueryStore } from '../../../state/query.store';
import { useSelectionStore } from '../../../state/selection.store';

export const GenerateButton: React.FC = () => {
  const { hits } = useQueryStore();
  // We halen de functies op, maar voor de switch gebruiken we een harde override
  const { setSourcePool } = useSelectionStore();

  const count = hits.length;
  // Limiet 40
  const isValid = count >= 2 && count <= 40;

  const handleGenerate = () => {
    if (!isValid) return;

    // 1. Update de store in het huidige tabblad (voor de vorm)
    setSourcePool(hits);

    // 2. HARDE OPSLAG FORCEER ACTIE
    // We schrijven direct naar localStorage, zodat het 100% zeker op schijf staat
    // voordat het nieuwe tabblad opent. Dit negeert de vertraging van Zustand.
    const hardSaveData = {
        state: {
            sourcePool: hits,
            proposals: [],       // Reset voorstellen
            activeProposalId: null,
            basket: []
        },
        version: 0 // Standaard Zustand versioning
    };

    localStorage.setItem('selection-storage', JSON.stringify(hardSaveData));

    // 3. Nu pas openen we het tabblad. De data staat er nu gegarandeerd.
    window.open('/proposals', '_blank');
  };

  if (count === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={handleGenerate}
        disabled={!isValid}
        className={`
          px-6 py-4 rounded-full shadow-2xl font-bold text-lg flex items-center gap-2 transition-all transform hover:scale-105
          ${isValid 
            ? 'bg-green-600 text-white hover:bg-green-700 border-2 border-green-500' 
            : 'bg-gray-800 text-gray-400 cursor-not-allowed border-2 border-gray-700'}
        `}
      >
        <span>✨</span>
        {isValid 
          ? `Maak Lesvoorstellen (${count} bronnen)` 
          : count < 2 
            ? `Nog ${2 - count} bronnen nodig (min 2)`
            : `Te veel bronnen (${count}, max 40)`
        }
      </button>
    </div>
  );
};

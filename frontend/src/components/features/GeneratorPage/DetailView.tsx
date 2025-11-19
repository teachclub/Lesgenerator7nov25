import React from 'react';
import { useQueryStore } from '../../../state/query.store';
import { useShallow } from 'zustand/react/shallow';

export const DetailView: React.FC = () => {
  const { selectedHit, setSelectedHit } = useQueryStore(
    useShallow((s) => ({
      selectedHit: s.selectedHit,
      setSelectedHit: s.setSelectedHit,
    }))
  );

  // Helper om 'highlight' HTML veilig te renderen
  const createMarkup = (htmlContent: string | undefined) => {
    return { __html: htmlContent || '' };
  };

  // Als er geen hit is geselecteerd, toon een placeholder
  if (!selectedHit) {
    return (
      <div className="sticky top-8 p-4 bg-white border border-gray-200 rounded-lg shadow-sm h-full">
        <div className="flex flex-col justify-center items-center h-full text-center text-gray-500">
          <p className="text-lg font-semibold">Selecteer een bron</p>
          <p className="text-sm">Klik op een titel in de middelste kolom om hier de details te bekijken.</p>
        </div>
      </div>
    );
  }

  // Als er wel een hit is, toon de details
  return (
    <div className="sticky top-8 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Sluitknop */}
      <button
        onClick={() => setSelectedHit(null)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        aria-label="Sluit details"
      >
        &times;
      </button>

      <div className="space-y-3">
        <h2 className="text-xl font-bold text-blue-800">
          {selectedHit.title}
        </h2>

        <div className="text-xs text-gray-600 space-x-2">
          <span className="font-semibold">Bron:</span>
          <span>{selectedHit.provider}</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold">ID:</span>
          <span>{selectedHit.id}</span>
        </div>

        <p 
          className="text-sm text-gray-800 snippet-detail"
          dangerouslySetInnerHTML={createMarkup(selectedHit.highlight || selectedHit.description)}
        />

        <a 
          href={selectedHit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Bekijk bij bron
        </a>
      </div>
    </div>
  );
};

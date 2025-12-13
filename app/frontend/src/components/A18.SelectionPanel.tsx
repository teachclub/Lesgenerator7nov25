import React from 'react';
import { useSelectionStore, Source } from '../state/selection.store';

interface Props {
  onSelectSource?: (source: Source) => void;
  selectedId?: string | null;
}

export const SelectionPanel = ({ onSelectSource, selectedId }: Props) => {
  const { sources, removeSource } = useSelectionStore();

  const getImageUrl = (source: Source) => {
    if (!source.imageUrl) return null;
    const url = source.imageUrl;
    // Proxy gebruiken voor Cito en Kleio
    const needsProxy = source.provider === 'Cito' || source.provider === 'Kleio' || url.includes('kleio');

    if (needsProxy) {
       return `/api/image-proxy?url=${encodeURIComponent(url)}`;

    }
    return url;
  };

  // Helper: Is dit een "echt" plaatje of een placeholder?
  const isValidImage = (url?: string) => {
      if (!url) return false;
      // Filter specifiek het grijze poppetje van Google/Cito
      if (url.includes('profile/picture')) return false;
      return true;
  };

  if (!sources || sources.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
        <span className="text-4xl mb-2">🔍</span>
        <p className="text-sm">Geen resultaten.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {sources.map((source) => {
        // Check of het een geldig plaatje is
        const hasImage = isValidImage(source.imageUrl);

        return (
          <div 
            key={source.id} 
            onClick={() => onSelectSource && onSelectSource(source)}
            className={`
              bg-white rounded-lg border overflow-hidden flex flex-row cursor-pointer transition-all hover:shadow-md group relative
              ${selectedId === source.id ? 'ring-2 ring-indigo-600 border-indigo-600 shadow-md' : 'border-gray-200'}
              min-h-[7rem]
            `}
          >
            <button
              onClick={(e) => { e.stopPropagation(); removeSource(source.id); }}
              className="absolute top-1 right-1 z-10 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs"
              title="Verwijder"
            >
              &times;
            </button>

            {/* LINKERKOLOM: ALLEEN ALS ER EEN GELDIG PLAATJE IS */}
            {hasImage && (
               <div className="w-28 bg-gray-100 shrink-0 relative border-r border-gray-100">
                 <img 
                    src={getImageUrl(source)!} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                 />
                 <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] px-1 py-0.5 text-center truncate">
                    {source.provider}
                 </div>
               </div>
            )}

            {/* RECHTERKOLOM */}
            <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
               <div>
                 <div className="flex justify-between items-start pr-4">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug" title={source.title}>
                      {source.title}
                    </h3>
                 </div>
                 
                 <p className="text-xs text-gray-500 line-clamp-3 mt-1 leading-relaxed">
                   {source.description || source.content || "Geen beschrijving beschikbaar."}
                 </p>
               </div>

               <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                 {!hasImage ? (
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{source.provider}</span>
                 ) : <span></span>}
                 
                 <div className="flex gap-2 items-center">
                     <span className={`text-[10px] px-1.5 rounded font-bold ${source.type === 'IMAGE' ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>
                        {source.type === 'IMAGE' ? 'Beeld' : 'Tekst'}
                     </span>
                     {source.url && (
                       <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-xs font-bold">↗</a>
                     )}
                 </div>
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

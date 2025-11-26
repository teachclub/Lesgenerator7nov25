import React from 'react';
import { useSelectionStore, Source } from '../state/selection.store';

interface Props {
  onSelectSource?: (source: Source) => void;
  selectedId?: string | null;
}

export const SelectionPanel = ({ onSelectSource, selectedId }: Props) => {
  const { sources, removeSource } = useSelectionStore();

  // DE FIX: We kijken nu naar de PROVIDER, niet alleen de URL
  const getImageUrl = (source: Source) => {
    if (!source.imageUrl) return null;
    
    const url = source.imageUrl;
    const isCito = source.provider === 'Cito' || source.id.startsWith('cito');
    const isKleio = source.provider === 'Kleio' || url.includes('kleio') || url.includes('vgn');

    // Als het Cito of Kleio is -> ALTIJD via de proxy
    if (isCito || isKleio) {
       return `http://localhost:8081/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
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
    <div className="grid grid-cols-1 gap-4">
      {sources.map((source) => (
        <div 
          key={source.id} 
          onClick={() => onSelectSource && onSelectSource(source)}
          className={`
            bg-white rounded-lg border overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-md group relative
            ${selectedId === source.id ? 'ring-2 ring-indigo-600 border-indigo-600 shadow-md' : 'border-gray-200'}
          `}
        >
          {/* Wegklik Knop */}
          <button
            onClick={(e) => { e.stopPropagation(); removeSource(source.id); }}
            className="absolute top-1 right-1 z-10 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity font-bold"
            title="Verwijder deze bron"
          >
            &times;
          </button>

          <div className="flex h-24">
             {/* Plaatje */}
             <div className="w-24 bg-gray-100 shrink-0 relative">
               {source.imageUrl ? (
                 <img 
                    src={getImageUrl(source)} 
                    className="w-full h-full object-cover" 
                    loading="lazy" 
                    onError={(e) => {
                        // Fallback als plaatje echt stuk is
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
                    }}
                 />
               ) : null}
               {/* Fallback div (zichtbaar als img faalt of er niet is) */}
               <div className={`w-full h-full flex items-center justify-center text-gray-300 text-xs absolute top-0 left-0 bg-gray-100 ${source.imageUrl ? 'hidden' : ''}`}>
                 Geen beeld
               </div>
             </div>
             
             {/* Tekst */}
             <div className="p-3 flex-1 min-w-0 flex flex-col justify-between bg-white">
               <div>
                 <h3 className="font-bold text-gray-900 text-sm line-clamp-1 pr-6" title={source.title}>{source.title}</h3>
                 <p className="text-xs text-gray-500 line-clamp-2 mt-1">{source.description || source.content}</p>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-[10px] uppercase font-bold text-gray-400">{source.provider}</span>
                 <span className={`text-[10px] px-1.5 rounded ${source.type === 'IMAGE' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                    {source.type === 'IMAGE' ? 'Beeld' : 'Tekst'}
                 </span>
               </div>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

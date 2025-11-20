import React from 'react';
import { useQueryStore } from '../../../state/query.store';
import { useShallow } from 'zustand/react/shallow';
import { ClipLoader } from 'react-spinners';
import { Hit } from '../../../types/search-result.interface';

const HitItem: React.FC<{ hit: Hit; onSelect: (hit: Hit) => void }> = ({ hit, onSelect }) => {
  const createMarkup = (htmlContent: string | undefined) => {
    return { __html: htmlContent || hit.description || '' }; 
  };

  const hasImage = !!hit.imageUrl;

  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-3 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white flex gap-4">
      {hasImage && (
        <div className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded overflow-hidden border border-gray-300">
          <img 
            key={hit.imageUrl} 
            src={hit.imageUrl} 
            alt="Bron" 
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer" // <--- DIT IS DE TRUC
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
            <div className="flex justify-between items-start">
                <button onClick={() => onSelect(hit)} className="text-base font-bold text-blue-700 hover:underline text-left block mb-1 leading-tight">
                    {hit.title || 'Naamloze Bron'}
                </button>
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 uppercase tracking-wider">
                    {hit.provider}
                </span>
            </div>
            <div className="text-xs text-gray-500 mb-2 flex flex-wrap gap-1">
                {hit.tv && hit.tv.map((t, i) => <span key={i} className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">{t}</span>)}
            </div>
            <div className="text-xs text-gray-700 mb-1 line-clamp-3 snippet-content" dangerouslySetInnerHTML={createMarkup(hit.highlight)} />
        </div>
        <button onClick={() => onSelect(hit)} className="text-xs font-medium text-blue-600 hover:text-blue-800 mt-1 self-start">
            Lees meer &rarr;
        </button>
      </div>
    </div>
  );
};

export const HitList: React.FC = () => {
  const { hits, loading, error, totalHits, setSelectedHit } = useQueryStore(
    useShallow((s) => ({ hits: s.hits, loading: s.loading, error: s.error, totalHits: s.totalHits, setSelectedHit: s.setSelectedHit }))
  );

  if (loading) return <div className="flex justify-center items-center h-64"><ClipLoader color="#4A90E2" size={40} /></div>;
  if (error) return <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded"><p className="font-bold text-red-800 text-sm">Fout</p><p className="text-red-700 text-xs mt-1">{error}</p></div>;
  if (!hits || hits.length === 0) return <div className="flex flex-col items-center justify-center h-64 text-gray-400"><p className="italic">Geen resultaten.</p></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-baseline mb-2">
        <h3 className="text-lg font-bold text-gray-800">Resultaten</h3>
        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full">{totalHits} gevonden</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar" style={{ maxHeight: '80vh' }}>
        {hits.map((hit) => <HitItem key={hit.id} hit={hit} onSelect={setSelectedHit} />)}
      </div>
    </div>
  );
};

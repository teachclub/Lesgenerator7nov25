import React from 'react';
import { useQueryStore } from '../../../state/query.store';

const HitDetail: React.FC = () => {
  const selectedHit = useQueryStore((s) => s.selectedHit);

  if (!selectedHit) return <div className="h-full flex items-center justify-center text-gray-400">Selecteer een bron</div>;

  const hasImage = !!selectedHit.imageUrl;

  return (
    <div className="bg-white h-full flex flex-col border-l border-gray-200 overflow-y-auto custom-scrollbar p-6" style={{ maxHeight: '85vh' }}>
      <div className="mb-4"><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">{selectedHit.provider}</span></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedHit.title}</h2>

      {hasImage && (
        <div className="mb-6 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center">
          <img 
            key={selectedHit.imageUrl} // RESET TRUC
            src={selectedHit.imageUrl} 
            alt={selectedHit.title}
            className="w-full h-auto object-contain max-h-[500px]" 
            referrerPolicy="no-referrer" // GOOGLE TRUC
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
      )}

      <div className="prose prose-sm max-w-none text-gray-800 mt-4">
        <div className="whitespace-pre-wrap">{selectedHit.fullText || selectedHit.description}</div>
      </div>
      
      {selectedHit.link && <div className="mt-8 pt-4 border-t"><a href={selectedHit.link} target="_blank" className="text-blue-600 hover:underline">Bekijk origineel &rarr;</a></div>}
    </div>
  );
};
export default HitDetail;

import React from 'react';
import { useQueryStore } from '../../../state/query.store';

const HitDetail: React.FC = () => {
  const selectedHit = useQueryStore((s) => s.selectedHit);

  if (!selectedHit) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-4 text-center">
        <p>Selecteer een bron uit de lijst om details te bekijken</p>
      </div>
    );
  }

  const hasImage = !!selectedHit.imageUrl;

  return (
    <div 
      className="bg-white h-full flex flex-col border-l border-gray-200 overflow-y-auto custom-scrollbar p-6 shadow-lg rounded-l-lg"
      style={{ maxHeight: '85vh' }}
    >
      <div className="mb-4">
        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wide">
          {selectedHit.provider}
        </span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
        {selectedHit.title}
      </h2>

      {hasImage && (
        <div className="mb-6 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm min-h-[200px] flex items-center justify-center bg-gray-50">
          {/* DE FIX: 
             1. key={selectedHit.imageUrl} -> Forceert een verse start bij elk nieuw plaatje
             2. referrerPolicy="no-referrer" -> Zorgt dat Google de link niet blokkeert
             3. GEEN https force, gewoon de ruwe URL uit de database
          */}
          <img 
            key={selectedHit.imageUrl} 
            src={selectedHit.imageUrl} 
            alt={selectedHit.title}
            className="w-full h-auto object-contain max-h-[500px]" 
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
                // Alleen verbergen als het écht misgaat
                (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="mb-6 space-y-3">
        {selectedHit.tv && selectedHit.tv.length > 0 && (
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Tijdvakken</span>
            <div className="flex flex-wrap gap-2">
              {selectedHit.tv.map((t: string, i: number) => (
                <span key={i} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded border border-yellow-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {selectedHit.ka && selectedHit.ka.length > 0 && (
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Kenmerkende Aspecten</span>
            <ul className="list-disc list-inside text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
              {selectedHit.ka.map((k: string, i: number) => (
                <li key={i} className="mb-1 last:mb-0">{k}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="prose prose-sm max-w-none text-gray-800">
        <h3 className="text-sm font-bold text-gray-900 uppercase border-b pb-1 mb-3">Inhoud Bron</h3>
        <div className="whitespace-pre-wrap leading-relaxed">
            {selectedHit.fullText || selectedHit.description}
        </div>
      </div>

      {selectedHit.link && (
        <div className="mt-8 pt-4 border-t border-gray-100 pb-4">
          <a 
            href={selectedHit.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
          >
            Bekijk originele bron &rarr;
          </a>
        </div>
      )}
    </div>
  );
};

export default HitDetail;

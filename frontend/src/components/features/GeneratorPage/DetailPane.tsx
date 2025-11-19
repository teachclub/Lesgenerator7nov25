import React from 'react';
import ResilientImage from '../../common/ResilientImage';
import { Hit } from '../../../types/search-result.interface';

type DetailPaneProps = {
  hit: Hit;
};

export const DetailPane: React.FC<DetailPaneProps> = ({ hit }) => {
  const hasImage = !!hit.imageUrl;

  return (
    <div 
      className="bg-white h-full flex flex-col border-l border-gray-200 overflow-y-auto custom-scrollbar p-6 shadow-lg rounded-l-lg"
      style={{ maxHeight: '85vh' }}
    >
      <div className="mb-4">
        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wide">
          {hit.provider}
        </span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
        {hit.title}
      </h2>

      {hasImage && (
        <div className="mb-6 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm min-h-[200px] flex items-center justify-center">
          <ResilientImage
            key={hit.imageUrl} // Reset bij nieuwe URL
            src={hit.imageUrl}
            alt={hit.title}
            className="max-h-[400px]"
          />
        </div>
      )}

      <div className="mb-6 space-y-3">
        {hit.tv && hit.tv.length > 0 && (
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Tijdvakken</span>
            <div className="flex flex-wrap gap-2">
              {hit.tv.map((t: string, i: number) => (
                <span key={i} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded border border-yellow-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="prose prose-sm max-w-none text-gray-800">
        <h3 className="text-sm font-bold text-gray-900 uppercase border-b pb-1 mb-3">Inhoud Bron</h3>
        <div className="whitespace-pre-wrap leading-relaxed">
            {hit.fullText || hit.description}
        </div>
      </div>

      {hit.link && (
        <div className="mt-8 pt-4 border-t border-gray-100 pb-4">
          <a 
            href={hit.link} 
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

export default DetailPane;

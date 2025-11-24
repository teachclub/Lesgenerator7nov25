import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryStore } from '../state/query.store';
import { useSelectionStore, Source } from '../state/selection.store';
import { fetchPreset } from '../lib/api';
import { A14Filters } from '../components/A14.Filters';
import { A21TvKaSelect } from '../components/A21.TvKaSelect';

const MAX_GEMINI_SOURCES = 40;

export function PresetZoekerPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUniqueKey, setSelectedUniqueKey] = useState<string | null>(null);

  const queryState = useQueryStore();
  const selectionState = useSelectionStore();
  const navigate = useNavigate();

  // Helper voor proxy images
  const getProxiedImageUrl = (source: Source) => {
    if (!source.imageUrl) return undefined;
    if (source.provider === 'Kleio' || source.imageUrl.includes('vgnkleio.nl')) {
        return `http://localhost:8081/api/image-proxy?url=${encodeURIComponent(source.imageUrl)}`;
    }
    return source.imageUrl;
  };

  // Helper om operators toe te voegen aan de zoekterm
  const addOperator = (op: string) => {
    const current = queryState.term;
    const padding = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
    
    if (op === '()') {
         queryState.setTerm(`${current}${padding}(  )`);
         // Cursor positioneren zou hier mooi zijn, maar is complex in simpele React. 
         // Dit werkt goed genoeg.
    } else {
         queryState.setTerm(`${current}${padding}${op} `);
    }
  };

  const handleSearch = async () => {
    setError(null);
    setLoading(true);
    setSelectedUniqueKey(null);
    
    const payload = queryState.getSearchPayload();
    console.log("Zoeken met payload:", payload);

    try {
        const result = await fetchPreset(payload);
        if (result.ok) {
          selectionState.setSources(result.data.sources as Source[]);
        } else {
          setError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
        }
    } catch (e: any) {
        setError(e.message || "Fout bij verbinden");
    }
    setLoading(false);
  };

  const handleRemoveItem = (e: React.MouseEvent, uniqueKey: string, id: string) => {
      e.stopPropagation(); 
      selectionState.removeSource(id);
      if (selectedUniqueKey === uniqueKey) setSelectedUniqueKey(null);
  };

  const selectedSource = selectedUniqueKey 
    ? selectionState.sources.find((s, i) => `${s.id}-${i}` === selectedUniqueKey) 
    : null;

  const sourceCount = selectionState.sources.length;
  const isOverLimit = sourceCount > MAX_GEMINI_SOURCES;

  const handleProceed = () => {
      console.log('Knop ingedrukt! Navigeren naar voorstellen...');
      if (sourceCount > 0 && !isOverLimit) {
          navigate('/proposals');
      }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden font-sans">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <h1 className="text-2xl font-bold text-gray-800">Kleio Lesgenerator</h1>
        
        <div className="flex items-center gap-4">
            {isOverLimit && (
                <span className="text-red-600 text-sm font-bold bg-red-50 px-3 py-1 rounded border border-red-200 animate-pulse">
                    ⚠️ Maximaal {MAX_GEMINI_SOURCES} bronnen (nu: {sourceCount}). Verwijder er {sourceCount - MAX_GEMINI_SOURCES}.
                </span>
            )}
            <button 
                className={`px-4 py-2 rounded font-medium transition-colors flex items-center gap-2
                    ${sourceCount === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}
                    ${sourceCount > 0 && !isOverLimit ? 'bg-green-600 hover:bg-green-700 text-white shadow transform hover:scale-105 transition-transform' : ''}
                    ${isOverLimit ? 'bg-orange-400 text-white cursor-not-allowed opacity-80' : ''}
                `}
                disabled={sourceCount === 0 || isOverLimit}
                onClick={handleProceed}
            >
                Maak Lesvoorstellen ({sourceCount})
            </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        
        {/* KOLOM 1: FILTERS & ZOEKBALK MET OPERATORS */}
        <div className="col-span-3 bg-white border-r p-4 overflow-y-auto flex flex-col gap-6">
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">1. Zoekopdracht</h2>
            <div className="relative">
                <input
                    type="text"
                    value={queryState.term}
                    onChange={(e) => queryState.setTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Zoekterm..."
                    className="w-full p-3 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    disabled={loading}
                />
            </div>
            
            {/* HIER ZIJN JE KNOPPEN TERUG */}
            <div className="flex gap-2 mt-2 items-center flex-wrap">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Operators:</span>
                {['AND', 'OR', 'NOT'].map(op => (
                    <button
                        key={op}
                        onClick={() => addOperator(op)}
                        className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        disabled={loading}
                    >
                        {op}
                    </button>
                ))}
                <button
                    onClick={() => addOperator('()')}
                    className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                    disabled={loading}
                >
                    ( )
                </button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-700 mb-2">Tijdvak & KA</h2>
            <A21TvKaSelect 
                tv={queryState.tv}
                ka={queryState.ka}
                onChange={(val) => {
                    if (val.tv !== undefined) queryState.setTv(val.tv);
                    if (val.ka !== undefined) queryState.setKa(val.ka);
                }}
            />
          </div>

          <div>
             <h2 className="font-semibold text-gray-700 mb-2">Filters</h2>
             <A14Filters filters={queryState.filters} onToggle={queryState.toggleFilter} disabled={loading} />
          </div>

          {/* ZOEK KNOP - ONDERAAN */}
          <div className="mt-auto pt-4 border-t border-gray-100">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all flex justify-center items-center gap-2"
              >
                {loading ? (
                    <>
                       <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                       <span>Zoeken...</span>
                    </>
                ) : (
                    <>
                       <span>🔍</span>
                       <span>Start Zoeken</span>
                    </>
                )}
              </button>
          </div>
        </div>

        {/* KOLOM 2: RESULTATEN */}
        <div className="col-span-4 bg-gray-50 border-r p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-700">2. Resultaten</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${isOverLimit ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-200 text-gray-600'}`}>
                {sourceCount} items
            </span>
          </div>
          
          <div className="space-y-2">
            {selectionState.sources.map((source, index) => {
              const uniqueKey = `${source.id}-${index}`;
              const isSelected = selectedUniqueKey === uniqueKey;
              const displayImage = getProxiedImageUrl(source);

              return (
                <div 
                    key={uniqueKey}
                    onClick={() => setSelectedUniqueKey(uniqueKey)}
                    className={`group relative p-3 rounded border cursor-pointer transition-all flex gap-3 select-none
                        ${isSelected
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-sm'}`}
                >
                    <button
                        onClick={(e) => handleRemoveItem(e, uniqueKey, source.id)}
                        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Verwijder uit selectie"
                    >
                        ✕
                    </button>

                    {displayImage && (
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded overflow-hidden border border-gray-200">
                            <img 
                                src={displayImage} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 pr-6">
                        <h3 className="font-medium text-gray-900 truncate text-sm">{source.title || 'Naamloze bron'}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-6">{source.description || 'Geen beschrijving'}</p>
                        <span className="text-[10px] text-gray-400 uppercase mt-1 block">
                            {source.provider} • {source.type}
                        </span>
                    </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KOLOM 3: DETAIL */}
        <div className="col-span-5 bg-white p-6 overflow-y-auto">
           <h2 className="font-semibold text-gray-700 mb-4 border-b pb-2">3. Bron Detail</h2>
           {selectedSource ? (
               <div className="prose max-w-none">
                   <h3 className="text-xl font-bold mb-2">{selectedSource.title}</h3>
                   
                   {selectedSource.imageUrl && (
                       <div className="mb-4 border rounded p-1 bg-gray-50 block">
                           <img 
                               src={getProxiedImageUrl(selectedSource)} 
                               alt={selectedSource.title} 
                               className="max-w-full h-auto rounded max-h-[500px] object-contain mx-auto"
                               referrerPolicy="no-referrer"
                           />
                       </div>
                   )}

                   <div className="bg-blue-50 p-3 rounded text-sm text-blue-900 mb-4 border border-blue-100 flex justify-between items-center">
                       <div>
                           <strong>Bron:</strong> {selectedSource.provider} <br/>
                           <strong>Type:</strong> {selectedSource.type}
                       </div>
                       <button 
                            onClick={(e) => handleRemoveItem(e, selectedUniqueKey!, selectedSource.id)}
                            className="text-red-600 hover:text-red-800 text-xs font-bold underline"
                       >
                            Verwijder uit lijst
                       </button>
                   </div>

                   <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
                     {selectedSource.fullText || selectedSource.content || selectedSource.description || 'Geen inhoud beschikbaar.'}
                   </p>
                   
                   {selectedSource.url && (
                     <a href={selectedSource.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-blue-600 hover:underline font-medium text-sm">
                       Bekijk originele bron <span className="ml-1">↗</span>
                     </a>
                   )}
               </div>
           ) : (
               <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                   <p>Selecteer een resultaat uit de lijst</p>
               </div>
           )}
        </div>
      </div>
       {error && (<div className="fixed bottom-4 right-4 bg-red-100 text-red-700 p-4 rounded shadow border border-red-400 z-50">{error}</div>)}
    </div>
  );
}

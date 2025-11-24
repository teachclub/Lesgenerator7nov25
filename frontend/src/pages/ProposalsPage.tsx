import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectionStore, Source } from '../state/selection.store';
import { useQueryStore } from '../state/query.store';

interface Proposal {
  title: string;
  targetAudience: string;
  hook: string;
  rationale: string;
  selectedSourceIds: string[];
}

const ProposalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sources } = useSelectionStore();
  const { query } = useQueryStore();
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [error, setError] = useState('');
  const [viewingSource, setViewingSource] = useState<{source: Source, proposalIndex: number} | null>(null);

  const getProxiedImageUrl = (source: Source) => {
    if (!source || !source.imageUrl) return undefined;
    if (source.provider === 'Kleio' || source.imageUrl.includes('vgnkleio.nl')) {
        return `http://localhost:8081/api/image-proxy?url=${encodeURIComponent(source.imageUrl)}`;
    }
    return source.imageUrl;
  };

  useEffect(() => {
    const fetchProposals = async () => {
      const items = sources || [];
      if (items.length === 0) {
          setLoading(false);
          return;
      }

      try {
        const response = await fetch('http://localhost:8081/api/propose-lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            selectedSources: items,
            query: query || "Onderwerp"
          }),
        });

        if (!response.ok) throw new Error('Fout bij genereren');
        
        const rawData = await response.json();
        const dataArray = Array.isArray(rawData) ? rawData : [];
        
        const safeData = dataArray.map((p: any) => ({
            title: p?.title || "Naamloos Concept",
            targetAudience: p?.targetAudience || "Algemeen",
            hook: p?.hook || "Geen hook gegenereerd.",
            rationale: p?.rationale || "Geen uitleg beschikbaar.",
            selectedSourceIds: Array.isArray(p?.selectedSourceIds) ? p.selectedSourceIds : []
        }));

        setProposals(safeData);
      } catch (err: any) {
        console.error('Fetch Error:', err);
        setError('Kon geen voorstellen genereren. Is de backend online?');
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const handleRemoveSourceFromProposal = (proposalIndex: number, sourceIdToRemove: string) => {
      const updatedProposals = [...proposals];
      const prop = updatedProposals[proposalIndex];
      if (!prop) return;
      
      const currentIds = Array.isArray(prop.selectedSourceIds) ? prop.selectedSourceIds : [];
      prop.selectedSourceIds = currentIds.filter(id => id !== sourceIdToRemove);
      
      setProposals(updatedProposals);
      if (viewingSource && viewingSource.source.id === sourceIdToRemove) {
          setViewingSource(null);
      }
  };

  const handleChoose = async (prop: Proposal) => {
      if (!prop) return;
      setGeneratingLesson(true);
      const safeIds = Array.isArray(prop.selectedSourceIds) ? prop.selectedSourceIds : [];
      const usedSources = (sources || []).filter(s => safeIds.includes(s.id));

      try {
        const response = await fetch('http://localhost:8081/api/generate-lesson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                concept: { hook: prop.hook, context: prop.rationale },
                sources: usedSources
            })
        });

        if (!response.ok) throw new Error('Fout bij les genereren');

        const data = await response.json();
        const lessonContent = data.lessonPlan || data.markdown || "";
        navigate('/lesson', { state: { lessonPlan: lessonContent, images: usedSources } });

      } catch (e) {
          console.error(e);
          alert('Er ging iets mis bij het schrijven van de les (Check backend logs).');
          setGeneratingLesson(false);
      }
  };

  if (!loading && (!sources || sources.length === 0)) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 font-sans">
             <h2 className="text-2xl font-bold text-gray-800 mb-2">Je 'bakje' is leeg!</h2>
             <p className="text-gray-600 mb-6">Ga terug en zoek eerst naar bronnen.</p>
             <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold">Terug naar zoeken</button>
        </div>
      );
  }

  if (loading || generatingLesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 font-sans">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {generatingLesson ? 'De les wordt geschreven...' : 'De AI-Didacticus denkt na...'}
        </h2>
        <p className="text-gray-500">
            {generatingLesson ? 'Dit kan 10-20 seconden duren.' : `Hij bestudeert jouw ${sources?.length || 0} bronnen.`}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md border border-red-100">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Oeps</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700">Terug</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans relative">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold text-gray-900">Kies & Cureer</h1>
              <p className="text-gray-600 mt-1">Gele ster = Topkeuze. Streep weg wat niet past.</p>
          </div>
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 bg-white rounded shadow-sm border transition-colors">
            &larr; Terug naar zoeken
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {proposals.map((prop, idx) => {
            const safeIds = Array.isArray(prop.selectedSourceIds) ? prop.selectedSourceIds : [];
            
            return (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden hover:shadow-xl transition-all h-full">
              
              <div className="bg-indigo-50 p-6 border-b border-indigo-100">
                <div className="flex justify-between items-start mb-3">
                    <span className="bg-white text-indigo-800 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200 shadow-sm">
                        {prop.targetAudience}
                    </span>
                    <span className="text-4xl opacity-20 text-indigo-300 font-bold">0{idx + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-indigo-900 leading-tight h-14 overflow-hidden">{prop.title}</h3>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">De Verwondering</h4>
                    <div className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-400 text-amber-900 italic text-sm h-24 overflow-y-auto">
                        "{prop.hook}"
                    </div>
                </div>

                <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">De Context</h4>
                    <p className="text-gray-600 text-sm leading-relaxed h-32 overflow-y-auto">
                        {prop.rationale}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Bronnenmix
                        </h4>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {safeIds.length}
                        </span>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 border border-gray-100 rounded p-2 bg-gray-50">
                        {safeIds.length > 0 ? (
                            safeIds.map((sourceId, listIndex) => {
                                const source = (sources || []).find(s => s.id === sourceId);
                                if (!source) return null;

                                const imgUrl = getProxiedImageUrl(source);
                                // DE EERSTE 5 KRIJGEN EEN GOUDEN RANDJE
                                const isTopPick = listIndex < 5;

                                return (
                                    <div 
                                        key={sourceId} 
                                        onClick={() => setViewingSource({ source, proposalIndex: idx })}
                                        className={`group flex items-start gap-2 text-xs text-gray-600 bg-white p-2 rounded border relative hover:shadow-md transition-all cursor-zoom-in
                                            ${isTopPick ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200' : 'border-gray-200 hover:border-indigo-300'}
                                        `}
                                    >
                                        {isTopPick && (
                                            <div className="absolute -top-2 -left-2 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">
                                                ★ TOP
                                            </div>
                                        )}

                                        {imgUrl ? (
                                            <img 
                                                src={imgUrl} 
                                                alt="" 
                                                className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-200"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <span className={`w-10 h-10 rounded text-indigo-600 flex items-center justify-center font-bold flex-shrink-0 text-[10px] border
                                                ${isTopPick ? 'bg-white border-amber-200' : 'bg-indigo-50 border-indigo-100'}
                                            `}>
                                                {source.provider ? source.provider.substring(0,3) : '?'}
                                            </span>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <span className="truncate font-medium block text-gray-900 group-hover:text-indigo-700">{source.title}</span>
                                            <span className="text-[10px] text-gray-400 uppercase">{source.type} • {source.provider}</span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-xs text-red-400 italic text-center py-4">Geen bronnen meer over.</p>
                        )}
                    </div>
                </div>

                <button 
                  onClick={() => handleChoose(prop)}
                  disabled={safeIds.length === 0}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md flex justify-center items-center gap-2 group disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <span>Start met {safeIds.length} bronnen</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {/* POP-UP MODAL */}
        {viewingSource && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingSource(null)}>
                <div 
                    className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" 
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b flex justify-between items-start bg-gray-50">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 pr-8">{viewingSource.source.title}</h3>
                            <span className="text-xs text-gray-500 uppercase font-bold">{viewingSource.source.type} • {viewingSource.source.provider}</span>
                        </div>
                        <button onClick={() => setViewingSource(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                         {viewingSource.source.imageUrl && (
                            <img 
                                src={getProxiedImageUrl(viewingSource.source)} 
                                className="w-full h-64 object-contain bg-gray-100 rounded mb-6 border"
                                referrerPolicy="no-referrer"
                            />
                         )}
                         <div className="prose prose-sm max-w-none text-gray-700">
                             <p className="whitespace-pre-wrap">{viewingSource.source.content || viewingSource.source.description || "Geen tekst beschikbaar."}</p>
                         </div>
                         {viewingSource.source.url && (
                             <a href={viewingSource.source.url} target="_blank" rel="noopener" className="block mt-4 text-indigo-600 underline font-bold">
                                 Bekijk origineel &rarr;
                             </a>
                         )}
                    </div>

                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                        <button 
                            onClick={() => setViewingSource(null)}
                            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded"
                        >
                            Sluiten
                        </button>
                        <button 
                            onClick={() => handleRemoveSourceFromProposal(viewingSource.proposalIndex, viewingSource.source.id)}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-bold hover:bg-red-100 rounded flex items-center gap-2"
                        >
                            <span>🗑️</span> Verwijder uit concept
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ProposalsPage;

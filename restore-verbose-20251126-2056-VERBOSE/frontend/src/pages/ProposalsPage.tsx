import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectionStore, Source } from '../state/selection.store';
import { useQueryStore } from '../state/query.store';

interface Proposal {
  title: string; targetAudience: string; hook: string; rationale: string; selectedSourceIds: string[];
}

interface ViewingState { source: Source; proposalIndex: number; }

const ProposalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sources } = useSelectionStore();
  const { query } = useQueryStore();
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackInputs, setFeedbackInputs] = useState<{[key: number]: string}>({});
  const [refiningStates, setRefiningStates] = useState<{[key: number]: boolean}>({});
  const [viewingState, setViewingState] = useState<ViewingState | null>(null);
  const [error, setError] = useState('');

  const getProxiedImageUrl = (source: Source) => {
    if (!source || !source.imageUrl) return undefined;
    const url = source.imageUrl.toLowerCase();
    if (source.provider === 'Kleio' || source.provider === 'Cito' || url.includes('vgnkleio') || url.includes('cito')) {
        return `http://localhost:8081/api/image-proxy?url=${encodeURIComponent(source.imageUrl)}`;
    }
    return source.imageUrl;
  };

  useEffect(() => {
    const fetchProposals = async () => {
      if (!sources || sources.length === 0) { setLoading(false); return; }
      try {
        const response = await fetch('http://localhost:8081/api/propose-lessons-v2', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedSources: sources, query: query || "Onderwerp" }),
        });
        if (!response.ok) throw new Error('Fout bij genereren');
        const data = await response.json();
        setProposals(data);
      } catch (err: any) { setError('Backend offline?'); } 
      finally { setLoading(false); }
    };
    fetchProposals();
  }, []);

  const handleRemoveSource = (proposalIndex: number, sourceId: string) => {
      const newProposals = [...proposals];
      const prop = newProposals[proposalIndex];
      if (prop) {
          prop.selectedSourceIds = prop.selectedSourceIds.filter(id => id !== sourceId);
          setProposals(newProposals);
          if (viewingState && viewingState.source.id === sourceId) setViewingState(null);
      }
  };

  const handleRefine = async (idx: number) => {
    const feedback = feedbackInputs[idx];
    if (!feedback) return;
    setRefiningStates(prev => ({ ...prev, [idx]: true }));
    try {
        const response = await fetch('http://localhost:8081/api/refine-concept', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentProposal: proposals[idx], feedback: feedback, sources: sources })
        });
        const updatedProposal = await response.json();
        const newProposals = [...proposals];
        newProposals[idx] = updatedProposal;
        setProposals(newProposals);
        setFeedbackInputs(prev => ({ ...prev, [idx]: '' }));
    } catch (e) { alert('Mislukt'); } 
    finally { setRefiningStates(prev => ({ ...prev, [idx]: false })); }
  };

  // --- DE FIX: OPEN IN NIEUW TABBLAD ---
  const handleChoose = (prop: Proposal) => {
      const safeIds = prop.selectedSourceIds || [];
      const usedSources = sources.filter(s => safeIds.includes(s.id));

      // 1. Sla data op in LocalStorage (zodat het nieuwe tabblad het kan lezen)
      localStorage.setItem('lessonContext', JSON.stringify({
          concept: prop,
          sources: usedSources
      }));

      // 2. Open nieuw tabblad
      window.open('/lesson', '_blank');
  };

  if (loading) return <div className="p-10 text-center font-bold">🤖 Concepten bedenken...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900">Kies & Cureer (V2)</h1></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {proposals.map((prop, idx) => {
            const safeIds = prop.selectedSourceIds || [];
            const isRefining = refiningStates[idx];
            return (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden hover:shadow-xl transition-all h-[800px]">
              <div className="bg-indigo-50 p-5 border-b border-indigo-100 shrink-0">
                <div className="flex justify-between mb-2"><span className="bg-white text-indigo-800 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">{prop.targetAudience}</span><span className="text-4xl opacity-20 text-indigo-300 font-bold">0{idx + 1}</span></div>
                <h3 className="text-lg font-bold text-indigo-900 leading-tight line-clamp-2">{prop.title}</h3>
              </div>
              <div className="p-5 flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto pr-2 space-y-6 flex-1">
                    <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">De Verwondering</h4><div className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-400 text-amber-900 italic text-sm mb-3">"{prop.hook}"</div><p className="text-gray-600 text-sm leading-relaxed">{prop.rationale}</p></div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200"><div className="flex gap-2"><input type="text" disabled={isRefining} value={feedbackInputs[idx] || ''} onChange={(e) => setFeedbackInputs({...feedbackInputs, [idx]: e.target.value})} placeholder="Stuur AI bij..." className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"/><button onClick={() => handleRefine(idx)} disabled={isRefining} className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded hover:bg-black disabled:opacity-50">{isRefining ? '...' : 'Pas aan'}</button></div></div>
                    <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between"><span>Bronnenmix</span><span className="bg-gray-100 px-2 rounded text-gray-600">{safeIds.length}</span></h4><div className="space-y-2">{safeIds.map((sourceId, listIdx) => { const source = sources.find(s => s.id === sourceId); if (!source) return null; const imgUrl = getProxiedImageUrl(source); const isTop = listIdx < 5; return ( <div key={sourceId} onClick={() => setViewingState({ source, proposalIndex: idx })} className={`relative flex gap-3 p-2 rounded border cursor-zoom-in transition-colors group ${isTop ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}> {isTop && <div className="absolute -top-2 -left-1 text-xs bg-white rounded-full shadow-sm border border-amber-200 px-1">⭐</div>} <div className="w-12 h-12 bg-gray-200 shrink-0 rounded overflow-hidden"> {imgUrl ? <img src={imgUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">Geen beeld</div>} </div> <div className="flex-1 min-w-0"> <div className="text-xs font-bold text-gray-900 truncate">{source.title}</div> <div className="text-[10px] text-gray-500 truncate">{source.provider} • {source.type}</div> </div> <button onClick={(e) => { e.stopPropagation(); handleRemoveSource(idx, source.id); }} className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 bg-white text-red-500 hover:bg-red-100 border border-gray-200 rounded p-1 shadow-sm transition-all" title="Verwijder"><span className="text-xs font-bold px-1">✕</span></button> </div> ); })}</div></div>
                </div>
                <div className="pt-4 mt-2 border-t border-gray-100"><button onClick={() => handleChoose(prop)} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-md flex justify-center items-center gap-2">Start Les Maken (Nieuw Tabblad) ↗</button></div>
              </div>
            </div>
            );
          })}
        </div>

        {viewingState && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8" onClick={() => setViewingState(null)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-full overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6 border-b flex justify-between items-start"><div><span className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1 block">{viewingState.source.provider}</span><h2 className="text-xl font-bold text-gray-900">{viewingState.source.title}</h2></div><button onClick={() => setViewingState(null)} className="text-gray-400 hover:text-black text-2xl">&times;</button></div>
                    <div className="p-6 overflow-y-auto">{viewingState.source.imageUrl && <img src={getProxiedImageUrl(viewingState.source)} className="w-full max-h-80 object-contain bg-gray-50 mb-6 rounded border" />}<div className="prose prose-sm max-w-none text-gray-700"><p className="whitespace-pre-wrap">{viewingState.source.fullText || viewingState.source.content}</p></div></div>
                    <div className="p-4 border-t bg-gray-50 flex justify-between items-center">{viewingState.source.url ? <a href={viewingState.source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline text-sm">Bekijk origineel ↗</a> : <div></div>}<div className="flex gap-3"><button onClick={() => setViewingState(null)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded text-sm">Sluiten</button><button onClick={() => handleRemoveSource(viewingState.proposalIndex, viewingState.source.id)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-bold hover:bg-red-100 rounded flex items-center gap-2 text-sm"><span>🗑️</span> Verwijder</button></div></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
export default ProposalsPage;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectionStore, Source } from '../state/selection.store';
import { useQueryStore } from '../state/query.store';
import { useLessonStoreV2 } from '../state/lesson-v2.store'; // <--- V2 Store

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
  const { setLessonPlan } = useLessonStoreV2(); // <--- V2 Setter
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [error, setError] = useState('');
  const [viewingSource, setViewingSource] = useState<{source: Source, proposalIndex: number} | null>(null);

  // Status voor feedback
  const [feedbackInputs, setFeedbackInputs] = useState<{[key: number]: string}>({});
  const [refiningStates, setRefiningStates] = useState<{[key: number]: boolean}>({});

  const getProxiedImageUrl = (source: Source) => {
    if (!source || !source.imageUrl) return undefined;
    if (source.provider === 'Kleio' || source.imageUrl.includes('vgnkleio.nl')) {
        return `http://localhost:8081/api/image-proxy?url=${encodeURIComponent(source.imageUrl)}`;
    }
    return source.imageUrl;
  };

  useEffect(() => {
    const fetchProposals = async () => {
      if (!sources || sources.length === 0) { setLoading(false); return; }

      try {
        // GEBRUIKT NU V2 API (Strenge Portier)
        const response = await fetch('http://localhost:8081/api/propose-lessons-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedSources: sources, query: query || "Onderwerp" }),
        });

        if (!response.ok) throw new Error('Fout bij genereren');
        const data = await response.json();
        setProposals(data);
      } catch (err: any) {
        console.error('Fetch Error:', err);
        setError('Kon geen voorstellen genereren. Is de backend online?');
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, []);

  const handleRefine = async (idx: number) => {
    const feedback = feedbackInputs[idx];
    if (!feedback) return;
    setRefiningStates(prev => ({ ...prev, [idx]: true }));

    try {
        const response = await fetch('http://localhost:8081/api/refine-concept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentProposal: proposals[idx],
                feedback: feedback,
                sources: sources
            })
        });
        if (!response.ok) throw new Error('Mislukt');
        const updatedProposal = await response.json();
        const newProposals = [...proposals];
        newProposals[idx] = updatedProposal;
        setProposals(newProposals);
        setFeedbackInputs(prev => ({ ...prev, [idx]: '' }));
    } catch (e) { alert('Kon concept niet aanpassen.'); } 
    finally { setRefiningStates(prev => ({ ...prev, [idx]: false })); }
  };

  const handleChoose = async (prop: Proposal) => {
      setGeneratingLesson(true);
      const safeIds = prop.selectedSourceIds || [];
      const usedSources = sources.filter(s => safeIds.includes(s.id));

      try {
        // GEBRUIKT NU V2 API (Cito Generator)
        const response = await fetch('http://localhost:8081/api/generate-lesson-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept: prop, sources: usedSources })
        });

        if (!response.ok) throw new Error('Fout bij les genereren');
        const data = await response.json();
        setLessonPlan(data); // Slaat op in V2 store
        navigate('/lesson');

      } catch (e) {
          console.error(e);
          alert('Er ging iets mis bij het schrijven van de les.');
          setGeneratingLesson(false);
      }
  };

  if (loading || generatingLesson) return <div className="p-10 text-center font-bold">🤖 De AI is hard aan het werk... ({generatingLesson ? 'Cito-Les schrijven' : 'Concepten bedenken'})</div>;
  if (error) return <div className="p-10 text-center text-red-600 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900">Kies & Cureer (V2)</h1></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {proposals.map((prop, idx) => {
            const safeIds = prop.selectedSourceIds || [];
            const isRefining = refiningStates[idx];
            return (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden hover:shadow-xl transition-all h-full">
              <div className="bg-indigo-50 p-6 border-b border-indigo-100">
                <div className="flex justify-between mb-2">
                    <span className="bg-white text-indigo-800 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">{prop.targetAudience}</span>
                    <span className="text-4xl opacity-20 text-indigo-300 font-bold">0{idx + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-indigo-900 leading-tight">{prop.title}</h3>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">De Verwondering</h4>
                    <div className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-400 text-amber-900 italic text-sm">"{prop.hook}"</div>
                </div>
                <div className="mb-6"><p className="text-gray-600 text-sm leading-relaxed">{prop.rationale}</p></div>
                
                <div className="mb-6 bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex gap-2">
                        <input type="text" disabled={isRefining} value={feedbackInputs[idx] || ''} onChange={(e) => setFeedbackInputs({...feedbackInputs, [idx]: e.target.value})} placeholder="Feedback..." className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"/>
                        <button onClick={() => handleRefine(idx)} disabled={isRefining || !feedbackInputs[idx]} className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded hover:bg-black disabled:opacity-50">{isRefining ? '...' : 'Pas aan'}</button>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-3"><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bronnen ({safeIds.length})</h4></div>
                    <div className="flex -space-x-2 overflow-hidden py-2">
                        {safeIds.slice(0, 5).map((id, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">{i+1}</div>
                        ))}
                        {safeIds.length > 5 && <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-500">+{safeIds.length - 5}</div>}
                    </div>
                </div>
                <button onClick={() => handleChoose(prop)} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md flex justify-center items-center gap-2">Start Les Maken →</button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default ProposalsPage;

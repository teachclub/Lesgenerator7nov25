import React, { useState } from 'react';
import { useSelectionStore } from '../state/selection.store';
import { useNavigate } from 'react-router-dom';

const ProposalsPage: React.FC = () => {
  const { sourcePool, proposals, setProposals, selectProposal, setGeneratedLesson } = useSelectionStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (sourcePool.length < 2) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8080/api/propose-lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: sourcePool }),
      });

      if (!response.ok) throw new Error('Fout bij genereren');
      const data = await response.json();
      setProposals(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: number) => {
    selectProposal(id);
    // Reset eventuele oude les en navigeer direct
    setGeneratedLesson(""); 
    navigate('/lesson');
  };

  const renderRationale = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return <br key={index} />;
      const match = cleanLine.match(/^(.+\(.+\)):(.+)/);
      if (match) {
        return (
          <div key={index} className="mb-3 last:mb-0">
            <span className="font-bold text-gray-900 text-sm">{match[1]}</span>
            <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{match[2]}</p>
          </div>
        );
      }
      return <div key={index} className="mb-2 text-gray-700 text-sm">{cleanLine}</div>;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Lesontwerp Studio</h1>
          <p className="text-lg text-gray-600">Input: <span className="font-bold text-blue-600">{sourcePool.length} bronnen</span></p>
        </header>

        {proposals.length === 0 && !loading && (
          <div className="flex justify-center">
             <button onClick={handleGenerate} className="bg-blue-600 text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:bg-blue-700 hover:scale-105 transition-all transform flex items-center gap-3">
               <span>✨</span> Doe 3 lesvoorstellen
             </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-2xl font-bold text-gray-700 animate-pulse">AI ontwikkelt concepten...</h3>
          </div>
        )}

        {error && <div className="text-red-600 text-center font-bold">{error}</div>}

        {proposals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {proposals.map((prop) => (
              <div key={prop.id} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Concept {prop.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 leading-tight">{prop.title}</h3>
                  <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-2">Presentistische Vraag</span>
                    <p className="text-lg text-gray-900 font-serif italic">"{prop.mainQuestion}"</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Contextualisatie</span>
                    <div className="border-l-2 border-gray-200 pl-3 text-left">{renderRationale(prop.rationale)}</div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button onClick={() => handleSelect(prop.id)} className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
                    Kies dit concept &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalsPage;

import React, { useState } from 'react';
import { useSelectionStore } from '../state/selection.store';

const ProposalsPage: React.FC = () => {
  const { sourcePool, proposals, setProposals, selectProposal } = useSelectionStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSelect = (id: number) => {
    selectProposal(id);
    alert(`Concept ${id} gekozen!`);
  };

  // Deze functie splitst de rationale regels netjes op
  const renderRationale = (text: string) => {
    if (!text) return null;
    // Splits op enters (backend stuurt \n)
    return text.split('\n').map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return null;
      
      // Probeer "Concreet (Abstract): Uitleg" te herkennen
      // Regex: Iets voor haakje, iets in haakje, dubbele punt, rest
      const match = cleanLine.match(/^(.+)\s\((.+)\):\s*(.+)/);
      
      if (match) {
        return (
          <div key={index} className="mb-3 last:mb-0">
            <div className="flex items-baseline flex-wrap gap-1">
              {/* Concreet deel (Dikgedrukt) */}
              <span className="font-bold text-gray-900 text-sm">
                {match[1]}
              </span>
              {/* Abstract deel (Grijs, kleiner) */}
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                {match[2]}
              </span>
            </div>
            {/* De uitleg */}
            <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">
              {match[3]}
            </p>
          </div>
        );
      }
      
      // Fallback als de AI het format toch net mist
      return <div key={index} className="mb-2 text-sm text-gray-700">{cleanLine}</div>;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Lesontwerp Studio</h1>
          <p className="text-lg text-gray-600">
            Input: <span className="font-bold text-blue-600">{sourcePool.length} bronnen</span>
          </p>
        </header>

        {proposals.length === 0 && !loading && (
          <div className="flex justify-center">
             <button
               onClick={handleGenerate}
               className="bg-blue-600 text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:bg-blue-700 hover:scale-105 transition-all transform flex items-center gap-3"
             >
               <span>✨</span>
               Doe 3 lesvoorstellen
             </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-2xl font-bold text-gray-700 animate-pulse">Concepten ontwikkelen...</h3>
            <p className="text-gray-500 mt-2">Zoeken naar didactische spanning.</p>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 text-red-700 p-6 rounded-xl border-l-8 border-red-500 shadow-sm mb-8">
            <p className="font-bold">Er ging iets mis:</p>
            <p>{error}</p>
            <button onClick={handleGenerate} className="mt-4 text-sm font-bold underline">Probeer opnieuw</button>
          </div>
        )}

        {proposals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {proposals.map((prop) => (
              <div key={prop.id} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Concept {prop.id}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-5 leading-tight">
                    {prop.title}
                  </h3>
                  
                  {/* GELE BLOK: DE VRAAG */}
                  <div className="mb-6 p-5 bg-amber-50 rounded-xl border border-amber-100 relative">
                    <span className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-amber-600 uppercase tracking-wider border border-amber-100 rounded shadow-sm">
                      Leerlingvraag (NU)
                    </span>
                    <p className="text-lg text-gray-900 font-medium italic leading-snug">
                      "{prop.mainQuestion}"
                    </p>
                  </div>

                  {/* WITTE BLOK: DE CONTEXT */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3 border-b border-gray-200 pb-2">
                      Historische Context (TOEN)
                    </span>
                    <div>
                      {renderRationale(prop.rationale)}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-4 px-2">
                     <span>📚 {prop.selectedSourceIds.length} bronnen</span>
                  </div>
                  <button 
                    onClick={() => handleSelect(prop.id)}
                    className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                  >
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

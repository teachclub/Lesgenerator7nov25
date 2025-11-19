import React from 'react';
import { useQueryStore } from '../../state/query.store';

interface Proposal {
  title: string;
  description: string;
}

// Zorg dat 'onGoBack' en 'onSelect' in de props zitten
interface ProposalListProps {
  onGoBack: () => void;
  onSelect: (index: number) => void;
}

export const ProposalList: React.FC<ProposalListProps> = ({ onGoBack, onSelect }) => {
  const state = useQueryStore((s: any) => s.proposalResult);
  
  const proposals: Proposal[] = state?.data?.proposals ?? [];
  const isError = !!state?.isError;

  const handleSelectProposal = (index: number) => {
    console.log(`Voorstel ${index + 1} geselecteerd.`);
    onSelect(index);
  };
  
  const handleGoBack = () => {
    onGoBack(); 
  };

  if (isError) {
    return (
      <div className="text-center p-10 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-red-700">Oeps, foutje</h2>
        <p className="text-gray-500 mb-4">Er ging iets mis bij het genereren.</p>
        <button
          onClick={handleGoBack}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
        >
          &larr; Terug naar zoeken
        </button>
      </div>
    );
  }
  
  if (!proposals || proposals.length === 0) {
     return (
      <div className="text-center p-10 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-gray-700">Geen voorstellen gevonden</h2>
        <p className="text-gray-500 mb-4">De AI kon niets bedenken.</p>
        <button
          onClick={handleGoBack}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
        >
          &larr; Terug naar zoeken
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Stap 2: Kies je Lesvoorstel</h2>
        <p className="text-lg text-gray-500">Kies één van de 3 AI-gegenereerde hoofdvragen.</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {proposals.map((proposal, index) => (
          <div 
            key={index}
            onClick={() => handleSelectProposal(index)}
            className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 hover:shadow-2xl hover:border-blue-500 transition-all cursor-pointer flex flex-col"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-2">{proposal.title}</h3>
            <p className="text-gray-600 flex-1 mb-4">{proposal.description}</p>
            <span className="text-blue-600 font-semibold mt-auto">Kies dit voorstel &rarr;</span>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-8">
        <button
          onClick={handleGoBack}
          className="text-gray-500 hover:text-gray-800 hover:underline"
        >
          &larr; Terug naar zoeken en filters
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import type { Source } from './A18.SelectionPanel'; // Hergebruik Source type
import type { AiProposal } from '../api/a19.generate'; // Import AI Proposal type

// --- Props ---
interface GenerateButtonProps {
  // We hebben de geselecteerde bronnen nodig
  sources: Source[];
  // We hebben de 3 AI-voorstellen nodig (om er 1 te kiezen)
  proposals: AiProposal[];
  // De state van het gekozen voorstel
  selectedProposalId: string | null;
  onSelectProposal: (id: string) => void;

  // De daadwerkelijke actie-knop
  onGenerate: (chosenProposal: AiProposal) => void;
  isLoading: boolean;
}

/**
 * A19: Toont de 3 AI-voorstellen en de definitieve 'Genereer Les' knop.
 * Dit is de trigger voor de 2-staps AI-flow.
 */
export function A19GenerateButton({
  sources,
  proposals,
  selectedProposalId,
  onSelectProposal,
  onGenerate,
  isLoading,
}: GenerateButtonProps) {

  // Stap 1: Toon de AI-voorstellen (gegenereerd na S1/S2)
  const renderProposals = () => {
    if (isLoading && proposals.length === 0) {
      return <div>Lesvoorstellen genereren...</div>;
    }
    if (proposals.length === 0) {
      return (
        <div className="proposals-empty">
          Klik op 'Zoek Bronnen' (S1) om hier AI-lesvoorstellen te genereren.
        </div>
      );
    }

    return (
      <fieldset className="proposals-list" disabled={isLoading}>
        <legend>Kies een lesvoorstel</legend>
        {proposals.map((prop) => (
          <div key={prop.id} className="proposal-item">
            <input
              type="radio"
              id={prop.id}
              name="proposal-selection"
              value={prop.id}
              checked={selectedProposalId === prop.id}
              onChange={() => onSelectProposal(prop.id)}
            />
            <label htmlFor={prop.id}>
              <strong>{prop.title}</strong>
              <p>Hoofdvraag: "{prop.mainQuestion}"</p>
              <p>Leerlingoordeel: "{prop.studentJudgment}"</p>
            </label>
          </div>
        ))}
      </fieldset>
    );
  };

  // Stap 2: De definitieve 'Genereer Les' knop
  const handleGenerateClick = () => {
    const chosen = proposals.find((p) => p.id === selectedProposalId);
    if (chosen) {
      onGenerate(chosen);
    }
  };

  // De knop is pas actief als bronnen EN een voorstel zijn geselecteerd
  const canGenerate = sources.length > 0 && !!selectedProposalId && !isLoading;

  return (
    <div className="generate-a19">
      <div className="step-1-proposals">
        {renderProposals()}
      </div>
      
      <div className="step-2-generate">
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={!canGenerate}
        >
          {isLoading ? 'Les genereren...' : 'Genereer Definitieve Les (S3)'}
        </button>
      </div>
    </div>
  );
}

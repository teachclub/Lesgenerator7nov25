import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProposalCard from '../components/ProposalCard'; 

const ProposalPage = () => {
  const location = useLocation();
  const navigate = useNavigate(); 
  
  const [proposals] = useState(location.state?.proposals || []); 

  // ⚠️ VERPLICHT: Zorg dat deze bronnen van de vorige pagina of state komen
  const sources = location.state?.sources || []; 

  // Functie om de les te starten
  const handleStartLesson = (proposal, index) => {
    // We hebben de conceptId niet meer nodig in de URL
    const concept = { ...proposal, id: proposal.id || `proposal-${index}` };

    // 💥 Navigeer direct naar /lesson ZONDER query parameters 💥
    navigate('/lesson', {
        state: { 
            concept: concept, 
            sources: sources 
        }
    });
  };

  if (proposals.length === 0) {
    // ... (Foutmelding blijft hetzelfde)
    return (
      <div className="proposal-container">
        <h2>Geen voorstellen gevonden.</h2>
        <p>Controleer de backend-logs of de data-fetching.</p>
      </div>
    );
  }

  return (
    <div className="proposal-grid-container">
      {proposals.map((proposal, index) => (
        <div key={proposal.id || `proposal-${index}`} className="proposal-card-wrapper">
          <ProposalCard
            proposal={proposal}
            onStartLesson={() => handleStartLesson(proposal, index)}
          />
        </div>
      ))}
    </div>
  );
};

export default ProposalPage;

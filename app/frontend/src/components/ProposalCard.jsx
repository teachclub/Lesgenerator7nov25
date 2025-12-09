import React from 'react';

const ProposalCard = ({ proposal, onStartLesson }) => {
  const hook = proposal.Hook || 'Voorstel Titel'; 
  const description = proposal.beschrijving || 'Beschrijving van de bronnen ontbreekt.';
  const sourceCount = proposal.bronnen ? `${proposal.bronnen.length} bronnen` : 'Onbekend aantal bronnen';

  return (
    <div className="proposal-card">
      <div className="proposal-header">
        <h3>{hook}</h3> 
      </div>
      
      <div className="proposal-body">
        <p className="source-summary">{description}</p>
        <p className="source-count">({sourceCount})</p>
      </div>
      
      <div className="proposal-actions">
        <button 
          className="start-lesson-button"
          onClick={onStartLesson} // Roept handleStartLesson van de parent aan
        >
          Genereer les met Lessy 2000
        </button>
      </div>
    </div>
  );
};

export default ProposalCard;

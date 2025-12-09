import React from 'react';

const BronnenKaart = ({ bron }) => {
    
  return (
    <div className={`bronnen-kaart ${bron.bronType}`}>
      
      <h4>{bron.INLEIDING_BRON1}</h4>
      
      {bron.isImage && bron.imageUrl && (
        <div className="bron-afbeelding-container">
          <img 
            src={bron.imageUrl} 
            alt={bron.INLEIDING_BRON1 || 'Historische Bron'} 
            className="bron-afbeelding"
          />
        </div>
      )}
      
      <p className="toelichting-tekst">
        **Toelichting:** {bron.TOELICHTING_BRON}
      </p>

      {!bron.isImage && bron.TEKSTBRON_OFURL && (
          <p className="bron-inhoud">
              {bron.TEKSTBRON_OFURL.substring(0, 150)}...
          </p>
      )}

      <div className="bron-meta">
          <span>Herkomst: {bron.herkomst}</span>
          <span>Type: {bron.bronType.charAt(0).toUpperCase() + bron.bronType.slice(1)}</span>
      </div>
      
    </div>
  );
};

export default BronnenKaart;

import React from 'react';

const SourceDisplay = ({ source }) => {
  // We gebruiken de 'lesson-source' klasse, getarget in Lesson.css voor de kolomdoorbraak.
  return (
    <div className="lesson-source">
      
      {/* 2. De inleiding toevoegen indien aanwezig */}
      {source.INLEIDING_BRON1 && (
        <div className="source-introduction">
          {/* We gaan ervan uit dat dit een simpele tekst is die in een paragraaf kan */}
          <p>
            **Inleiding:** {source.INLEIDING_BRON1}
          </p>
          <br/>
        </div>
      )}

      {/* De hoofdtekst van de bron */}
      <div className="source-content">
        <p>
          {source.Brontekst || "Brontekst ontbreekt in de data."}
        </p>
      </div>
    </div>
  );
};

export default SourceDisplay;

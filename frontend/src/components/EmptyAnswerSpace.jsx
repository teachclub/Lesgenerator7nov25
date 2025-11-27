import React from 'react';

// Deze component rendert een gestippeld of leeg gebied voor de leerling om in te schrijven.
// Props:
// - lines: Het aantal regels dat de ruimte moet innemen (voor de hoogte). Standaard 5.
// - width: De breedte van het gebied. Standaard 100%.
const EmptyAnswerSpace = ({ lines = 5, width = '100%' }) => {
  
  // Stijl voor het schrijfgebied
  const spaceStyle = {
    // 4. Gebruik een CSS-oplossing voor het schrijfgebied
    width: width,
    marginBottom: '1.5em', // Voldoende ruimte onder de schrijflijn
    padding: '0 0.5em',
    
    // De hoogte is gebaseerd op het aantal lijnen (ongeveer 1.5em per regel)
    minHeight: `${lines * 1.5}em`, 
    
    // Gebruik een gestippelde onderrand om een schrijflijn te simuleren
    borderBottom: '1px dashed #555', 
  };
  
  // In een kwadrant-opstelling kunt u twee van deze componenten naast elkaar plaatsen
  return (
    <div style={spaceStyle} className="empty-answer-space">
      {/* Een optionele interne div om de afmetingen te dwingen, 
          maar de minHeight op de buitenste div is meestal voldoende. */}
    </div>
  );
};

export default EmptyAnswerSpace;

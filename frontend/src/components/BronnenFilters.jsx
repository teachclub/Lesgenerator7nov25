import React from 'react';

const BronnenFilters = ({ filters, setFilters }) => {

  const handleCheckboxChange = (type) => {
    // Tekst mag niet uit
    if (type === 'tekst') return;

    setFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  return (
    <div className="filter-balk bg-gray-100 p-4 rounded mb-4">
      <div className="mb-4">
        <h3 className="font-bold">Type</h3>
        <label className="mr-4">
          <input type="checkbox" checked={filters.tekst} disabled className="mr-1" />
          Tekst (Vast)
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={filters.afbeeldingen} 
            onChange={() => handleCheckboxChange('afbeeldingen')} 
            className="mr-1"
          />
          Afbeeldingen
        </label>
      </div>

      <div>
        <h3 className="font-bold">Herkomst</h3>
        <label className="mr-4">
          <input 
            type="checkbox" 
            checked={filters.kleio} 
            onChange={() => handleCheckboxChange('kleio')} 
            className="mr-1"
          />
          KLEIO
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={filters.cito} 
            onChange={() => handleCheckboxChange('cito')} 
            className="mr-1"
          />
          CITO
        </label>
      </div>
    </div>
  );
};

export default BronnenFilters;

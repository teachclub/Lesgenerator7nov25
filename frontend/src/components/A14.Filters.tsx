import React from 'react';

interface FiltersProps {
  selectedFilters: string[];
  onFilterChange: (filterId: string, isSelected: boolean) => void;
  disabled: boolean;
}

const BESCHIKBARE_FILTERS = [
  { id: 'geen_beeldbronnen', label: 'Geen beeldbronnen' },
  { id: 'geen_tekstbronnen', label: 'Geen tekstbronnen' },
  { id: 'geen_spotprenten', label: 'Geen spotprenten' },
];

export function A14Filters({ selectedFilters, onFilterChange, disabled }: FiltersProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange(e.target.value, e.target.checked);
  };

  return (
    <fieldset className="filters-a14" disabled={disabled}>
      <legend>Filters</legend>
      {BESCHIKBARE_FILTERS.map((filter) => (
        <div key={filter.id} className="filter-item">
          <input
            type="checkbox"
            id={`filter-${filter.id}`}
            value={filter.id}
            checked={selectedFilters.includes(filter.id)}
            onChange={handleChange}
          />
          <label htmlFor={`filter-${filter.id}`}>{filter.label}</label>
        </div>
      ))}
    </fieldset>
  );
}

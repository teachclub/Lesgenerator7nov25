import React from 'react';

// --- Props ---
interface FiltersProps {
  // De component beheert zijn eigen state niet, maar krijgt deze van bovenaf.
  selectedFilters: string[]; // Bijv. ['alleen tekst']
  onFilterChange: (filterId: string, isSelected: boolean) => void;
  disabled: boolean;
}

// Definieer de beschikbare filters
const BESCHIKBARE_FILTERS = [
  { id: 'alleen_tekst', label: 'Alleen tekst' },
  { id: 'spotprent', label: 'Spotprent' },
  // Voeg hier meer filters toe indien nodig
];

/**
 * A14: Toont de 'S2' filter-checkboxes.
 */
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

import React from 'react';

// --- Props ---
interface RatioPickerProps {
  selectedRatio: number; // Waarde tussen 0.0 en 1.0 (bijv. 0.7)
  onRatioChange: (ratio: number) => void;
  selectedMax: number; // Maximaal aantal items (bijv. 20)
  onMaxChange: (max: number) => void;
  disabled: boolean;
}

// Opties voor de dropdowns
const RATIO_OPTIONS = [
  { label: '30% bronnen', value: 0.3 },
  { label: '50% bronnen', value: 0.5 },
  { label: '70% bronnen (standaard)', value: 0.7 },
  { label: '90% bronnen', value: 0.9 },
];

const MAX_OPTIONS = [
  { label: 'Max. 10 items', value: 10 },
  { label: 'Max. 20 items (standaard)', value: 20 },
  { label: 'Max. 50 items', value: 50 },
  { label: 'Max. 100 items', value: 100 },
];

/**
 * A15: Dropdowns voor ratio (verhouding) en max aantal items.
 */
export function A15RatioPicker({
  selectedRatio,
  onRatioChange,
  selectedMax,
  onMaxChange,
  disabled,
}: RatioPickerProps) {
  
  const handleRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRatioChange(Number(e.target.value));
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMaxChange(Number(e.target.value));
  };

  return (
    <fieldset className="ratio-picker-a15" disabled={disabled}>
      <legend>Verhouding en Aantal</legend>
      <div className="ratio-item">
        <label htmlFor="ratio-select">Bronverhouding:</label>
        <select
          id="ratio-select"
          value={selectedRatio}
          onChange={handleRatioChange}
        >
          {RATIO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ratio-item">
        <label htmlFor="max-select">Max. resultaten:</label>
        <select
          id="max-select"
          value={selectedMax}
          onChange={handleMaxChange}
        >
          {MAX_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

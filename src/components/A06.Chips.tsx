import React from 'react';
import type { Chip } from '../api/a12.search'; // We hergebruiken het Chip-type

// --- Props ---
interface ChipsProps {
  chips: Chip[];
  isLoading: boolean;
  onChipClick: (chip: Chip) => void;
}

/**
 * A06: Toont de AI-gegenereerde 'chips' (suggesties).
 * Dit is een 'dumb' component: het ontvangt de chips en
 * meldt terug wanneer op een chip wordt geklikt.
 */
export function A06Chips({ chips, isLoading, onChipClick }: ChipsProps) {
  if (isLoading) {
    return (
      <div className="chips-a06 loading">
        <span>AI-suggesties laden...</span>
      </div>
    );
  }

  if (chips.length === 0) {
    // Toon niets als er geen chips zijn
    return null;
  }

  return (
    <div className="chips-a06">
      <span className="chips-title">Suggesties:</span>
      <ul className="chips-list">
        {chips.map((chip, index) => (
          <li key={`${chip.label}-${index}`}>
            <button
              type="button"
              onClick={() => onChipClick(chip)}
              className={`chip-kind-${chip.kind || 'unknown'}`}
            >
              {chip.label}
              {/* Optioneel: toon 'kind' als icoon of tekst */}
              {/* <span className="chip-kind">({chip.kind})</span> */}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

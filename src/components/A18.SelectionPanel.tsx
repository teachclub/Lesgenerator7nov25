import React from 'react';

// --- Types ---
// Dit type moet overeenkomen met de bronnen die de backend stuurt
export interface Source {
  id: string;
  title: string;
  type: string;
  link: string;
  // ...andere velden zoals imageUrl
}

// Definitie voor de "selectie mode"
export type SelectionMode = 'preset' | 'custom';

// --- Props ---
interface SelectionPanelProps {
  sources: Source[];
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  onRemoveSource: (id: string) => void;
  isLoading: boolean;
}

/**
 * A18: Toont de selectie (preset of eigen keuze).
 * Beheert de modus-wissel en het verwijderen/toevoegen van bronnen.
 */
export function A18SelectionPanel({
  sources,
  mode,
  onModeChange,
  onRemoveSource,
  isLoading,
}: SelectionPanelProps) {
  
  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onModeChange(e.target.value as SelectionMode);
  };

  return (
    <div className="selection-panel-a18">
      <div className="selection-mode-toggle">
        <label>
          <input
            type="radio"
            name="selection-mode"
            value="preset"
            checked={mode === 'preset'}
            onChange={handleModeChange}
            disabled={isLoading}
          />
          Preset (S1+S2)
        </label>
        <label>
          <input
            type="radio"
            name="selection-mode"
            value="custom"
            checked={mode === 'custom'}
            onChange={handleModeChange}
            disabled={isLoading}
          />
          Eigen Keuze
        </label>
      </div>

      <div className="selection-list-container">
        {isLoading && <div className="loading-overlay">Selectie laden...</div>}
        
        {sources.length === 0 && !isLoading && (
          <div className="empty-state">
            {mode === 'preset'
              ? 'Voer S1-criteria in en klik op "Zoek Bronnen".'
              : 'Zoek bronnen om toe te voegen aan je eigen selectie.'}
          </div>
        )}

        {sources.length > 0 && (
          <ul className="selection-list">
            {sources.map((src) => (
              <li key={src.id} className="selection-item">
                <span className="item-title">{src.title}</span>
                <span className="item-type">({src.type})</span>
                {/* Toon 'verwijder' knop alleen in 'custom' modus */}
                {mode === 'custom' && (
                  <button
                    type="button"
                    onClick={() => onRemoveSource(src.id)}
                    disabled={isLoading}
                    className="remove-btn"
                  >
                    Verwijder
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {mode === 'custom' && (
        <div className="custom-actions">
          {/* TODO: Hier komt de UI voor het ZOEKEN en TOEVOEGEN van bronnen (A12) */}
          <button type="button" disabled={isLoading}>
            [Placeholder: Zoek en voeg bronnen toe]
          </button>
        </div>
      )}
    </div>
  );
}

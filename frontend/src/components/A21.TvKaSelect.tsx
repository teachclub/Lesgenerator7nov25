import React from 'react';

// --- Placeholder Data ---
// (In een echte applicatie komt dit uit een JSON-bestand of API)
const TIJDVAKKEN = [
  { id: 'tv1', naam: 'Tijdvak 1: Jagers en Boeren' },
  { id: 'tv2', naam: 'Tijdvak 2: Grieken en Romeinen' },
  { id: 'tv3', naam: 'Tijdvak 3: Monniken en Ridders' },
  // ... (voeg hier de rest toe)
];

const KENMERKENDE_ASPECTEN = {
  tv1: [
    { id: 'ka1a', naam: 'Levenswijze van jagers-verzamelaars' },
    { id: 'ka1b', naam: 'Ontstaan van landbouw' },
  ],
  tv2: [
    { id: 'ka2a', naam: 'Ontwikkeling van wetenschap en politiek in de Griekse stadstaat' },
  ],
  tv3: [
    { id: 'ka3a', naam: 'Verspreiding van het christendom' },
  ],
  // ... (vul dit aan met de echte KA-structuur)
};

// --- Props ---
interface TvKaSelectProps {
  selectedTv: string;
  onTvChange: (tvId: string) => void;
  selectedKa: string;
  onKaChange: (kaId: string) => void;
  disabled: boolean;
}

/**
 * A21: Dropdowns voor Tijdvak (TV) en Kenmerkend Aspect (KA).
 * Beheert de logica om de KA-lijst te filteren op basis van het gekozen TV.
 */
export function A21TvKaSelect({
  selectedTv,
  onTvChange,
  selectedKa,
  onKaChange,
  disabled,
}: TvKaSelectProps) {
  
  // Update de KA-lijst wanneer het Tijdvak verandert
  const handleTvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTvId = e.target.value;
    onTvChange(newTvId);
    // Reset het geselecteerde KA, omdat de lijst verandert
    onKaChange(''); 
  };

  // Haal de lijst met KA's op die bij het geselecteerde Tijdvak horen
  const beschikbareKas = KENMERKENDE_ASPECTEN[selectedTv as keyof typeof KENMERKENDE_ASPECTEN] || [];

  return (
    <div className="tv-ka-select-a21">
      <select
        value={selectedTv}
        onChange={handleTvChange}
        disabled={disabled}
        aria-label="Selecteer Tijdvak"
      >
        <option value="">-- Selecteer een Tijdvak --</option>
        {TIJDVAKKEN.map((tv) => (
          <option key={tv.id} value={tv.id}>
            {tv.naam}
          </option>
        ))}
      </select>

      <select
        value={selectedKa}
        onChange={(e) => onKaChange(e.target.value)}
        disabled={disabled || !selectedTv} // KA-select is pas actief als TV is gekozen
        aria-label="Selecteer Kenmerkend Aspect"
      >
        <option value="">-- Selecteer een Kenmerkend Aspect --</option>
        {beschikbareKas.map((ka) => (
          <option key={ka.id} value={ka.id}>
            {ka.naam}
          </option>
        ))}
      </select>
    </div>
  );
}

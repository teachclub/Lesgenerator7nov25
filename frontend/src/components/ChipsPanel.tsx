import React, { useState } from 'react';

// DIT IS DE CORRECTE IMPORT (met accolades)
// Dit repareert de "does not provide an export named 'default'" fout.
import { A06Chips } from './A06.Chips';

// We importeren ook de API-client en het Chip-type
import { fetchChips, type Chip } from '../api/a06.chips';

/**
 * Dit is een 'smart' component wrapper.
 * Het haalt chips op o.b.v. een zoekterm.
 *
 * OPMERKING: Dit component is waarschijnlijk overbodig,
 * omdat PresetZoekerPage.tsx deze logica al zelf beheert.
 *
 * We vullen dit bestand zodat de import-fout (de crash) is opgelost
 * en we de rest van de app kunnen zien.
 */
export default function ChipsPanel() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Hardgecodeerde test-aanroep
  const handleTestFetch = async () => {
    setIsLoading(true);
    const result = await fetchChips({ term: "Reformatie", context: "16e eeuw" });
    if (result.ok) {
      setChips(result.chips);
    } else {
      alert(`Fout bij ophalen chips: ${JSON.stringify(result.error)}`);
    }
    setIsLoading(false);
  };

  const handleChipClick = (chip: Chip) => {
    alert(`Chip geklikt: ${chip.label}`);
  };

  return (
    <div style={{ border: '2px dashed red', padding: '10px' }}>
      <h3>Testpaneel: ChipsPanel.tsx</h3>
      <p>Dit paneel wordt waarschijnlijk niet gebruikt (de logica zit in PresetZoekerPage.tsx), maar het lost de opstart-crash op.</p>
      <button onClick={handleTestFetch} disabled={isLoading}>
        Test AI Chips (Reformatie)
      </button>
      <A06Chips
        chips={chips}
        isLoading={isLoading}
        onChipClick={handleChipClick}
      />
    </div>
  );
}

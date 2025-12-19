// Bestand: useInputState.ts
import { useState } from 'react';

export function useInputState() {
  const [idee, setIdee] = useState('');
  const [presentisme, setPresentisme] = useState(false);
  const [taalniveau, setTaalniveau] = useState(3);
  const [nuance, setNuance] = useState(3);
  const [vraagType, setVraagType] = useState('open');
  const [tijdvakken, setTijdvakken] = useState<string[]>([]);

  return {
    idee, setIdee,
    presentisme, setPresentisme,
    taalniveau, setTaalniveau,
    nuance, setNuance,
    vraagType, setVraagType,
    tijdvakken, setTijdvakken
  };
}


import { useState, useEffect } from 'react';

/**
 * Een custom hook die een waarde "debounced".
 * Het stelt de update van een waarde uit totdat er 'delay' ms verstreken is
 * sinds de laatste keer dat de bron-waarde ('value') veranderde.
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  // State om de vertraagde waarde op te slaan
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Start een timer zodra 'value' verandert
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Belangrijk: annuleer de vorige timer als 'value' opnieuw verandert
    // (voordat de 'delay' voorbij is)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Draai alleen opnieuw als 'value' of 'delay' verandert

  return debouncedValue;
};

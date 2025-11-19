import { useState } from 'react';
import { useQueryStore } from '../state/query.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const useProposalsApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Haal de setters op uit de store
  const setProposalResult = useQueryStore((state: any) => state.setProposalResult);
  const setAppState = useQueryStore((state: any) => state.setAppState);

  const fetchProposals = async (terms: string[], mode: string, filters: any, doelgroep: string) => {
    setIsLoading(true);
    setError(null);
    setProposalResult({ isLoading: true, isError: false, data: null });
    
    // Optioneel: zet de app-status vast naar 'laden'
    // setAppState('proposals'); // Kan ook, maar we wachten liever op succes

    try {
      const response = await fetch(`${API_URL}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms,
          mode,
          filters,
          doelgroep
        }),
      });

      if (!response.ok) {
        throw new Error('Fout bij ophalen lesvoorstellen');
      }

      const data = await response.json();
      
      // Sla de data op in de store
      setProposalResult({ 
        isLoading: false, 
        isError: false, 
        data: data // Verwacht { proposals: [...], sourceData: {...} }
      });
      
      // SUCCES! Schakel de UI nu om
      setAppState('proposals');

    } catch (err: any) {
      console.error("Proposals API Error:", err);
      setError(err.message);
      setProposalResult({ isLoading: false, isError: true, data: null });
      // Blijf op 'search' pagina als het faalt
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchProposals,
    isLoading,
    error
  };
};

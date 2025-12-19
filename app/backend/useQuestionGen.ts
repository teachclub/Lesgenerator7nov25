// Bestand: app/frontend/hooks/useQuestionGen.ts

import { useState } from 'react';

export const useQuestionGen = () => {
  const [loading, setLoading] = useState(false);
  const [hoofdvraagResult, setHoofdvraagResult] = useState<{ hoofdvragen: { id: number; vraag: string }[] } | null>(null);
  const [deelvraagResult, setDeelvraagResult] = useState<{ deelvragen: { id: number; subdimensie: string; vraag: string }[] } | null>(null);

  const fetchHoofdvraag = async (idee: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/question-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, idee })
      });
      const data = await res.json();
      if (data.ok && data.result) {
        setHoofdvraagResult(data.result);
      }
    } catch (err) {
      console.error('❌ Fout bij ophalen hoofdvraag', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeelvragen = async (gekozen: { id: number; vraag: string }) => {
    try {
      setLoading(true);
      const res = await fetch('/api/question-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, hoofdvraag: gekozen })
      });
      const data = await res.json();
      if (data.ok && data.result) {
        setDeelvraagResult(data.result);
      }
    } catch (err) {
      console.error('❌ Fout bij ophalen deelvragen', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchHoofdvraag,
    fetchDeelvragen,
    hoofdvraagResult,
    deelvraagResult,
    setHoofdvraagResult,
    setDeelvraagResult
  };
};


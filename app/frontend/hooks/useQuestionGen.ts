// Bestand: app/frontend/hooks/useQuestionGen.ts
import { useState } from 'react';
import { log, error } from '../utils/log';

type Hoofdvraag = { id: number; vraag: string };
type Deelvraag = { id: number; subdimensie: string; vraag: string };

export function useQuestionGen() {
  const [hoofdvraagResult, setHoofdvraagResult] = useState<{ hoofdvragen: Hoofdvraag[] } | null>(null);
  const [deelvraagResult, setDeelvraagResult] = useState<{ deelvragen: Deelvraag[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHoofdvragen = async (idee: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/question-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, idee })
      });
      const data = await res.json();
      if (data.ok) {
        setHoofdvraagResult(data.result);
        log('🎯 Hoofdvraagresultaat', data.result);
      } else {
        error('Fout bij ophalen hoofdvragen', data);
      }
    } catch (err) {
      error('Netwerkfout bij hoofdvragen', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeelvragen = async (gekozen: Hoofdvraag) => {
    try {
      setLoading(true);
      const res = await fetch('/api/question-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, hoofdvraag: gekozen.vraag })
      });
      const data = await res.json();
      if (data.ok) {
        setDeelvraagResult(data.result);
        log('📚 Deelvraagresultaat', data.result);
      } else {
        error('Fout bij ophalen deelvragen', data);
      }
    } catch (err) {
      error('Netwerkfout bij deelvragen', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchHoofdvragen,
    fetchDeelvragen,
    hoofdvraagResult,
    deelvraagResult,
    loading,
  };
}


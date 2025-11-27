import { useMutation } from '@tanstack/react-query';
import { api } from './api.client';
import { type QueryStoreState } from '../state/query.store';

export interface Chip {
  term: string;
  kind: string;
  count: number;
  verified: boolean;
  raw?: any;
}

interface ChipsApiResponse {
  ok: boolean;
  chips: Chip[];
  tookMs?: string;
}

type ChipsApiPayload = Pick<
  QueryStoreState,
  'terms' | 'mode' | 'doelgroep' | 'filters' | 'tv' | 'ka'
>;

const fetchChips = async (payload: ChipsApiPayload): Promise<Chip[]> => {
  // We roepen de /api/chips route aan (a08.chips.cjs)
  const { data } = await api.post<ChipsApiResponse>('/api/chips', payload);
  
  // We geven alleen de array van chips terug aan de UI
  return data.chips || [];
};

export const useChipsApi = () => {
  return useMutation<Chip[], Error, ChipsApiPayload>({
    mutationKey: ['chipsApi'],
    mutationFn: fetchChips,
  });
};


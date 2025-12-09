import { useMutation } from '@tanstack/react-query';
import { api } from './api.client';
import { type Source } from '../types/Source';
import { type QueryStoreState } from '../state/query.store';

interface SearchApiResponse {
  total: number;
  sources: Source[];
}

type SearchApiPayload = Pick<
  QueryStoreState,
  'terms' | 'mode' | 'doelgroep' | 'filters'
>;

const searchApi = async (
  payload: SearchApiPayload
): Promise<SearchApiResponse> => {
  const { data } = await api.post<SearchApiResponse>('/api/search', payload);
  return data;
};

export const useSearchApi = () => {
  return useMutation<SearchApiResponse, Error, SearchApiPayload>({
    mutationKey: ['searchApi'],
    mutationFn: searchApi,
  });
};

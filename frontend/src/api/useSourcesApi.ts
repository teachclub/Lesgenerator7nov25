import { useMutation } from '@tanstack/react-query';
import { SearchApiParams, SearchHit } from './useSearchApi';
import { Proposal } from './useProposalsApi';

interface SourcesApiParams extends SearchApiParams {
  proposal: Proposal;
}

interface SourcesApiResponse {
  presetSources: SearchHit[];
  otherSources: SearchHit[];
}

export const useSourcesApi = () => {
  return useMutation<SourcesApiResponse, Error, SourcesApiParams>({
    mutationKey: ['sourcesApi'],
    mutationFn: async () => {
      console.log('useSourcesApi (dummy) aangeroepen');
      return { presetSources: [], otherSources: [] };
    },
  });
};

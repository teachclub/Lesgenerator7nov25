const API_URL = 'http://localhost:8080/api';

import type { AiProposal } from './a13.searchPreset';
import type { Source } from '../components/A30.SelectionList';

export interface SourcesInput {
  term: string;
  filters: string[];
  chosenProposal: AiProposal;
}

export interface SourcesResponse {
  ok: true;
  data: {
    presetSources: Source[];
    otherSources: Source[];
  };
}

export interface SourcesError {
  ok: false;
  error: string | object;
}

export async function fetchSourcesForProposal(
  input: SourcesInput
): Promise<SourcesResponse | SourcesError> {
  try {
    const res = await fetch(`${API_URL}/get-sources-for-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { ok: false, error: errorData.error || `HTTP error ${res.status}` };
    }

    const data = await res.json();
    
    if (data.ok) {
      return data as SourcesResponse;
    } else {
      return { ok: false, error: data.error || 'Onbekende bronfout' };
    }

  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Netwerkfout' };
  }
}

const API_URL = 'http://localhost:8080/api';

export interface AiProposal {
  id: string;
  title: string;
  mainQuestion: string;
  learningOutcome: string;
}

export interface PresetInput {
  term: string;
  filters: string[];
}

export interface ProposalsResponse {
  ok: true;
  data: {
    proposals: AiProposal[];
  };
}

export interface ProposalsError {
  ok: false;
  error: string | object;
}

export async function fetchProposalsFromSearch(
  input: PresetInput
): Promise<ProposalsResponse | ProposalsError> {
  try {
    const res = await fetch(`${API_URL}/pre-selection`, {
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
      return data as ProposalsResponse;
    } else {
      return { ok: false, error: data.error || 'Onbekende presetfout' };
    }

  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Netwerkfout' };
  }
}

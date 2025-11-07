// De URL van je lokale backend-server
const API_URL = 'http://localhost:8080/api';

// --- Gedeelde Types (gebaseerd op backend logica) ---

export interface ApiSource {
  // Dit moet overeenkomen met de data die je selectie-store beheert
  title: string;
  type: string;
  link: string;
  // ...andere velden die je evt. meestuurt
}

export interface AiProposal {
  id: string;
  title: string;
  mainQuestion: string;
  studentJudgment: string;
}

// --- Types voor STAP 1: Lesvoorstellen ---

interface GenerateProposalsInput {
  sources: ApiSource[];
}

interface ProposalsResponse {
  ok: true;
  data: {
    proposals: AiProposal[];
  };
}

interface ProposalsError {
  ok: false;
  error: string | object;
}

// --- Types voor STAP 2: Definitieve Les ---

interface GenerateLessonInput {
  chosenProposal: AiProposal;
  sources: ApiSource[];
}

interface LessonResponse {
  ok: true;
  data: {
    lessonMarkdown: string;
  };
}

interface LessonError {
  ok: false;
  error: string | object;
}

// --- API Functies ---

/**
 * STAP 1: Roept de /api/generate/proposals endpoint aan.
 */
export async function fetchProposals(
  sources: ApiSource[]
): Promise<ProposalsResponse | ProposalsError> {
  const input: GenerateProposalsInput = { sources };
  try {
    const res = await fetch(`${API_URL}/generate/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errorData = await res.json();
      return { ok: false, error: errorData.error || `HTTP error ${res.status}` };
    }
    return res.json() as Promise<ProposalsResponse>;
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Netwerkfout' };
  }
}

/**
 * STAP 2: Roept de /api/generate/lesson endpoint aan.
 */
export async function fetchLesson(
  chosenProposal: AiProposal,
  sources: ApiSource[]
): Promise<LessonResponse | LessonError> {
  const input: GenerateLessonInput = { chosenProposal, sources };
  try {
    const res = await fetch(`${API_URL}/generate/lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errorData = await res.json();
      return { ok: false, error: errorData.error || `HTTP error ${res.status}` };
    }
    return res.json() as Promise<LessonResponse>;
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Netwerkfout' };
  }
}

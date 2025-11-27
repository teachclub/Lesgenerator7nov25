import { Hit } from './search-result.interface';

// JOUW FIX (Bug 1):
export interface Filters { // Niet 'FiltersState'
  types: string[];
  providers: string[];
  periods: string[];
  noCartoons: boolean;
  tv: string[];
  ka: string[];
}

// JOUW FIX (Bug 3):
export interface QueryState {
  terms: string[]; // Matcht de ECHTE store
  mode: 'ALL' | 'ANY';
  aiBoost: boolean;
  doelgroep: string;
  filters: Filters; // Matcht de ECHTE store
  hits: Hit[];
  totalHits: number; // Matcht de ECHTE store
  loading: boolean; // Matcht de ECHTE store
  error: string | null;
  selectedHit: Hit | null;

  // Actions
  setTerms: (index: number, value: string) => void;
  setFilters: (newFilters: Partial<Filters>) => void;
  toggleArrayFilter: (key: string, value: string | number) => void;
  setSelectedHit: (hit: Hit | null) => Promise<void>;
  executeSearch: () => Promise<void>;
}

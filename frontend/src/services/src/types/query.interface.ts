import { Hit } from './search-result.interface';

export interface FiltersState {
  [key: string]: boolean;
  Cito: boolean;
  Europeana: boolean;
  Kleio: boolean;
}

export interface QueryState {
  query: string;
  filters: FiltersState;
  hits: Hit[];
  isLoading: boolean;
  error: string | null;

  selectedHit: Hit | null;
  isDetailLoading: boolean;

  setQuery: (query: string) => void;
  setFilters: (filters: FiltersState) => void;
  search: () => Promise<void>;
  setSelectedHit: (hit: Hit | null) => Promise<void>;
}

export interface Hit {
  id: string;
  provider: string;
  url: string;
  title: string;
  highlight: string | null;
  fullText?: string;
}

export interface SearchResult {
  hits: Hit[];
  total: number;
}

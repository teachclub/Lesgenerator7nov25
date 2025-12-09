export interface Hit {
  id: string;
  provider: string;
  url: string; // Of null voor Cito
  title: string;
  highlight: string | null;
  fullText?: string;
  imageUrl?: string | null;
  // DE NIEUWE VELDEN:
  tv?: string[]; // Tijdvakken
  ka?: string[]; // Kenmerkende Aspecten
}

export interface SearchResult {
  items: Hit[];
  totalHits: number;
}

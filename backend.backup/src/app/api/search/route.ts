import { NextResponse } from 'next/server';
import type { SearchQuery } from '../../../state/query.store';

// Definieer de structuur van een enkele Treffer (Hit)
export interface Hit {
  id: string;
  title: string;
  provider: string;
  thumbnail?: string;
}

// Definieer de structuur van de API-respons
interface SearchResponse {
  totalResults: number;
  items: Hit[];
}

/**
 * BACKWIJ.B03: De API route voor /api/search
 * Vangt de POST request van useSearchApi (F15) op.
 */
export async function POST(request: Request) {
  try {
    const query: SearchQuery = await request.json();

    console.log("BACKEND (B03): Ontving /api/search POST request met payload:", query);

    // --- TIJDELIJKE MOCK IMPLEMENTATIE ---
    // We roepen nog niet de echte Kleio/Europeana scrapers aan.
    // We sturen een mock-respons terug die de ontvangen query weerspiegelt.
    
    const mockHits: Hit[] = [
      {
        id: 'mock-1',
        title: `Mock resultaat voor: "${query.terms[0]?.value || 'leeg'}"`,
        provider: `Mode: ${query.mode}`,
        thumbnail: `https://placehold.co/300x200/eee/aaa?text=Niveau: ${query.niveau}`
      },
      {
        id: 'mock-2',
        title: `Mock item 2 (Doelgroep: ${query.doelgroep})`,
        provider: "MockProvider",
      },
      {
        id: 'mock-3',
        title: `Mock item 3 (Filters: ${query.filters.join(', ') || 'geen'})`,
        provider: "MockProvider",
      }
    ];

    const response: SearchResponse = {
      totalResults: mockHits.length,
      items: mockHits,
    };
    // --- EINDE MOCK IMPLEMENTATIE ---

    return NextResponse.json(response);

  } catch (err) {
    console.error("Fout in /api/search (B03):", err);
    let errorMessage = "Onbekende fout";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    return NextResponse.json(
      { error: `Fout in B03: ${errorMessage}` },
      { status: 500 }
    );
  }
}

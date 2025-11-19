import { NextResponse } from 'next/server';

interface Term {
  id: string;
  value: string;
}

interface ApiPayload {
  terms: Term[];
  mode: string;
  niveau: string;
  doelgroep: string;
  filters: string[];
}

export interface Hit {
  id: string;
  title: string;
  provider: string;
  thumbnail?: string;
}

interface SearchResponse {
  totalResults: number;
  items: Hit[];
}

export async function POST(request: Request) {
  try {
    const payload: ApiPayload = await request.json();

    console.log("BACKEND (B03 - GECORRIGEERD): Ontving /api/search POST request met:", payload);
    
    const mockHits: Hit[] = [
      {
        id: 'mock-1',
        title: `Mock resultaat voor: "${payload.terms[0]?.value || 'leeg'}"`,
        provider: `Niveau: ${payload.niveau}`,
        thumbnail: `https://placehold.co/300x200/eee/aaa?text=Filter: ${payload.filters[0]}`
      },
      {
        id: 'mock-2',
        title: `Mock item 2 (Doelgroep: ${payload.doelgroep})`,
        provider: "MockProvider",
      }
    ];

    const response: SearchResponse = {
      totalResults: mockHits.length,
      items: mockHits,
    };

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

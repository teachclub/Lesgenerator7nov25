import { NextResponse } from 'next/server';

// Definieer de structuur van de Les Details (Lesson)
// Dit moet matchen wat FRONTWIJ.F16 verwacht
export interface LessonDetails {
  id: string;
  title: string;
  provider: string;
  description: string;
  url: string;
  thumbnail?: string;
}

/**
 * BACKWIJ.B04: De API route voor /api/lesson
 * Vangt de POST request van useLessonApi (F16) op.
 */
export async function POST(request: Request) {
  try {
    const { id, provider } = await request.json();

    if (!id || !provider) {
      return NextResponse.json(
        { error: "Fout in B04: 'id' en 'provider' zijn verplicht." },
        { status: 400 }
      );
    }

    console.log("BACKEND (B04): Ontving /api/lesson POST request met:", { id, provider });

    // --- TIJDELIJKE MOCK IMPLEMENTATIE ---
    // We sturen een mock-respons terug die de ontvangen ID/provider weerspiegelt.
    
    const mockLesson: LessonDetails = {
      id: id,
      title: `Mock Les Detail voor ID: ${id}`,
      provider: provider,
      description: `Dit is een gedetailleerde mock-beschrijving voor de les van provider "${provider}". De inhoud is momenteel een placeholder.`,
      url: "https://example.com",
      thumbnail: `https://placehold.co/600x400/aaa/eee?text=Les: ${id}`
    };
    // --- EINDE MOCK IMPLEMENTATIE ---

    return NextResponse.json(mockLesson);

  } catch (err) {
    console.error("Fout in /api/lesson (B04):", err);
    let errorMessage = "Onbekende fout";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    return NextResponse.json(
      { error: `Fout in B04: ${errorMessage}` },
      { status: 500 }
    );
  }
}

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// API Base URL - voor lokaal direct naar backend
const API_BASE_URL = 'http://localhost:8081/api';

// Interfaces voor de data
interface Concept {
  id?: string;
  title: string;
  [key: string]: any;
}
interface Source {
  id?: string;
  title: string;
  content?: string;
  [key: string]: any;
}
interface LessonBundle {
  step1: any;
  step2: any;
  step3: any;
  step4: any;
}

const LessonPage: React.FC = () => {
  const location = useLocation() as any;

  // Haal de data uit de state, NIET uit de URL (geen useSearchParams)
  const concept: Concept | undefined = location.state?.concept;
  const sources: Source[] = location.state?.sources ?? [];

  const [lesson, setLesson] = useState<LessonBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard: alleen verder als we concept + bronnen hebben
    if (!concept || sources.length === 0) {
      console.error('[LESSON] concept of bronnen ontbreken in location.state', {
        hasConcept: !!concept,
        sourcesLength: sources.length,
      });
      setError(
        'Fout: concept of bronnen ontbreken. Open deze pagina via een gekozen lesvoorstel.'
      );
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[LESSON] Start genereren met concept:', concept.title || 'Onbekend');
        console.log('[LESSON] Aantal bronnen:', sources.length);

        const base = `${API_BASE_URL}/generate-lesson-v2`;

        const [step1, step2, step3, step4] = await Promise.all([
          // Stap 1
          fetch(`${base}/step1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept, sources }),
          }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Fout stap 1');
            return data;
          }),

          // Stap 2
          fetch(`${base}/step2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept }),
          }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Fout stap 2');
            return data;
          }),

          // Stap 3
          fetch(`${base}/step3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              concept,
              sources,
              quadrantContext: null,
            }),
          }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Fout stap 3');
            return data;
          }),

          // Stap 4
          fetch(`${base}/step4`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept, sources }),
          }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Fout stap 4');
            return data;
          }),
        ]);

        console.log('[LESSON] Alle stappen klaar.');
        setLesson({ step1, step2, step3, step4 });
      } catch (err: any) {
        console.error('[LESSON] Fout bij genereren:', err);
        setError(err.message || 'Er ging iets mis bij het genereren van de les. Controleer de console/backend log voor details.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [concept, sources.length]);

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (loading || !lesson) {
    return <div className="p-4">Lessy 2000 is de les aan het genereren…</div>;
  }

  return (
    <main className="p-4 space-y-6">
      <section>
        <h1 className="text-2xl font-bold mb-2">
          {lesson.step1.title || 'Gegenereerde les'}
        </h1>
        <h2 className="font-semibold mb-1">Leerdoelen</h2>
        <pre className="whitespace-pre-wrap text-sm">
          {lesson.step1.learningGoal}
        </pre>
      </section>

      <section>
        <h2 className="font-semibold mb-1">Lesfasen</h2>
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify(lesson.step2, null, 2)}
        </pre>
      </section>

      {/* Hier kun je later stap 3 en 4 mooi vormgeven */}
    </main>
  );
};

export default LessonPage;


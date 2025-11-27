import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Belangrijk: direct naar de backend, NIET via Vite-proxy
const API_BASE_URL = 'http://127.0.0.1:8081/api';

interface Concept {
  id?: string;
  title: string;
  [key: string]: any;
}

interface Source {
  id?: string;
  title: string;
  content?: string;
  fullText?: string;
  provider?: string;
  [key: string]: any;
}

interface LessonBundle {
  step1: any;
  step2: any;
  step3: any;
  step4: any;
}

// Helper om POST + logging te doen
async function safePost(path: string, body: any, label: string) {
  const url = `${API_BASE_URL}${path}`;
  console.log(`[LESSON] POST naar ${url} met body:`, body);

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await resp.text();
  console.log(`[LESSON] [${label}] raw response (status ${resp.status}):`, raw);

  if (!resp.ok) {
    // laat de tekst doorlopen zodat we de backend-fout zien
    throw new Error(`Step ${label} faalde (${resp.status}): ${raw}`);
  }

  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[LESSON] JSON parse error in ${label}:`, e);
    throw e;
  }
}

const LessonPage: React.FC = () => {
  const location = useLocation() as any;

  const concept: Concept | undefined = location.state?.concept;
  const sources: Source[] = location.state?.sources ?? [];

  const [lesson, setLesson] = useState<LessonBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!concept || sources.length === 0) {
      console.error('[LESSON] concept of bronnen ontbreken in location.state', {
        concept,
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

        console.log(
          '[LESSON] Start genereren met concept:',
          concept.title || 'Onbekend'
        );
        console.log('[LESSON] Aantal bronnen:', sources.length);

        const [step1, step2, step3, step4] = await Promise.all([
          safePost('/generate-lesson-v2/step1', { concept, sources }, 'step1'),
          safePost('/generate-lesson-v2/step2', { concept }, 'step2'),
          safePost(
            '/generate-lesson-v2/step3',
            { concept, sources, quadrantContext: null },
            'step3'
          ),
          safePost('/generate-lesson-v2/step4', { concept, sources }, 'step4'),
        ]);

        console.log('[LESSON] Alle stappen klaar.');
        setLesson({ step1, step2, step3, step4 });
      } catch (err: any) {
        console.error('[LESSON] Fout bij genereren:', err);
        setError(
          `Er ging iets mis bij het genereren van de les. Details: ${err?.message || err}`
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [concept, sources]);

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
          {lesson.step1?.docentenInstructie?.wat ||
            lesson.step1?.title ||
            'Gegenereerde les'}
        </h1>

        <h2 className="font-semibold mb-1">Docenteninstructie – WAT / HOE / WAAROM</h2>
        <pre className="whitespace-pre-wrap text-sm">
{JSON.stringify(lesson.step1?.docentenInstructie ?? {}, null, 2)}
        </pre>

        <h2 className="font-semibold mt-4 mb-1">Lesplanning (tabel)</h2>
        <pre className="whitespace-pre-wrap text-sm">
{lesson.step1?.lesPlanning?.tabelMarkdown ?? ''}
        </pre>
      </section>

      <section>
        <h2 className="font-semibold mb-1">Leerlingeninleiding & Hoofdvraag</h2>
        <pre className="whitespace-pre-wrap text-sm">
Inleiding:
{lesson.step2?.leerlingInleiding ?? ''}

Hoofdvraag:
{lesson.step2?.hoofdvraag ?? ''}
        </pre>
      </section>

      <section>
        <h2 className="font-semibold mb-1">Leerlingwerkblad – vragen & tabellen</h2>
        <pre className="whitespace-pre-wrap text-sm">
{JSON.stringify(lesson.step3 ?? {}, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="font-semibold mb-1">Antwoordmodel (docent)</h2>
        <pre className="whitespace-pre-wrap text-sm">
{JSON.stringify(lesson.step4 ?? {}, null, 2)}
        </pre>
      </section>
    </main>
  );
};

export default LessonPage;


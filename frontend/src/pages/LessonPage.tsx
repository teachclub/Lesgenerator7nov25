import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const API_BASE_URL = '/api';

interface Step1Data {
  docentenInstructie: { wat: string; hoe: string; waarom: string };
  lesPlanning: { tabelMarkdown: string };
}
interface Step2Data {
  hoofdvraag: string;
  leerlingInleiding: string;
}
interface Step3Data {
  bronVragen: Array<{
    bronNummer: number;
    observeren: string;
    interpreteren: string;
    hoofdvraagRelatie: string;
  }>;
  samenwerkingTabelLeeg: string;
  kwadrantLeeg: string;
  reflectieOpdracht: string;
}
interface Step4Data {
  samenwerkingTabelIngevuld: string;
  kwadrantIngevuld: string;
  bronAntwoorden: Array<{
    bronNummer: number;
    observerenAntwoord: string;
    interpreterenAntwoord: string;
    hoofdvraagRelatieAntwoord: string;
  }>;
}

interface LessonBundle {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
}

const LessonPage: React.FC = () => {
  const location = useLocation() as any;
  const navConcept = location.state?.concept || null;
  const navSources = location.state?.sources || [];

  const [concept, setConcept] = useState<any | null>(navConcept);
  const [sources, setSources] = useState<any[]>(navSources);
  const [lesson, setLesson] = useState<LessonBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from navigation or sessionStorage
  useEffect(() => {
    if (navConcept && navSources && navSources.length > 0) {
      setConcept(navConcept);
      setSources(navSources);
      try {
        sessionStorage.setItem('lessonConcept', JSON.stringify(navConcept));
        sessionStorage.setItem('lessonSources', JSON.stringify(navSources));
      } catch {}
      return;
    }

    try {
      const storedConcept = sessionStorage.getItem('lessonConcept');
      const storedSources = sessionStorage.getItem('lessonSources');
      if (storedConcept && storedSources) {
        setConcept(JSON.parse(storedConcept));
        setSources(JSON.parse(storedSources));
      }
    } catch {}
  }, [navConcept, navSources]);

  // Fetch the full lesson
  useEffect(() => {
    if (!concept || !sources || sources.length === 0) return;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/generate-lesson-v2/full`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept, sources })
        });

        if (!res.ok) {
          throw new Error(`Backend error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setLesson(data);
      } catch (err: any) {
        console.error('[LessonPage] full-lesson error:', err);
        setError('Fout bij full-lesson: ' + (err.message || 'Onbekende fout'));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [concept, sources]);

  if (!concept || !sources || sources.length === 0) {
    return (
      <div className="p-8 text-red-600 font-bold border border-red-200 bg-red-50 rounded mt-10 mx-auto max-w-2xl">
        Geen concept of bronnen gevonden. Ga terug naar de lesvoorstellen en kies opnieuw.
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-600 font-bold border border-red-200 bg-red-50 rounded mt-10 mx-auto max-w-2xl">
        {error}
      </div>
    );
  }

  if (loading || !lesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-600 bg-gray-50">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-6"></div>
        <p className="text-lg font-medium">
          Lessy 2000 bouwt de les met {sources.length} bronnen...
        </p>
        <p className="text-sm text-gray-400 mt-2">Een ogenblik geduld.</p>
      </div>
    );
  }

  // ---- ACTUAL RENDER BELOW ----

  return (
    <div className="max-w-6xl mx-auto p-8 font-sans text-gray-800 space-y-16 bg-white min-h-screen shadow-xl my-8 rounded-xl border border-gray-100">
      {/* Step 1 — Docentenversie */}
      <section className="bg-blue-50 p-8 rounded-xl border border-blue-200 shadow-sm print:break-after-page">
        <div className="border-b border-blue-200 pb-4 mb-6">
          <span className="text-blue-600 font-bold uppercase tracking-wider text-xs">Docentenversie</span>
          <h1 className="text-3xl font-extrabold text-blue-900 mt-1">{concept.title}</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2 border-b border-blue-100 pb-1 text-sm uppercase">Wat</h3>
            <p className="text-sm leading-relaxed">{lesson.step1.docentenInstructie?.wat}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2 border-b border-blue-100 pb-1 text-sm uppercase">Hoe</h3>
            <p className="text-sm leading-relaxed">{lesson.step1.docentenInstructie?.hoe}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2 border-b border-blue-100 pb-1 text-sm uppercase">Waarom</h3>
            <p className="text-sm leading-relaxed">{lesson.step1.docentenInstructie?.waarom}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-blue-100 overflow-x-auto">
          <h3 className="font-bold mb-3 text-blue-900">Lesplanning</h3>
          <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700 leading-relaxed">
            {lesson.step1.lesPlanning?.tabelMarkdown}
          </pre>
        </div>
      </section>

      {/* Step 2 — Werkblad */}
      <section className="print:break-after-page">
        <div className="mb-8 border-b-4 border-gray-900 pb-4">
          <span className="text-gray-500 font-bold uppercase tracking-wider text-xs">Werkblad Leerling</span>
          <h1 className="text-4xl font-extrabold text-gray-900 mt-1">Opdracht: Historisch Redeneren</h1>
        </div>

        <div className="bg-gray-100 p-8 rounded-xl mb-12 border-l-8 border-gray-800 shadow-sm">
          <h2 className="text-xl font-bold mb-3 text-gray-800 uppercase tracking-wider">Hoofdvraag</h2>
          <p className="text-2xl font-serif italic mb-6 text-gray-900">
            "{lesson.step2.hoofdvraag}"
          </p>
          <hr className="border-gray-300 mb-4" />
          <p className="text-lg leading-relaxed text-gray-700">
            {lesson.step2.leerlingInleiding}
          </p>
        </div>

        {/* Bronnenonderzoek */}
        <div className="space-y-16 mb-16">
          <div className="flex items-center gap-4 border-b-2 border-gray-200 pb-2 mb-8">
            <div className="bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-sm">A</div>
            <h2 className="text-2xl font-bold text-gray-900">Bronnenonderzoek</h2>
          </div>

          {sources.map((source: any, idx: number) => {
            const questions = lesson.step3.bronVragen?.find(q => q.bronNummer === idx + 1);

            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden break-inside-avoid">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">
                    Bron {idx + 1}: {source.title}
                  </h3>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Brontekst</h4>
                    <div className="prose text-sm text-gray-800 bg-gray-50 p-4 rounded border border-gray-200 h-full italic leading-relaxed whitespace-pre-wrap">
                      {source.fullText || source.content || 'Geen tekst beschikbaar.'}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Analyse</h4>
                    {questions ? (
                      <div className="space-y-4">
                        <div className="p-3 rounded border-l-4 border-blue-500 bg-blue-50">
                          <span className="block text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">1. Observeren</span>
                          <p className="text-sm text-gray-800">{questions.observeren}</p>
                        </div>

                        <div className="p-3 rounded border-l-4 border-purple-500 bg-purple-50">
                          <span className="block text-xs font-bold text-purple-700 mb-1 uppercase tracking-wide">2. Interpreteren</span>
                          <p className="text-sm text-gray-800">{questions.interpreteren}</p>
                        </div>

                        <div className="p-3 rounded border-l-4 border-green-500 bg-green-50">
                          <span className="block text-xs font-bold text-green-700 mb-1 uppercase tracking-wide">3. Relatie</span>
                          <p className="text-sm text-gray-800">{questions.hoofdvraagRelatie}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-400 text-sm italic">Geen vragen gegenereerd.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Samenwerkingstabel */}
        <section className="break-inside-avoid">
          <div className="flex items-center gap-4 border-b-2 border-gray-200 pb-2 mb-6">
            <div className="bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-sm">B</div>
            <h2 className="text-2xl font-bold">Verwerken: Samenwerkingstabel</h2>
          </div>
          <div className="bg-white border border-gray-300 p-4 rounded overflow-x-auto shadow-sm">
            <pre className="text-sm font-mono whitespace-pre-wrap text-gray-700">
              {lesson.step3.samenwerkingTabelLeeg}
            </pre>
          </div>
        </section>

        {/* Kwadrant */}
        <section className="break-inside-avoid">
          <div className="flex items-center gap-4 border-b-2 border-gray-200 pb-2 mb-6">
            <div className="bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-sm">C</div>
            <h2 className="text-2xl font-bold">Contextualiseren: Het Kwadrant</h2>
          </div>
          <div className="bg-white border border-gray-300 p-4 rounded overflow-x-auto shadow-sm">
            <pre className="text-sm font-mono whitespace-pre-wrap text-gray-700">
              {lesson.step3.kwadrantLeeg}
            </pre>
          </div>
        </section>

        {/* Reflectie */}
        <section className="break-inside-avoid bg-white border-2 border-gray-100 p-8 rounded-xl shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-sm">D</div>
            <h2 className="text-2xl font-bold">Reflectie</h2>
          </div>
          <div className="prose max-w-none text-gray-800">
            <pre className="font-sans whitespace-pre-wrap text-base leading-relaxed">
              {lesson.step3.reflectieOpdracht}
            </pre>
          </div>
        </section>
      </section>

      {/* Step 4 — Antwoordmodel */}
      <section className="mt-24 pt-12 border-t-8 border-green-600 bg-green-50 rounded-b-xl p-8 print:break-before-page">
        <div className="mb-8">
          <span className="text-green-700 font-bold uppercase tracking-wider text-xs">Alleen voor docent</span>
          <h1 className="text-3xl font-extrabold text-green-900 mt-1">Antwoordmodel</h1>
        </div>

        <div className="space-y-12">
          {/* Samenwerkingstabel */}
          <div>
            <h3 className="text-lg font-bold mb-3 text-green-800 uppercase tracking-wide border-b border-green-200 pb-1">
              A. Ingevulde Samenwerkingstabel
            </h3>
            <div className="bg-white p-5 rounded border border-green-200 overflow-x-auto shadow-sm">
              <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700">
                {lesson.step4.samenwerkingTabelIngevuld}
              </pre>
            </div>
          </div>

          {/* Kwadrant */}
          <div>
            <h3 className="text-lg font-bold mb-3 text-green-800 uppercase tracking-wide border-b border-green-200 pb-1">
              B. Ingevuld Kwadrant
            </h3>
            <div className="bg-white p-5 rounded border border-green-200 overflow-x-auto shadow-sm">
              <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700">
                {lesson.step4.kwadrantIngevuld}
              </pre>
            </div>
          </div>

          {/* Bronantwoorden */}
          <div>
            <h3 className="text-lg font-bold mb-3 text-green-800 uppercase tracking-wide border-b border-green-200 pb-1">
              C. Richtantwoorden per bron
            </h3>
            {lesson.step4.bronAntwoorden ? (
              <div className="grid md:grid-cols-2 gap-4">
                {lesson.step4.bronAntwoorden.map((a, i) => (
                  <div key={i} className="bg-white p-4 rounded border border-green-200 text-sm shadow-sm">
                    <div className="flex justify-between mb-2">
                      <strong className="text-green-700 font-bold">Bron {a.bronNummer}</strong>
                    </div>

                    <div className="space-y-2">
                      <p>
                        <span className="font-semibold text-gray-500 text-xs uppercase">Observeren:</span><br />
                        {a.observerenAntwoord}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-500 text-xs uppercase">Interpreteren:</span><br />
                        {a.interpreterenAntwoord}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-500 text-xs uppercase">Relatie:</span><br />
                        {a.hoofdvraagRelatieAntwoord}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-gray-500">
                Geen specifieke bronantwoorden beschikbaar.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LessonPage;


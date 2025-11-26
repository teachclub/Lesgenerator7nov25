import React, { useEffect, useState } from 'react';
import { useLessonStoreV2 } from '../state/lesson-v2.store';
import { useSelectionStore } from '../state/selection.store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LessonPage = () => {
  const { lessonPlan, setLessonPlan } = useLessonStoreV2();
  const { sources } = useSelectionStore();
  const [generationStep, setGenerationStep] = useState<number>(0);
  const [error, setError] = useState('');

  useEffect(() => {
     const state = window.history.state?.usr;
     if (state && state.concept && !lessonPlan) {
         startGeneration(state.concept, state.sources);
     }
  }, []);

  const startGeneration = async (concept: any, usedSources: any[]) => {
      setGenerationStep(1);
      try {
          const res1 = await fetch('http://localhost:8081/api/generate-lesson-v2/step1', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ concept, sources: usedSources }) });
          const part1 = await res1.json();
          
          setGenerationStep(2);
          const res2 = await fetch('http://localhost:8081/api/generate-lesson-v2/step2', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ concept }) });
          const part2 = await res2.json();

          setGenerationStep(3);
          const res3 = await fetch('http://localhost:8081/api/generate-lesson-v2/step3', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ concept, sources: usedSources, quadrantContext: part1.teacherGuide.sourceQuadrant }) });
          const part3 = await res3.json();

          setGenerationStep(4);
          const res4 = await fetch('http://localhost:8081/api/generate-lesson-v2/step4', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ concept, sources: usedSources }) });
          const part4 = await res4.json();

          setLessonPlan({ ...part1, phases: part2.phases, teacherGuide: { ...part1.teacherGuide, reflectionAnswers: part4.reflection?.answers, filledTables: part4.filledTables }, studentWorksheet: { ...part3.studentWorksheet, sourceAnalyses: part4.sourceAnalyses, reflectionQuestions: part4.reflection?.questions } });
          setGenerationStep(0);
      } catch (e: any) { setError(e.message); setGenerationStep(0); }
  };

  if (generationStep > 0) return <div className="min-h-screen flex items-center justify-center flex-col bg-gray-50"><div className="text-4xl mb-4">🏗️</div><div className="text-xl font-bold">Les wordt gebouwd... Stap {generationStep}/4</div></div>;
  if (!lessonPlan) return <div className="p-10 text-center">Geen lesplan.</div>;

  const { phases, teacherGuide: guide, studentWorksheet: sheet } = lessonPlan;
  const displaySources = sources.slice(0, 6);
  const MarkdownComponents = { table: ({node, ...props}:any) => <table className="cito-table w-full text-sm" {...props} />, th: ({node, ...props}:any) => <th className="border border-black bg-gray-100 p-2 text-left font-bold" {...props} />, td: ({node, ...props}:any) => <td className="border border-black p-2 align-top" {...props} /> };

  return (
    <div className="min-h-screen bg-white pb-20 print:p-0 font-sans text-sm text-gray-900">
      <div className="no-print bg-gray-800 text-white p-4 sticky top-0 z-50 flex justify-between shadow-md">
        <h1 className="font-bold">Lesgenerator V2</h1>
        <button onClick={() => window.print()} className="bg-white text-black px-4 py-1 font-bold rounded">🖨️ PDF</button>
      </div>

      <div className="max-w-[297mm] mx-auto p-8 bg-white print:max-w-none print:p-0">

        {/* 1. DOCENTENINSTRUCTIE */}
        <section className="mb-8 page-break-after">
          <div className="border-b-4 border-black mb-4 pb-2 flex justify-between"><h1 className="text-3xl font-bold uppercase">Docenteninstructie</h1><span className="italic text-lg">{lessonPlan.title}</span></div>
          <div className="grid grid-cols-2 gap-6 mb-6">
             <div className="border-2 border-black p-3 bg-gray-50"><h3 className="font-bold border-b-2 border-black mb-2">Leerdoelen</h3><div className="prose prose-sm"><ReactMarkdown>{lessonPlan.learningGoal || ''}</ReactMarkdown></div></div>
             <div className="border-2 border-black p-3 bg-gray-50"><h3 className="font-bold border-b-2 border-black mb-2">Didactiek</h3><p className="italic text-xs">{guide?.grabBagRationale}</p></div>
          </div>
          <table className="cito-table w-full text-xs mb-6"><thead><tr><th>Fase</th><th>Docent</th><th>Leerling</th><th>Tijd</th></tr></thead><tbody>{phases?.map((p:any, i:number)=>(<tr key={i}><td className="font-bold">{p.phaseName}</td><td>{p.teacherRole}</td><td>{p.studentRole}</td><td>{p.time}</td></tr>))}</tbody></table>
        </section>

        <div className="page-break-before"></div>

        {/* 2. BRONNENBLAD */}
        <section className="mb-8 page-break-after">
           <div className="border-b-4 border-black mb-6"><h1 className="text-3xl font-bold uppercase">Bronnenblad</h1></div>
           <div className="columns-2 gap-8">
             {displaySources.map((s, i) => (
               <div key={s.id} className="avoid-break mb-6 border-2 border-black p-3 bg-white">
                  <div className="font-bold bg-black text-white px-2 inline-block mb-2">Bron {i+1}</div>
                  {s.imageUrl && <img src={`http://localhost:8081/api/image-proxy?url=${encodeURIComponent(s.imageUrl)}`} className="mb-2 max-h-48 w-full object-contain border border-gray-300"/>}
                  <div className="text-xs font-serif text-justify"><ReactMarkdown>{s.content || "Geen tekst."}</ReactMarkdown></div>
               </div>
             ))}
           </div>
        </section>

        <div className="page-break-before"></div>

        {/* 3. LEERLINGENWERKBLAD */}
        <section className="mb-8 page-break-after">
           <div className="border-b-4 border-black mb-6 pb-2 flex justify-between items-end"><h1 className="text-3xl font-bold uppercase">Leerlingenwerkblad</h1><div className="border-2 border-black p-2 w-48">Naam:</div></div>
           <div className="bg-gray-100 p-4 border-l-8 border-black mb-6 font-medium">{sheet?.assignmentDescription}</div>

           {/* A. BRONVRAGEN (EERST!) */}
           {sheet?.sourceAnalyses?.map((sa:any, i:number) => (
             <div key={i} className="mb-6 avoid-break">
               <div className="bg-black text-white px-3 py-1 font-bold inline-block mb-1 text-sm">Vragen bij Bron {i+1}</div>
               <div className="border-2 border-black p-3">
                 {sa.questions?.map((q:string, j:number) => (<div key={j} className="mb-4 last:mb-0"><p className="font-bold text-xs mb-4">{j+1}. {q}</p><div className="border-b border-gray-300 h-6"></div></div>))}
               </div>
             </div>
           ))}

           <div className="page-break-before"></div>

           {/* B. GRABBELTON & TABEL (DAN!) */}
           <h3 className="font-bold text-lg mb-2 mt-4">Opdracht: De Puzzel</h3>
           <p className="italic mb-4 text-sm">{sheet?.grabBagInstruction || "Gebruik onderstaande termen om de tabel in te vullen."}</p>
           
           <div className="grid grid-cols-4 gap-2 mb-8">
              {sheet?.grabBag?.map((bag:any, i:number) => (
                  <div key={i} className="border-2 border-black p-2 text-xs">
                      <strong className="block border-b border-black mb-1 bg-black text-white px-1">{bag.label}</strong>
                      {bag.items?.join(', ')}
                  </div>
              ))}
           </div>
           <div className="mb-8 avoid-break"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{sheet?.emptyTables?.collaboration || ''}</ReactMarkdown></div>
           
           {/* C. KWADRANT (LAATST!) */}
           <div className="page-break-before"></div>
           <h3 className="font-bold text-lg mb-2">Opdracht: Het Kwadrant</h3>
           <p className="italic mb-4 text-sm">{sheet?.quadrantInstruction || "Plaats de bronnummers in het juiste vak."}</p>
           <div className="mb-8 avoid-break"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{sheet?.emptyTables?.quadrant || ''}</ReactMarkdown></div>

           {/* REFLECTIE */}
           <div className="border-2 border-black p-4 bg-gray-50 mt-8"><h3 className="font-bold uppercase mb-2">Reflectie</h3>{sheet?.reflectionQuestions?.map((q:string, i:number)=>(<div key={i} className="mb-4"><p className="font-bold text-sm mb-2">{q}</p><div className="border-b border-gray-400 h-6 border-dashed"></div></div>))}</div>
        </section>

        <div className="page-break-before"></div>

        {/* 4. ANTWOORDMODEL */}
        <section>
          <div className="border-b-4 border-black mb-6 pb-2"><h1 className="text-3xl font-bold uppercase text-red-700">Antwoordmodel</h1><p className="text-sm text-gray-500">Alleen voor de docent</p></div>
          {guide?.filledTables && (
              <div className="mb-8"><h3 className="font-bold text-red-700 mb-2">Ingevulde Tabellen</h3>
              <div className="text-red-900"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{guide.filledTables.collaboration || ''}</ReactMarkdown></div>
              <div className="mt-4 text-red-900"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{guide.filledTables.quadrant || ''}</ReactMarkdown></div>
              </div>
          )}
          {sheet?.sourceAnalyses?.map((sa:any, i:number) => (
             <div key={i} className="mb-4 avoid-break bg-red-50 p-3 border border-red-200"><div className="font-bold text-red-800 mb-2 text-sm">Bron {i+1}</div>{sa.answers?.map((ans:string, j:number) => (<div key={j} className="mb-2 text-xs"><span className="font-bold text-black">{sa.questions[j]}</span><br/><span className="italic text-red-700">Antwoord: {ans}</span></div>))}</div>
           ))}
        </section>

      </div>
    </div>
  );
};

export default LessonPage;

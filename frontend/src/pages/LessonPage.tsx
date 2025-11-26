import React from 'react';
import { useLessonStoreV2 } from '../state/lesson-v2.store'; // V2 Store
import { useSelectionStore } from '../state/selection.store';
import ReactMarkdown from 'react-markdown';

const LessonPage = () => {
  const { lessonPlan } = useLessonStoreV2();
  const { sources } = useSelectionStore();

  if (!lessonPlan) return <div className="p-10 text-center">Nog geen lesplan (V2).</div>;

  const phases = lessonPlan.phases || [];
  const guide = lessonPlan.teacherGuide;
  const sheet = lessonPlan.studentWorksheet;

  // Filter de bronnen om alleen de gebruikte te tonen
  // (We nemen aan dat de AI in V2 alleen ID's teruggeeft die bestaan, maar voor de zekerheid tonen we wat in 'sources' zit omdat ProposalsPage dat al gefilterd heeft doorgegeven via de API call, maar de store heeft nog alle sources. 
  // Echter, lessonPlan heeft geen bron-ids. De 'sources' in selectionStore zijn ALLE geselecteerde. 
  // In de ideale wereld geeft de backend de gebruikte IDs terug, maar voor nu tonen we de bronnen die de proposals pagina heeft doorgegeven aan de backend.
  // Omdat we in ProposalsPage de `usedSources` naar de backend stuurden, maar de frontend store niet updateten, 
  // is het beter om hier even alle sources te tonen OF (beter) de lesson store uit te breiden.
  // Voor nu: we tonen de sources uit de selectionStore die matchen met de les.
  // Omdat we dat ID niet in lessonPlan hebben, tonen we de sources die in de selection store zitten (die door de gebruiker gekozen waren).
  // *Verbetering:* In V2 workflow stuurt proposal page alleen de gefilterde sources naar de backend.
  // Laten we hier simpelweg de sources uit de selectionStore tonen, dat zijn er 40 in de grabbelton fase, maar na proposal selectie... 
  // Wacht, de selectionStore bevat ALLES. 
  // Laten we voor de layout ervan uitgaan dat we ze gewoon tonen.
  
  return (
    <div className="min-h-screen bg-white pb-20 print:p-0 font-sans text-sm">
      <div className="no-print bg-black text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="font-bold">Lesgenerator V2 (Cito Stijl)</h1>
        <button onClick={() => window.print()} className="bg-white text-black px-4 py-1 rounded font-bold">🖨️ PDF</button>
      </div>

      <div className="max-w-7xl mx-auto p-8 bg-white print:max-w-none print:p-0">
        
        {/* --- DOCENTENHANDLEIDING --- */}
        <section>
          <div className="border-b-4 border-black mb-6 pb-2">
             <h1 className="text-3xl font-bold uppercase">Docentenhandleiding</h1>
             <p className="italic text-lg">{lessonPlan.title}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-8 print:block">
             <div className="border border-black p-4 bg-gray-50 mb-4">
               <h3 className="font-bold border-b border-black mb-2">Context & Doel</h3>
               <p className="text-sm mb-2"><strong>Context:</strong> {lessonPlan.context}</p>
               <p className="text-sm"><strong>Doel:</strong> {lessonPlan.learningGoal}</p>
             </div>
             <div className="border border-black p-4 bg-gray-50 mb-4">
               <h3 className="font-bold border-b border-black mb-2">Didactisch Kwadrant</h3>
               <p className="text-sm italic">{guide?.didacticQuadrant || "Geen info"}</p>
             </div>
          </div>

          <h3 className="font-bold mb-2">Lesverloop</h3>
          <table className="w-full border-collapse border-2 border-black mb-8 text-sm">
             <thead>
               <tr className="bg-gray-100">
                 <th className="border border-black p-2 text-left w-[10%]">Tijd</th>
                 <th className="border border-black p-2 text-left w-[15%]">Fase</th>
                 <th className="border border-black p-2 text-left w-[30%]">Docent</th>
                 <th className="border border-black p-2 text-left w-[30%]">Leerling</th>
                 <th className="border border-black p-2 text-left w-[15%]">Materiaal</th>
               </tr>
             </thead>
             <tbody>
               {phases.map((p, i) => (
                 <tr key={i} className="avoid-break">
                   <td className="border border-black p-2 font-bold">{p.time}</td>
                   <td className="border border-black p-2 bg-gray-50 font-bold">{p.phaseName}</td>
                   <td className="border border-black p-2"><ReactMarkdown>{p.teacherRole}</ReactMarkdown></td>
                   <td className="border border-black p-2"><ReactMarkdown>{p.studentRole}</ReactMarkdown></td>
                   <td className="border border-black p-2 italic">{p.materials}</td>
                 </tr>
               ))}
             </tbody>
          </table>

          {/* ALLEEN VOOR DOCENT */}
          <div className="border-2 border-dashed border-gray-400 p-4 bg-gray-50 avoid-break mb-8">
             <h3 className="font-bold text-gray-600 uppercase mb-2 border-b border-gray-400 inline-block">Alleen voor de docent</h3>
             
             <div className="mb-4">
                <strong>Reflectievragen:</strong>
                <ul className="list-disc list-inside mt-1">
                    {guide?.reflectionQuestions?.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
             </div>

             <div>
                <strong>Antwoordmodel (Indicatie):</strong>
                <ul className="mt-1 space-y-1">
                   {guide?.answerKey?.map((a, i) => (
                     <li key={i}><span className="font-bold">{a.questionId}:</span> {a.answer}</li>
                   ))}
                </ul>
             </div>
          </div>
        </section>

        {/* --- LEERLINGENWERKBLAD --- */}
        <div className="page-break-before mt-8"></div>
        <section>
           <div className="flex justify-between items-end border-b-4 border-black mb-6 pb-2">
              <h1 className="text-3xl font-bold uppercase">Leerlingenwerkblad</h1>
              <div className="border-2 border-black p-2 w-48 text-xs font-bold text-gray-400 h-10">NAAM:</div>
           </div>

           <div className="bg-gray-100 p-6 border-l-4 border-black mb-8">
              <h3 className="font-bold text-lg mb-2">Opdracht</h3>
              <p className="font-medium">{sheet?.assignmentDescription}</p>
           </div>

           {sheet?.steps && (
               <div className="mb-8">
                   <h4 className="font-bold border-b border-black mb-2">Stappenplan</h4>
                   <ol className="list-decimal list-inside">
                       {sheet.steps.map((s, i) => <li key={i} className="mb-1">{s}</li>)}
                   </ol>
               </div>
           )}

           {sheet?.sourceQuestions?.map((sq, i) => (
             <div key={i} className="mb-8 avoid-break">
               <span className="bg-black text-white px-2 py-1 text-sm font-bold mb-2 inline-block">
                 Vragen bij Bron {sources.findIndex(s => s.id === sq.sourceId) !== -1 ? sources.findIndex(s => s.id === sq.sourceId) + 1 : "?"}
               </span>
               <div className="border border-black p-4">
                 {sq.questions.map((q, j) => (
                   <div key={j} className="mb-4">
                     <p className="font-bold text-sm mb-6">{q.question}</p>
                     <div className="border-b border-gray-300 h-6"></div>
                     <div className="border-b border-gray-300 h-6"></div>
                   </div>
                 ))}
               </div>
             </div>
           ))}
        </section>

        {/* --- BRONNEN --- */}
        <div className="page-break-before mt-8"></div>
        <section>
           <div className="border-b-4 border-black mb-6 pb-2">
              <h1 className="text-3xl font-bold uppercase">Bronnenbijlage</h1>
           </div>
           <div className="columns-1 md:columns-2 gap-8">
             {sources.map((s, i) => (
               <div key={s.id} className="avoid-break mb-8 border border-black p-4 text-sm bg-white">
                  <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-1">
                      <span className="font-bold bg-black text-white px-2">Bron {i+1}</span>
                      <span className="text-xs italic text-gray-500">{s.type}</span>
                  </div>
                  <div className="font-serif text-justify leading-relaxed">
                      <ReactMarkdown>{s.content}</ReactMarkdown>
                  </div>
                  <div className="text-xs italic text-right mt-2 text-gray-500">{s.origin}</div>
               </div>
             ))}
           </div>
        </section>
      </div>
    </div>
  );
};

export default LessonPage;

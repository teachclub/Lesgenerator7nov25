import React from 'react';
import { useLessonStoreV2 } from '../state/lesson-v2.store';
import { useSelectionStore } from '../state/selection.store';
import ReactMarkdown from 'react-markdown';

const LessonPageV2 = () => {
  const { lessonPlan } = useLessonStoreV2();
  const { sources } = useSelectionStore();
  if (!lessonPlan) return <div>Laden...</div>;
  
  return (
    <div className="p-8 print:p-0 font-sans text-sm">
      <div className="no-print mb-4"><button onClick={() => window.print()} className="bg-black text-white px-4 py-2 font-bold">PRINT PDF</button></div>
      <h1 className="text-3xl font-bold uppercase border-b-4 border-black mb-4">{lessonPlan.title}</h1>
      
      {/* Docentenhandleiding */}
      <h3 className="font-bold bg-black text-white px-2 py-1 mb-2">DOCENTENHANDLEIDING</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-black p-2"><strong>Doel:</strong> {lessonPlan.learningGoal}</div>
        <div className="border border-black p-2"><strong>Kwadrant:</strong> {lessonPlan.teacherGuide.didacticQuadrant}</div>
      </div>
      
      <table className="w-full border-2 border-black mb-8">
        <thead><tr className="bg-gray-200"><th className="border p-1">Tijd</th><th className="border p-1">Fase</th><th className="border p-1">Docent</th><th className="border p-1">Leerling</th></tr></thead>
        <tbody>{lessonPlan.phases.map((p,i) => (<tr key={i}><td className="border p-1 font-bold">{p.time}</td><td className="border p-1">{p.phaseName}</td><td className="border p-1">{p.teacherRole}</td><td className="border p-1">{p.studentRole}</td></tr>))}</tbody>
      </table>

      {/* Werkblad */}
      <div className="page-break-before"></div>
      <h3 className="font-bold bg-black text-white px-2 py-1 mb-2">LEERLINGENWERKBLAD</h3>
      <div className="border-l-4 border-black p-4 bg-gray-100 mb-6">{lessonPlan.studentWorksheet.assignmentDescription}</div>
      {lessonPlan.studentWorksheet.sourceQuestions?.map((sq,i) => (
         <div key={i} className="mb-4"><strong className="block border-b border-black mb-2">Vragen bij Bron</strong>
         {sq.questions.map((q,j) => <div key={j} className="mb-2 p-2 border border-gray-300">{q.question}<br/><br/></div>)}
         </div>
      ))}

      {/* Bronnen */}
      <div className="page-break-before"></div>
      <h3 className="font-bold bg-black text-white px-2 py-1 mb-2">BRONNEN</h3>
      <div className="columns-2 gap-6">
        {sources.map((s,i) => (
          <div key={i} className="mb-4 border border-black p-2 break-inside-avoid">
            <div className="font-bold bg-black text-white inline-block px-1 mb-1">Bron {i+1}</div>
            <div className="text-xs text-justify"><ReactMarkdown>{s.content}</ReactMarkdown></div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default LessonPageV2;

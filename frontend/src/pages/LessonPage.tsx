import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Source } from '../state/selection.store';

const LessonPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // Haal de data op die we vanuit ProposalsPage hebben meegestuurd
  const { lessonPlan, images } = location.state || { lessonPlan: '', images: [] };

  // Helper voor proxy images
  const getProxiedImageUrl = (source: Source) => {
    if (!source.imageUrl) return undefined;
    if (source.provider === 'Kleio' || source.imageUrl.includes('vgnkleio.nl')) {
        return `http://localhost:8081/api/image-proxy?url=${encodeURIComponent(source.imageUrl)}`;
    }
    return source.imageUrl;
  };

  // Functie om de les als PDF op te slaan / te printen
  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
        const originalContents = document.body.innerHTML;
        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); 
    }
  };

  if (!lessonPlan) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl text-red-500 font-bold">Geen lesdata gevonden.</h2>
            <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 underline">Terug naar begin</button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header met actieknoppen */}
        <div className="flex justify-between items-center mb-8 no-print">
          <button 
            onClick={() => navigate('/proposals')} 
            className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 bg-white rounded shadow-sm border"
          >
            &larr; Terug naar concepten
          </button>
          
          <div className="flex gap-4">
             <button 
                onClick={() => navigate('/')}
                className="px-4 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded"
             >
                Nieuwe zoekopdracht
             </button>
             <button 
                onClick={handlePrint}
                className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700 font-bold flex items-center gap-2"
             >
                <span>🖨️</span> Print / PDF
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" ref={printRef}>
            
            {/* LINKER KOLOM: HET LESPLAN */}
            <div className="lg:col-span-2 bg-white p-10 rounded-xl shadow-sm border border-gray-200">
                <div className="prose prose-indigo max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:text-indigo-900 prose-h2:mt-8 prose-p:text-gray-700">
                    <div className="whitespace-pre-wrap leading-relaxed font-serif text-lg">
                        {lessonPlan}
                    </div>
                </div>
            </div>

            {/* RECHTER KOLOM: DE VISUELE MATERIALEN */}
            <div className="space-y-6">
                <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold text-lg mb-2">Benodigde Materialen</h3>
                    <p className="opacity-80 text-sm">Deze bronnen heb je geselecteerd voor deze les.</p>
                </div>

                {images && images.map((source: Source, idx: number) => {
                    const imgUrl = getProxiedImageUrl(source);
                    return (
                        <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 break-inside-avoid">
                            {imgUrl && (
                                <img 
                                    src={imgUrl} 
                                    alt={source.title} 
                                    className="w-full h-48 object-cover rounded-lg mb-4 bg-gray-100"
                                    referrerPolicy="no-referrer"
                                />
                            )}
                            <h4 className="font-bold text-gray-900 text-sm mb-1">{source.title}</h4>
                            <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">{source.type}</span>
                            {source.description && (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-3">{source.description}</p>
                            )}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs font-bold hover:underline">
                                    Bekijk originele bron &rarr;
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </div>
    </div>
  );
};

export default LessonPage;

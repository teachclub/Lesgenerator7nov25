import React, { useEffect, useState } from 'react';
import { useSelectionStore } from '../state/selection.store';
import { useNavigate } from 'react-router-dom';

const LessonPage: React.FC = () => {
  const { activeProposalId, proposals, sourcePool, generatedLesson, setGeneratedLesson } = useSelectionStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const proposal = proposals.find(p => p.id === activeProposalId);

  // Genereer functie
  const generateLesson = async () => {
    if (!proposal) return;
    setLoading(true);
    setError(null);
    
    try {
        const response = await fetch('http://localhost:8080/api/generate-lesson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proposal, sources: sourcePool }),
        });
        
        if (!response.ok) throw new Error(await response.text() || 'Server error');
        
        const data = await response.json();
        setGeneratedLesson(data.markdown);

    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  // Auto-start
  useEffect(() => {
    if (proposal && !generatedLesson && !loading) {
        generateLesson();
    }
  }, [proposal]);

  // Slimme download (met afbeeldingen)
  const handleDownload = () => {
    if (!generatedLesson) return;

    let htmlContent = generatedLesson.replace(
        /!\[(.*?)\]\((.*?)\)/g, 
        (match, alt, url) => `<div class="image-container"><img src="${url}" alt="${alt}" loading="lazy" /></div>`
    );
    htmlContent = htmlContent.replace(/\n/g, '<br>');

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <title>Lesplan: ${proposal?.title}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1, h2, h3 { color: #2c3e50; margin-top: 1.5em; border-bottom: 1px solid #eee; }
          img { max-width: 100%; max-height: 14cm; object-fit: contain; display: block; margin: 20px auto; }
          blockquote { border-left: 4px solid #3498db; margin: 0; padding: 10px; background: #f9f9f9; }
        </style>
      </head>
      <body>${htmlContent}</body>
      </html>
    `;

    const element = document.createElement("a");
    const file = new Blob([fullHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `Lesplan - ${proposal?.title || 'Concept'}.html`;
    document.body.appendChild(element);
    element.click();
  };

  if (!proposal) {
      return (
        <div className="p-20 text-center">
            <p className="text-gray-400 mb-4">Geen concept gevonden. Ga terug naar de studio.</p>
            <button onClick={() => navigate('/proposals')} className="text-blue-600 underline">Terug</button>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-white p-8 max-w-5xl mx-auto font-sans text-gray-800">
      
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Fase 2: Lesontwikkeling</h1>
            <p className="text-gray-500 mt-1">Concept: <span className="font-bold">{proposal.title}</span></p>
        </div>
        
        <div className="flex gap-4">
            {!loading && !generatedLesson && (
                <button onClick={generateLesson} className="bg-green-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-green-700">🚀 Start Generatie</button>
            )}
            {generatedLesson && (
                <button onClick={handleDownload} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                    ⬇️ Download Les (.html)
                </button>
            )}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32">
            <div className="w-20 h-20 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-700 animate-pulse">AI schrijft de les...</h2>
            <p className="text-gray-500 mt-2">Geduld, dit is vakwerk.</p>
        </div>
      )}

      {error && (
          <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
              <p className="text-red-600 font-bold mb-4">{error}</p>
              <button onClick={generateLesson} className="underline text-red-800">Probeer opnieuw</button>
          </div>
      )}

      {/* DE VEILIGE WEERGAVE (Geen crash, gewoon tekst) */}
      {generatedLesson && !loading && (
        <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-8 rounded-xl border border-gray-200 shadow-inner text-gray-800 leading-relaxed">
                {generatedLesson}
            </div>
        </div>
      )}
    </div>
  );
};

export default LessonPage;

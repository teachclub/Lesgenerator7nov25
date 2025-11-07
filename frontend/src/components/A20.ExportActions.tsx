import React from 'react';

// --- Props ---
interface ExportActionsProps {
  // De gegenereerde les (als Markdown-string)
  lessonMarkdown: string;
  // Een vlag om te weten of de knoppen getoond moeten worden
  isReady: boolean;
  disabled: boolean;
}

/**
 * A20: Toont de actieknoppen (Export/Kopieer/JSON)
 * voor het verwerken van het eindresultaat.
 */
export function A20ExportActions({
  lessonMarkdown,
  isReady,
  disabled,
}: ExportActionsProps) {
  
  // Als de les nog niet klaar is, toon niets
  if (!isReady) {
    return null;
  }

  // --- Actie Handlers ---

  const handleCopyToClipboard = () => {
    if (!navigator.clipboard) {
      alert('Kopiëren naar klembord wordt niet ondersteund door uw browser.');
      return;
    }
    navigator.clipboard.writeText(lessonMarkdown).then(
      () => {
        alert('Les gekopieerd naar klembord!');
      },
      (err) => {
        alert('Kopiëren mislukt.');
        console.error('Kopieerfout:', err);
      }
    );
  };

  const handleDownloadAsMarkdown = () => {
    const blob = new Blob([lessonMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lesplan.md'; // De bestandsnaam
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-actions-a20">
      <h3>Exporteer</h3>
      <div className="button-group">
        <button
          type="button"
          onClick={handleCopyToClipboard}
          disabled={disabled}
        >
          Kopieer naar Klembord
        </button>
        
        <button
          type="button"
          onClick={handleDownloadAsMarkdown}
          disabled={disabled}
        >
          Download als .md
        </button>
        
        {/* TODO: Implementeer 'Download als JSON' indien nodig */}
        <button
          type="button"
          disabled={true} // Nog niet geïmplementeerd
        >
          Download als JSON
        </button>
      </div>
    </div>
  );
}

import React from "react";
import { Hit } from "../../../state/query.store";

// De props zijn nu anders: het kan een 'hit' (bron) OF een 'lesson' (voorstel) zijn
interface LessonDetailProps {
  hit?: Hit; // Als we een bron bekijken
  lesson?: {
    // Als we een lesvoorstel bekijken (van gisteren)
    id: string;
    title: string;
    description: string;
    provider: string;
  };
  isLoading?: boolean;
  isError?: boolean;
}

// Aparte renderer voor Cito-bronnen (netjes opgemaakt)
const CitoViewer: React.FC<{ hit: Hit }> = ({ hit }) => {
  const isImageUrl = hit.url && (hit.url.includes('.jpg') || hit.url.includes('.png') || hit.url.includes('googleusercontent'));

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">{hit.title} (Cito)</h1>

      {isImageUrl ? (
        <img 
          src={hit.url} 
          alt={hit.title} 
          className="max-w-full rounded border" 
        />
      ) : (
        <p className="text-base text-gray-700 italic border-l-4 border-gray-300 pl-4">
          {hit.description}
        </p>
      )}

      {hit.toelichting && (
        <div className="pt-2">
          <h3 className="text-sm font-semibold">Toelichting</h3>
          <p className="text-base text-gray-600 mt-1">
            {hit.toelichting}
          </p>
        </div>
      )}
    </div>
  );
};

// De 'viewer' voor externe links
const IFrameViewer: React.FC<{ hit: Hit }> = ({ hit }) => {
  let url = "#";
  if (hit.provider === "Kleio" && hit.url) {
    url = hit.url;
  }
  if (hit.provider === "Europeana") {
    const cleanId = hit.id.replace("/item/", "");
    url = `https://www.europeana.eu/item/${cleanId}`;
  }

  return (
    <iframe 
      src={url} 
      title={hit.title} 
      className="w-full h-full border-0"
    />
  );
};

export const LessonDetail: React.FC<LessonDetailProps> = ({
  hit,
  lesson,
  isLoading,
  isError,
}) => {
  if (isLoading) {
    return <div className="p-4 text-gray-500">Laden...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-500">Fout bij laden van de bron.</div>;
  }

  // 1. Als een 'hit' (bron) is geselecteerd:
  if (hit) {
    if (hit.provider === 'Cito') {
      return <CitoViewer hit={hit} />;
    }
    if (hit.provider === 'Europeana' || hit.provider === 'Kleio') {
      return <IFrameViewer hit={hit} />;
    }
  }

  // 2. Als een 'lesson' (voorstel) is geselecteerd:
  if (lesson) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">{lesson.title}</h1>
        <p className="text-base mt-4 whitespace-pre-wrap">
          {lesson.description}
        </p>
      </div>
    );
  }

  // 3. Fallback (als Kolom 3 leeg is)
  return <div className="p-4 text-gray-500">Selecteer een bron of genereer voorstellen.</div>;
};

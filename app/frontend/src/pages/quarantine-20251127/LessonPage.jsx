import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SourceDisplay from '../components/SourceDisplay';

// Aanname: uw backend draait op poort 8081
const API_BASE_URL = '/api';
 
const LessonPage = () => {
  const [searchParams] = useSearchParams();
  const conceptId = searchParams.get('conceptId'); // Haalt de ID uit de URL
  
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!conceptId) {
      setError("Fout: Geen concept ID gevonden in de URL.");
      setLoading(false);
      return;
    }

    const fetchLesson = async () => {
      try {
        setLoading(true);
        // Roep de API aan met de concept ID om de les te genereren
        const response = await fetch(`${API_BASE_URL}/generate-lesson/${conceptId}`);
        
        if (!response.ok) {
          throw new Error(`Fout bij het ophalen van lesdata: ${response.statusText}`);
        }
        
        const data = await response.json();
        setLesson(data);
      } catch (err) {
        console.error("Fout bij het laden van de les:", err);
        setError(err.message || "Er is een onbekende fout opgetreden.");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [conceptId]);

  if (loading) {
    return <div className="lesson-loading">De les wordt geladen...</div>;
  }

  if (error) {
    return <div className="lesson-error">Fout: {error}</div>;
  }
  
  // Controleer of de les en de bronnen bestaan
  const lessonSources = lesson?.sources || []; 
  const lessonTitle = lesson?.title || "Les Titel (Geen Titel van API)";
  
  return (
    <div className="lesson-container">
      <h1>{lessonTitle}</h1>
      <hr/>

      <div className="lesson-sources-list">
        {lessonSources.length > 0 ? (
          // De bronnen worden gerenderd met de component die we eerder hebben gebruikt
          lessonSources.map((source, index) => (
            <SourceDisplay 
              key={source.id || `source-${index}`} 
              source={source} 
            />
          ))
        ) : (
          <div>Geen bronnen gevonden voor deze les.</div>
        )}
      </div>
    </div>
  );
};

export default LessonPage;

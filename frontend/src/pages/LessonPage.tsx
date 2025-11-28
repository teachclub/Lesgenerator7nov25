import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { LessonPrintLayout } from "../components/lesson/LessonPrintLayout";

interface Concept {
  id?: string;
  titel: string;
  tijdvakLabel?: string;
  kaLabel?: string;
  [key: string]: any;
}

interface Source {
  id?: string;
  titel?: string;
  type?: string;
  url?: string;
  provider?: string;
  omschrijving?: string;
  [key: string]: any;
}

interface DocentenInstructie {
  wat?: string;
  hoe?: string;
  waarom?: string;
}

interface Deelvraag {
  tekst?: string;
  dimensie?: string;
  [key: string]: any;
}

interface LessonData {
  concept: Concept;
  sources: Source[];
  docentenInstructie?: DocentenInstructie;
  leerlingenOpdracht?: string;
  hoofdvraag?: string;
  deelvragen?: (string | Deelvraag)[];
  bronnenSelectie?: any[];
  quadrantContext?: {
    titel?: string;
    horizontaleAs?: { links?: string; rechts?: string };
    verticaleAs?: { boven?: string; onder?: string };
    kwadranten?: { naam?: string; uitleg?: string; voorbeeld?: string }[];
  };
  bronAntwoorden?: {
    bronNummer: number;
    observerenAntwoord: string;
    interpreterenAntwoord: string;
    hoofdvraagRelatieAntwoord: string;
    stereotyperingAnalyseAntwoord?: string;
  }[];
  samenwerkingTabelIngevuld?: string;
  kwadrantIngevuld?: string;
  reflectieAntwoorden?: string[];
  validation?: { status?: string; message?: string };
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://127.0.0.1:8081";

async function safePost(path: string, body: any, stepLabel: string) {
  const url = `${API_BASE}${path}`;
  console.log(
    "[LESSON] POST naar",
    url,
    "met body:",
    body
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[LESSON] [${stepLabel}] raw response (status ${res.status}):`,
      text
    );
    throw new Error(
      `Step ${stepLabel} faalde (${res.status}): ${text}`
    );
  }

  const json = await res.json();
  return json;
}

export const LessonPage: React.FC = () => {
  const location = useLocation();
  const state = (location.state || {}) as {
    concept?: Concept;
    sources?: Source[];
  };

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const concept = state.concept;
  const sources = state.sources || [];

  async function run(selectedConcept: Concept, selectedSources: Source[]) {
    try {
      setError(null);
      setIsLoading(true);
      setLesson(null);

      console.log(
        "[LESSON] Start genereren met concept:",
        selectedConcept.titel
      );
      console.log("[LESSON] Aantal bronnen:", selectedSources.length);

      const bodyStep1 = { concept: selectedConcept, sources: selectedSources };
      const bodyStep2 = { concept: selectedConcept };
      const bodyStep3 = {
        concept: selectedConcept,
        sources: selectedSources,
        quadrantContext: null,
      };
      const bodyStep4 = { concept: selectedConcept, sources: selectedSources };

      const [step1, step2, step3, step4] = await Promise.all([
        safePost("/api/generate-lesson-v2/step1", bodyStep1, "step1"),
        safePost("/api/generate-lesson-v2/step2", bodyStep2, "step2"),
        safePost("/api/generate-lesson-v2/step3", bodyStep3, "step3"),
        safePost("/api/generate-lesson-v2/step4", bodyStep4, "step4"),
      ]);

      const combinedLesson: LessonData = {
        concept: selectedConcept,
        sources: selectedSources,
        docentenInstructie: step1.docentenInstructie,
        leerlingenOpdracht: step1.leerlingenOpdracht,
        hoofdvraag: step1.hoofdvraag ?? step2.hoofdvraag,
        deelvragen: step2.deelvragen ?? step1.deelvragen,
        bronnenSelectie: step1.bronnenSelectie,
        quadrantContext: step3.quadrantContext,
        bronAntwoorden: step4.bronAntwoorden,
        samenwerkingTabelIngevuld: step4.samenwerkingTabelIngevuld,
        kwadrantIngevuld: step4.kwadrantIngevuld,
        reflectieAntwoorden: step4.reflectieAntwoorden,
        validation: step4.validation,
      };

      console.log("[LESSON] Samengestelde les:", combinedLesson);
      setLesson(combinedLesson);
    } catch (err: any) {
      console.error("[LESSON] Fout bij genereren:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (concept && sources.length > 0) {
      run(concept, sources);
    } else {
      console.warn(
        "[LESSON] Geen concept/sources in location.state; kan geen les genereren."
      );
    }
  }, [concept, sources.length]);

  return (
    <div style={{ padding: "16px" }}>
      <h2>Lesgenerator – Les</h2>

      {!concept && (
        <p>
          Geen concept gevonden. Ga terug naar de voorstellen en kies een les.
        </p>
      )}

      {concept && (
        <p>
          <strong>Gekozen concept:</strong> {concept.titel}
        </p>
      )}

      {isLoading && <p>Les wordt gegenereerd...</p>}

      {error && (
        <p style={{ color: "red", whiteSpace: "pre-wrap" }}>{error}</p>
      )}

      {lesson && (
        <LessonPrintLayout lesson={lesson} />
      )}
    </div>
  );
};

export default LessonPage;


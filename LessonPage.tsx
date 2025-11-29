import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Source = {
  id: string;
  number: number; // vaste index 1,2,3...
  title: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  // eventueel andere velden, maar die storen niet
};

type BronAntwoord = {
  bronNummer: number;
  observerenAntwoord?: string;
  interpreterenAntwoord?: string;
  hoofdvraagRelatieAntwoord?: string;
  stereotyperingAnalyseAntwoord?: string;
};

type Lesson = {
  concept: any;
  sources: Source[];
  docentenInstructie?: {
    wat?: string;
    hoe?: string;
    waarom?: string;
  };
  lesPlanningTabel?: string;
  leerlingInleiding?: string;
  leerlingenOpdracht?: string;
  hoofdvraag?: string;
  deelvragen?: any[];
  bronAntwoorden?: BronAntwoord[];
  samenwerkingTabelIngevuld?: string;
  kwadrantIngevuld?: string;
  reflectieAntwoorden?: string[];
};

type LocationState = {
  concept?: any;
  sources?: Source[];
};

const getApiBase = () => {
  // Zelfde logica als elders in je frontend
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return envBase || "http://127.0.0.1:8081";
};

async function safePost(step: string, path: string, body: any) {
  const base = getApiBase();
  const url = `${base}${path}`;
  console.log("[LESSON] POST naar", url, "met body:", body);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(
      `[LESSON] [${step}] raw response (status ${resp.status}):`,
      text
    );
    throw new Error(`Step ${step} faalde (${resp.status}): ${text}`);
  }

  const json = await resp.json();
  return json;
}

function getSourceByNumber(sources: Source[], bronNummer: number): Source | undefined {
  return sources.find((s) => s.number === bronNummer);
}

const LessonPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location as { state: LocationState };
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Voorkomt dubbele run() in React StrictMode
  const hasRunRef = useRef(false);

  useEffect(() => {
    const concept = state?.concept;
    const sources = state?.sources;

    if (!concept || !sources || sources.length === 0) {
      setError(
        "Er is geen lesconcept of geen bronnen meegegeven. Ga terug en kies eerst een lesvoorstel."
      );
      return;
    }

    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          "[LESSON] Start genereren met concept:",
          concept?.title || concept?.hook || concept?.hoofdvraag || "(naamloos)"
        );
        console.log("[LESSON] Aantal bronnen:", sources.length);

        // Let op: we gaan uit van de huidige backend:
        //  /api/generate-lesson-v2/step1..4
        // Als de backend iets andere keys teruggeeft, tonen we gewoon wat er is.

        const [step1, step2, step3, step4] = await Promise.all([
          safePost("step1", "/api/generate-lesson-v2/step1", {
            concept,
            sources,
          }),
          safePost("step2", "/api/generate-lesson-v2/step2", {
            concept,
          }),
          safePost("step3", "/api/generate-lesson-v2/step3", {
            concept,
            sources,
            quadrantContext: null,
          }),
          safePost("step4", "/api/generate-lesson-v2/step4", {
            concept,
            sources,
          }),
        ]);

        const samengesteldeLes: Lesson = {
          concept,
          // Belangrijk: originele bronnen (incl. imageUrl/thumbnailUrl) bewaren
          sources,
          // Probeer velden uit verschillende stappen op te pakken.
          docentenInstructie:
            step1?.docentenInstructie || step1?.docentInstructie || undefined,
          lesPlanningTabel:
            step1?.lesPlanning?.tabelMarkdown ||
            step1?.lesPlanning ||
            undefined,
          leerlingInleiding:
            step2?.leerlingInleiding ||
            step2?.inleiding ||
            concept?.intro ||
            undefined,
          leerlingenOpdracht:
            step1?.leerlingenOpdracht ||
            step3?.reflectieOpdracht ||
            undefined,
          hoofdvraag:
            step2?.hoofdvraag ||
            step1?.hoofdvraag ||
            concept?.hook ||
            concept?.hoofdvraag ||
            undefined,
          deelvragen: step2?.deelvragen || step1?.deelvragen || [],
          bronAntwoorden: step4?.bronAntwoorden || [],
          samenwerkingTabelIngevuld:
            step4?.samenwerkingTabelIngevuld || step3?.samenwerkingTabelLeeg,
          kwadrantIngevuld:
            step4?.kwadrantIngevuld || step3?.kwadrantLeeg || undefined,
          reflectieAntwoorden: step4?.reflectieAntwoorden || [],
        };

        console.log("[LESSON] Samengestelde les:", samengesteldeLes);
        setLesson(samengesteldeLes);
      } catch (e: any) {
        console.error("[LESSON] Fout bij genereren:", e);
        setError(e.message || "Onbekende fout bij het genereren van de les.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [state, navigate]);

  if (error) {
    return (
      <div className="lesson-page p-4">
        <h1>Er ging iets mis bij het genereren van de les</h1>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>← Terug naar lesvoorstellen</button>
      </div>
    );
  }

  if (loading || !lesson) {
    return (
      <div className="lesson-page p-4">
        <h1>Lessy 2000 is aan het puzzelen…</h1>
        <p>De les wordt opgebouwd op basis van je bronnen en concept.</p>
      </div>
    );
  }

  const {
    concept,
    sources,
    docentenInstructie,
    lesPlanningTabel,
    leerlingInleiding,
    leerlingenOpdracht,
    hoofdvraag,
    deelvragen,
    bronAntwoorden,
    samenwerkingTabelIngevuld,
    kwadrantIngevuld,
    reflectieAntwoorden,
  } = lesson;

  return (
    <div className="lesson-page" style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      {/* Bovenkop / meta-informatie */}
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>
          {concept?.title || hoofdvraag || "Gegenereerde les"}
        </h1>
        {concept?.tijdvak && (
          <p style={{ margin: 0 }}>
            <strong>Tijdvak:</strong> {concept.tijdvak}
          </p>
        )}
        {concept?.kaLabel && (
          <p style={{ margin: 0 }}>
            <strong>Kenmerkend aspect:</strong> {concept.kaLabel}
          </p>
        )}
      </header>

      {/* DOCENTENVERSIE */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Docenteninstructie</h2>
        <p>
          <strong>Wat:</strong> {docentenInstructie?.wat || "Nog geen duidelijke WAT-omschrijving ontvangen van de AI."}
        </p>
        <p>
          <strong>Hoe:</strong> {docentenInstructie?.hoe || "Nog geen duidelijke HOE-omschrijving ontvangen van de AI."}
        </p>
        <p>
          <strong>Waarom:</strong>{" "}
          {docentenInstructie?.waarom ||
            "Nog geen duidelijke WAAROM-omschrijving ontvangen van de AI."}
        </p>

        {lesPlanningTabel && (
          <>
            <h3>Lesplanning (tabel)</h3>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "0.75rem" }}>
              {lesPlanningTabel}
            </pre>
          </>
        )}
      </section>

      {/* LEERLINGENVERSIE */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Leerlingenblad</h2>

        {leerlingInleiding && (
          <>
            <h3>Inleiding</h3>
            <p>{leerlingInleiding}</p>
          </>
        )}

        {hoofdvraag && (
          <>
            <h3>Hoofdvraag</h3>
            <p>
              <strong>{hoofdvraag}</strong>
            </p>
          </>
        )}

        {deelvragen && deelvragen.length > 0 && (
          <>
            <h3>Deelvragen</h3>
            <ol>
              {deelvragen.map((dq: any, i: number) => (
                <li key={i}>
                  {typeof dq === "string" ? dq : dq.tekst || JSON.stringify(dq)}
                  {dq?.dimensie ? ` (${dq.dimensie})` : ""}
                </li>
              ))}
            </ol>
          </>
        )}

        {leerlingenOpdracht && (
          <>
            <h3>Opdracht</h3>
            <p>{leerlingenOpdracht}</p>
          </>
        )}
      </section>

      {/* BRONNEN + ANTWOORDMODEL PER BRON (RE-HYDRATIE MET AFBEELDINGEN) */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Bronnen en richtantwoorden</h2>

        {bronAntwoorden && bronAntwoorden.length > 0 ? (
          bronAntwoorden.map((ba, idx) => {
            const src = getSourceByNumber(sources, ba.bronNummer);
            if (!src) return null;

            const imgSrc = src.thumbnailUrl || src.imageUrl;

            return (
              <article
                key={`${ba.bronNummer}-${idx}`}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <header style={{ marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0 }}>
                    Bron {ba.bronNummer}: {src.title}
                  </h3>
                </header>

                {imgSrc && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <img
                      src={imgSrc}
                      alt={src.title}
                      style={{ maxWidth: "100%", borderRadius: 4 }}
                    />
                  </div>
                )}

                {src.description && (
                  <p style={{ fontStyle: "italic" }}>{src.description}</p>
                )}

                <div>
                  {ba.observerenAntwoord && (
                    <>
                      <h4>Observeren</h4>
                      <p>{ba.observerenAntwoord}</p>
                    </>
                  )}
                  {ba.interpreterenAntwoord && (
                    <>
                      <h4>Interpreteren</h4>
                      <p>{ba.interpreterenAntwoord}</p>
                    </>
                  )}
                  {ba.hoofdvraagRelatieAntwoord && (
                    <>
                      <h4>Relatie met de hoofdvraag</h4>
                      <p>{ba.hoofdvraagRelatieAntwoord}</p>
                    </>
                  )}
                  {ba.stereotyperingAnalyseAntwoord && (
                    <>
                      <h4>Stereotypering / bril van nu</h4>
                      <p>{ba.stereotyperingAnalyseAntwoord}</p>
                    </>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <p>Er zijn nog geen uitgewerkte bronantwoorden beschikbaar.</p>
        )}
      </section>

      {/* TABELLEN: SAMENWERKING + KWADRANT (VOOR NU ALS MARKDOWN-BLOK) */}
      <section style={{ marginBottom: "2rem" }}>
        {samenwerkingTabelIngevuld && (
          <>
            <h2>Samenwerkingstabel (antwoordmodel)</h2>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "0.75rem" }}>
              {samenwerkingTabelIngevuld}
            </pre>
          </>
        )}

        {kwadrantIngevuld && (
          <>
            <h2>Kwadrant (antwoordmodel)</h2>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "0.75rem" }}>
              {kwadrantIngevuld}
            </pre>
          </>
        )}
      </section>

      {/* REFLECTIE-ANTWOORDEN */}
      <section style={{ marginBottom: "2rem" }}>
        {reflectieAntwoorden && reflectieAntwoorden.length > 0 && (
          <>
            <h2>Voorbeeld reflectie-antwoorden</h2>
            <ul>
              {reflectieAntwoorden.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <footer style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#666" }}>
        <button onClick={() => navigate(-1)}>← Terug naar lesvoorstellen</button>
      </footer>
    </div>
  );
};

export default LessonPage;


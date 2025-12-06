import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LessonConcept = {
  id?: string;
  title?: string;
  hook?: string;
  contextLabel?: string;
  hoofdvraag?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
  targetAudience?: string;
  masterSignature?: string;
};

type Source = {
  id: string | number;
  provider?: string;
  type?: string;
  title?: string;
  description?: string;
  fullText?: string;
  url?: string | null;
  imageUrl?: string | null;
  isStarred?: boolean;
  score?: number;
};

type Step1Response = {
  step: number;
  data: any;
};

type Step2Response = {
  step: number;
  data: Step2Data;
  usedSourceIds?: (string | number)[];
  error?: string;
};

type BronVraagItem = {
  bronId: string;
  vragen: string[];
};

type Invultabel = {
  kolommen: string[];
  rijen: {
    label: string;
    uitleg: string;
    deelvraagIndex?: number;
  }[];
};

type Reflectie = {
  vragen: {
    vraag: string;
    aandachtspuntVoorDocent?: string;
  }[];
};

type Step2Data = {
  hoofdvraag?: string;
  inleiding?: string;
  bronvragen?: BronVraagItem[];
  invultabel?: Invultabel;
  reflectie?: Reflectie;
};

type LocationState = {
  concept?: LessonConcept;
  sources?: Source[];
};

const LessonPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as LocationState;
  const concept = state.concept || {};
  const allSources: Source[] = state.sources || [];

  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  const [loadingStep1, setLoadingStep1] = useState(false);
  const [errorStep1, setErrorStep1] = useState<string | null>(null);
  const [step1Data, setStep1Data] = useState<any | null>(null);

  const [loadingStep2, setLoadingStep2] = useState(false);
  const [errorStep2, setErrorStep2] = useState<string | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [usedSourceIds, setUsedSourceIds] = useState<(string | number)[]>([]);

  // Bronnen die in leerlingmateriaal gebruikt worden (of fallback = alles)
  const visibleSources = useMemo(() => {
    if (usedSourceIds && usedSourceIds.length > 0) {
      const setIds = new Set(usedSourceIds.map((id) => String(id)));
      return allSources.filter((s) => setIds.has(String(s.id)));
    }
    return allSources;
  }, [allSources, usedSourceIds]);

  // Helper om bij bronId weer de bron + titel te vinden
  const findSourceById = (bronId: string) =>
    visibleSources.find((s) => String(s.id) === String(bronId));

  // Als je zonder concept op deze pagina komt: terug naar proposals
  useEffect(() => {
    if (!concept || !concept.id) {
      // Geen concept → terug
      // (Voorkomt een lege pagina als iemand rechtstreeks navigeert)
      // Kleine timeout zodat React-router geen warning geeft
      setTimeout(() => navigate("/proposals"), 0);
    }
  }, [concept, navigate]);

  // Step 1 ophalen
  useEffect(() => {
    if (!concept || !concept.id) return;

    let cancelled = false;
    const run = async () => {
      setLoadingStep1(true);
      setErrorStep1(null);
      try {
        const resp = await fetch("/api/generate-lesson-v2/step1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept,
            sources: allSources,
          }),
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const json: Step1Response = await resp.json();
        if (!cancelled) {
          setStep1Data(json.data || json);
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorStep1(err?.message || "Onbekende fout bij step 1");
        }
      } finally {
        if (!cancelled) setLoadingStep1(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [concept, allSources]);

  // Step 2 ophalen
  useEffect(() => {
    if (!concept || !concept.id) return;

    let cancelled = false;
    const run = async () => {
      setLoadingStep2(true);
      setErrorStep2(null);
      try {
        const resp = await fetch("/api/generate-lesson-v2/step2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept,
            sources: allSources,
          }),
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const json: Step2Response = await resp.json();
        if (!cancelled) {
          setStep2Data(json.data || (json as any));
          if (Array.isArray(json.usedSourceIds)) {
            setUsedSourceIds(json.usedSourceIds);
          }
          if (json.error) {
            setErrorStep2(json.error);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorStep2(err?.message || "Onbekende fout bij step 2");
        }
      } finally {
        if (!cancelled) setLoadingStep2(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [concept, allSources]);

  const goBack = () => {
    navigate(-1);
  };

  const renderDocentStep = () => {
    if (loadingStep1) {
      return <p>Lesvoorbereiding (docent) wordt gegenereerd…</p>;
    }
    if (errorStep1) {
      return <p style={{ color: "red" }}>Fout bij step 1: {errorStep1}</p>;
    }
    if (!step1Data) {
      return <p>Nog geen docenteninstructie ontvangen.</p>;
    }

    const d = step1Data.docent || step1Data;

    const wat = d.wat || "";
    const hoe = d.hoe || "";
    const waarom = d.waarom || "";
    const deelvragen: any[] = d.deelvragen || [];
    const lesplanning: any[] = d.lesplanning || [];

    return (
      <div className="lesson-step lesson-step-docent" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <section>
          <h2>Wat gaan we doen?</h2>
          <p>{wat}</p>
        </section>
        <section>
          <h2>Hoe werkt de les?</h2>
          <p>{hoe}</p>
        </section>
        <section>
          <h2>Waarom deze les (historisch redeneren)?</h2>
          <p>{waarom}</p>
        </section>

        {deelvragen.length > 0 && (
          <section>
            <h2>Deelvragen & dimensies</h2>
            <ul>
              {deelvragen.map((dv, idx) => (
                <li key={idx}>
                  <strong>Deelvraag {idx + 1}:</strong> {dv.vraag}
                  {dv.dimensie && (
                    <>
                      {" "}
                      <em>({dv.dimensie}{dv.subdimensie ? ` – ${dv.subdimensie}` : ""})</em>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {lesplanning.length > 0 && (
          <section>
            <h2>Lesplanning</h2>
            <ul>
              {lesplanning.map((fase: any, idx: number) => (
                <li key={idx}>
                  <strong>{fase.fase || `Fase ${idx + 1}`} – {fase.tijd || ""}</strong>
                  <div>{fase.activiteit}</div>
                  {fase.product && (
                    <div>
                      <em>Product:</em> {fase.product}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  };

  const renderLeerlingStep = () => {
    if (loadingStep2) {
      return <p>Leerlingmateriaal wordt gegenereerd…</p>;
    }
    if (errorStep2) {
      return <p style={{ color: "red" }}>Fout bij step 2: {errorStep2}</p>;
    }
    if (!step2Data) {
      return <p>Nog geen leerlingmateriaal ontvangen.</p>;
    }

    const hv = step2Data.hoofdvraag || concept.hoofdvraag || "";
    const inleiding = step2Data.inleiding || "";
    const bronvragen = step2Data.bronvragen || [];
    const invultabel = step2Data.invultabel;
    const reflectie = step2Data.reflectie;

    return (
      <div className="lesson-step lesson-step-leerling" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section>
          <h2>Hoofdvraag voor leerlingen</h2>
          <p>{hv}</p>
        </section>

        {inleiding && (
          <section>
            <h2>Inleiding (context van toen)</h2>
            <p>{inleiding}</p>
          </section>
        )}

        {bronvragen.length > 0 && (
          <section>
            <h2>Bronvragen</h2>
            {bronvragen.map((bq, idx) => {
              const src = findSourceById(bq.bronId);
              return (
                <div key={idx} style={{ marginBottom: "1rem" }}>
                  <h3>
                    Bron {idx + 1}
                    {src && src.title ? ` – ${src.title}` : ""}
                  </h3>
                  <ol>
                    {(bq.vragen || []).map((vraag, i) => (
                      <li key={i}>{vraag}</li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>
        )}

        {invultabel && (
          <section>
            <h2>Invultabel – samenhang tussen bronnen en hoofdvraag</h2>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      textAlign: "left",
                      padding: "0.25rem 0.5rem",
                    }}
                  >
                    Groep
                  </th>
                  {invultabel.kolommen.map((col, idx) => (
                    <th
                      key={idx}
                      style={{
                        borderBottom: "1px solid #ccc",
                        textAlign: "left",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invultabel.rijen.map((rij, idx) => (
                  <tr key={idx}>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.25rem 0.5rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rij.label}
                    </td>
                    <td
                      colSpan={invultabel.kolommen.length}
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      {rij.uitleg}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {reflectie && reflectie.vragen && reflectie.vragen.length > 0 && (
          <section>
            <h2>Reflectievragen</h2>
            <ol>
              {reflectie.vragen.map((rv, idx) => (
                <li key={idx} style={{ marginBottom: "0.5rem" }}>
                  <div>{rv.vraag}</div>
                  {rv.aandachtspuntVoorDocent && (
                    <div style={{ fontSize: "0.85rem", color: "#555" }}>
                      <em>Tip voor docent: {rv.aandachtspuntVoorDocent}</em>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    );
  };

  const sourceBadge = (s: Source) => {
    const provider = (s.provider || "").toLowerCase();
    const type = (s.type || "").toUpperCase();
    const isText =
      type === "TEXT" ||
      type === "TXT" ||
      (!s.imageUrl && !type);

    return (
      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
        <span style={{ padding: "0.1rem 0.4rem", borderRadius: "999px", border: "1px solid #ddd" }}>
          {provider === "cito" ? "Cito" : provider === "kleio" ? "Kleio" : s.provider || "Bron"}
        </span>
        <span style={{ padding: "0.1rem 0.4rem", borderRadius: "999px", border: "1px solid #ddd" }}>
          {isText ? "TEXT" : "IMAGE"}
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <button
        onClick={goBack}
        style={{
          alignSelf: "flex-start",
          padding: "0.4rem 0.8rem",
          borderRadius: "999px",
          border: "1px solid #ddd",
          background: "#f5f5f5",
          cursor: "pointer",
        }}
      >
        ← Terug naar lesvoorstellen
      </button>

      <header style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ fontSize: "0.85rem", color: "#555" }}>
          {concept.tvLabel && (
            <>
              <strong>{concept.tvLabel}</strong>
              {concept.kaLabel ? " · " : ""}
            </>
          )}
          {concept.kaLabel && <span>{concept.kaLabel}</span>}
        </div>
        <h1 style={{ margin: 0 }}>{concept.title || "Lesconcept"}</h1>
        {concept.hook && <p style={{ fontStyle: "italic", marginTop: "0.25rem" }}>{concept.hook}</p>}
        {concept.hoofdvraag && (
          <p style={{ marginTop: "0.5rem" }}>
            <strong>Hoofdvraag (concept):</strong> {concept.hoofdvraag}
          </p>
        )}
      </header>

      {/* Tabs voor docent / leerling */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          borderBottom: "1px solid #ddd",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          onClick={() => setActiveStep(1)}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: "999px",
            border: activeStep === 1 ? "1px solid #000" : "1px solid #ccc",
            background: activeStep === 1 ? "#000" : "#f5f5f5",
            color: activeStep === 1 ? "#fff" : "#000",
            cursor: "pointer",
          }}
        >
          Step 1 – Docentversie
        </button>
        <button
          onClick={() => setActiveStep(2)}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: "999px",
            border: activeStep === 2 ? "1px solid #000" : "1px solid #ccc",
            background: activeStep === 2 ? "#000" : "#f5f5f5",
            color: activeStep === 2 ? "#fff" : "#000",
            cursor: "pointer",
          }}
        >
          Step 2 – Leerlingmateriaal
        </button>
      </div>

      {/* Layout: links inhoud, rechts bronnen */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.5fr) minmax(0, 1.5fr)",
          gap: "1.5rem",
          alignItems: "flex-start",
        }}
      >
        <main>
          {activeStep === 1 ? renderDocentStep() : renderLeerlingStep()}
        </main>

        <aside
          style={{
            borderLeft: "1px solid #eee",
            paddingLeft: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Bronnen in deze les</h2>
          <p style={{ fontSize: "0.85rem", color: "#555" }}>
            Richting Gemini: <strong>{visibleSources.length}</strong> bronnen
            {allSources.length > visibleSources.length && (
              <> (van de {allSources.length} gevonden)</>
            )}
          </p>

          {visibleSources.length === 0 && <p>Geen bronnen beschikbaar.</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {visibleSources.map((s) => {
              const isText =
                (s.type || "").toUpperCase() === "TEXT" ||
                (s.type || "").toUpperCase() === "TXT" ||
                (!s.imageUrl && !(s.type || "").toUpperCase());
              return (
                <div
                  key={s.id}
                  style={{
                    borderRadius: "0.75rem",
                    border: "1px solid #eee",
                    padding: "0.6rem 0.7rem",
                    background: "#fafafa",
                  }}
                >
                  {sourceBadge(s)}
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                    {s.title || "(geen titel)"}
                  </div>
                  {s.description && (
                    <div style={{ fontSize: "0.8rem", color: "#555", marginBottom: "0.25rem" }}>
                      {s.description.length > 160
                        ? s.description.slice(0, 160) + "…"
                        : s.description}
                    </div>
                  )}
                  {!isText && s.imageUrl && (
                    <div
                      style={{
                        marginTop: "0.25rem",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        maxHeight: "140px",
                      }}
                    >
                      <img
                        src={s.imageUrl}
                        alt={s.title || "Bronafbeelding"}
                        style={{ width: "100%", objectFit: "cover" }}
                      />
                    </div>
                  )}
                  {s.url && (
                    <div style={{ marginTop: "0.25rem" }}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.8rem" }}
                      >
                        Open originele bron →
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LessonPage;


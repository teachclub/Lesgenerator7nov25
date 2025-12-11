import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LessonConcept = {
  hoofdvraag?: string;
  hook?: string;
  context?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
  lesopbrengst?: string;
  complexityLevel?: number;
  nuanceLevel?: number;
};

type Source = {
  id: string | number;
  provider?: string;
  type?: string;
  title?: string;
  description?: string;
  fullText?: string;
  content?: string;
  url?: string | null;
  imageUrl?: string | null;
};

type TvKaInfo = {
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
};

type Step1DocentData = {
  wat?: string;
  hoe?: string;
  waarom?: string;
  deelvragen?: string[];
  bronverwijzingenPerDeelvraag?: {
    deelvraag?: string;
    bronnen?: number[];
  }[];
  lesfasen?: {
    fase?: string;
    tijd?: string;
    doel?: string;
    activiteit?: string;
    werkvorm?: string;
  }[];
};

type Step1Response = {
  step?: string;
  data?: {
    chainSignature?: string;
    docent?: Step1DocentData;
  };
  error?: string;
};

type Step2LeerlingData = {
  antiPresentismeIntro?: string;
  startopdracht?: {
    beschrijving?: string;
    stappen?: string[];
  };
  bronnenblad?: {
    instructie?: string;
    bronNummering?: {
      nummer: number;
      id: string | number;
      label?: string;
      provider?: string;
      type?: string;
      url?: string | null;
    }[];
  };
  bronvragen?: {
    bronNummer: number;
    bronId: string | number;
    vragen: { type: string; vraag: string }[];
  }[];
  samenwerkingstabel?: {
    instructie?: string;
    kolommen?: string[];
    rijen?: string[];
    meerkeuze?: {
      wieSpreektOpties?: string[];
      dimensieOpties?: string[];
      subdimensieOpties?: string[];
    };
  };
  reflectie?: {
    instructie?: string;
    vragen?: string[];
  };
};

type Step2Response = {
  step?: string;
  data?: {
    chainSignature?: string;
    leerling?: Step2LeerlingData;
  };
  error?: string;
};

type StepStatus = "idle" | "loading" | "done" | "error";

const LessonPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as {
    tvKa?: TvKaInfo;
    concept?: LessonConcept;
    sources?: Source[];
  };

  const tvKa: TvKaInfo = state.tvKa || {};
  const concept: LessonConcept | undefined = state.concept;
  const sources: Source[] = state.sources || [];

  const [step1Status, setStep1Status] = useState<StepStatus>("idle");
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [docentData, setDocentData] = useState<Step1DocentData | null>(null);
  const [deelvragenFromStep1, setDeelvragenFromStep1] = useState<string[]>([]);

  const [step2Status, setStep2Status] = useState<StepStatus>("idle");
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [leerlingData, setLeerlingData] = useState<Step2LeerlingData | null>(
    null
  );
  const [step2RawJson, setStep2RawJson] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"step1" | "step2" | "debug">(
    "step1"
  );

  useEffect(() => {
    if (!concept || !sources || sources.length === 0) {
      // eventueel navigate("/") als je een echte home hebt
    }
  }, [concept, sources]);

  // STEP 1 – automatisch draaien
  useEffect(() => {
    if (!concept || !sources || sources.length === 0) return;
    if (step1Status !== "idle") return;

    const runStep1 = async () => {
      try {
        setStep1Status("loading");
        setStep1Error(null);

        const resp = await fetch("/api/generate-lesson-v2/step1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tvKa,
            concept,
            sources,
          }),
        });

        const data = (await resp.json()) as Step1Response;

        if (!resp.ok || data.error) {
          throw new Error(
            data.error ||
              `Backend-fout bij step1 (status ${resp.status || "onbekend"})`
          );
        }

        if (!data.data || !data.data.docent) {
          throw new Error("STEP1: ontbrekend docent-object in response");
        }

        const docent = data.data.docent;
        setDocentData(docent);

        const dv =
          Array.isArray(docent.deelvragen) && docent.deelvragen.length > 0
            ? docent.deelvragen
            : [];
        setDeelvragenFromStep1(dv);

        setStep1Status("done");
      } catch (err: any) {
        console.error("[LessonPage] step1-fout:", err);
        setStep1Error(
          err.message || "Er ging iets mis bij het genereren van step 1."
        );
        setStep1Status("error");
      }
    };

    runStep1();
  }, [concept, sources, tvKa, step1Status]);

  // STEP 2 – handmatig
  const canRunStep2 =
    step1Status === "done" && deelvragenFromStep1.length > 0 && !!concept;

  const handleRunStep2 = async () => {
    if (!canRunStep2 || !concept) return;

    try {
      setStep2Status("loading");
      setStep2Error(null);
      setActiveTab("step2");

      const body = {
        tvKa,
        concept,
        sources,
        deelvragen: deelvragenFromStep1,
      };

      const resp = await fetch("/api/generate-lesson-v2/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await resp.json()) as Step2Response;

      if (!resp.ok || data.error) {
        throw new Error(
          data.error ||
            `Backend-fout bij step2 (status ${resp.status || "onbekend"})`
        );
      }

      if (!data.data || !data.data.leerling) {
        throw new Error("STEP2: ontbrekend leerling-object in response");
      }

      setLeerlingData(data.data.leerling);
      setStep2RawJson(JSON.stringify(data, null, 2));
      setStep2Status("done");
    } catch (err: any) {
      console.error("[LessonPage] step2-fout:", err);
      setStep2Error(
        err.message || "Er ging iets mis bij het genereren van step 2."
      );
      setStep2Status("error");
    }
  };

  const hoofdvraagText =
    concept?.hoofdvraag || "Hoofdvraag ontbreekt in concept.";
  const hookText = concept?.hook || "";

  if (!concept || !sources || sources.length === 0) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            marginBottom: "1rem",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          ← Terug
        </button>
        <h1>Lesgenerator</h1>
        <p>
          Er is geen lesconcept of er zijn geen bronnen doorgegeven. Ga terug en
          kies eerst een lesvoorstel met bronnen.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "960px", margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "0.75rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        ← Terug
      </button>

      <div style={{ marginBottom: "1rem" }}>
        <p
          style={{
            fontWeight: 600,
            marginBottom: "0.25rem",
            fontSize: "1rem",
          }}
        >
          Hoofdvraag: {hoofdvraagText}
        </p>
        {hookText && (
          <p
            style={{
              fontStyle: "italic",
              marginBottom: "0.25rem",
            }}
          >
            Hook: {hookText}
          </p>
        )}
        {(tvKa.tvLabel || tvKa.kaLabel) && (
          <p style={{ fontSize: "0.85rem", color: "#555" }}>
            {tvKa.tvLabel && <span>{tvKa.tvLabel}</span>}
            {tvKa.tvLabel && tvKa.kaLabel && <span> · </span>}
            {tvKa.kaLabel && <span>{tvKa.kaLabel}</span>}
          </p>
        )}
      </div>

      {/* Actieknoppen */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setStep1Status("idle");
            setStep2Status("idle");
            setLeerlingData(null);
            setStep2RawJson("");
            setActiveTab("step1");
          }}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid #111827",
            backgroundColor: "#111827",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Step 1 – Docentmateriaal
          {step1Status === "loading" ? " (bezig…)" : ""}
        </button>

        <button
          type="button"
          onClick={handleRunStep2}
          disabled={!canRunStep2 || step2Status === "loading"}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid #2563eb",
            backgroundColor:
              !canRunStep2 || step2Status === "loading" ? "#dbeafe" : "#2563eb",
            color:
              !canRunStep2 || step2Status === "loading" ? "#6b7280" : "#ffffff",
            cursor:
              !canRunStep2 || step2Status === "loading"
                ? "not-allowed"
                : "pointer",
            fontSize: "0.9rem",
          }}
        >
          Step 2 – Leerlingmateriaal
          {step2Status === "loading" ? " (bezig…)" : ""}
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/lesson/step3", {
              state: {
                tvKa,
                concept,
                sources,
              },
            })
          }
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid #059669",
            backgroundColor: "#10b981",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Step 3 – Bronnenblad
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("debug")}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid #f97316",
            backgroundColor: "#ffedd5",
            color: "#9a3412",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          Debug STEP 2 JSON
        </button>
      </div>

      {/* Status / foutmeldingen */}
      <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem" }}>
        {step1Status === "loading" && (
          <div>Step 1 wordt gegenereerd… (docentmateriaal)</div>
        )}
        {step1Error && (
          <div
            style={{
              color: "#a10000",
              backgroundColor: "#ffe5e5",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              marginTop: "0.25rem",
            }}
          >
            Fout bij Step 1: {step1Error}
          </div>
        )}

        {step2Status === "loading" && (
          <div style={{ marginTop: "0.25rem" }}>
            Step 2 wordt gegenereerd… (leerlingmateriaal)
          </div>
        )}
        {step2Error && (
          <div
            style={{
              color: "#a10000",
              backgroundColor: "#ffe5e5",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              marginTop: "0.25rem",
            }}
          >
            Fout bij Step 2: {step2Error}
          </div>
        )}

        {!canRunStep2 && step1Status === "done" && (
          <div style={{ marginTop: "0.25rem" }}>
            Let op: Step 2 wacht op geldige deelvragen uit Step 1.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          borderBottom: "1px solid #ddd",
          marginBottom: "0.75rem",
          display: "flex",
          gap: "1.5rem",
          fontSize: "0.9rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("step1")}
          style={{
            border: "none",
            background: "transparent",
            paddingBottom: "0.35rem",
            cursor: "pointer",
            borderBottom:
              activeTab === "step1" ? "2px solid #111" : "2px solid transparent",
            fontWeight: activeTab === "step1" ? 600 : 400,
          }}
        >
          Step 1 – Docent
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("step2")}
          style={{
            border: "none",
            background: "transparent",
            paddingBottom: "0.35rem",
            cursor: "pointer",
            borderBottom:
              activeTab === "step2" ? "2px solid #111" : "2px solid transparent",
            fontWeight: activeTab === "step2" ? 600 : 400,
          }}
        >
          Step 2 – Leerling
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("debug")}
          style={{
            border: "none",
            background: "transparent",
            paddingBottom: "0.35rem",
            cursor: "pointer",
            borderBottom:
              activeTab === "debug"
                ? "2px solid #111"
                : "2px solid transparent",
            fontWeight: activeTab === "debug" ? 600 : 400,
          }}
        >
          Debug STEP 2 JSON
        </button>
      </div>

      {/* Tab-inhoud */}
      {activeTab === "step1" && (
        <div style={{ fontSize: "0.9rem" }}>
          {!docentData && step1Status === "loading" && (
            <p>Docentmateriaal wordt geladen…</p>
          )}
          {!docentData && step1Status === "done" && (
            <p>Geen docentmateriaal gevonden in de response.</p>
          )}
          {docentData && (
            <>
              {docentData.wat && (
                <>
                  <h3 style={{ fontSize: "0.95rem" }}>WAT</h3>
                  <p>{docentData.wat}</p>
                </>
              )}
              {docentData.hoe && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    HOE
                  </h3>
                  <p>{docentData.hoe}</p>
                </>
              )}
              {docentData.waarom && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    WAAROM
                  </h3>
                  <p>{docentData.waarom}</p>
                </>
              )}

              {deelvragenFromStep1.length > 0 && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    Deelvragen (voor keten naar Step 2)
                  </h3>
                  <ol>
                    {deelvragenFromStep1.map((dv, idx) => (
                      <li key={idx}>{dv}</li>
                    ))}
                  </ol>
                </>
              )}

              {docentData.lesfasen && docentData.lesfasen.length > 0 && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    Globale lesfasen
                  </h3>
                  <ul>
                    {docentData.lesfasen.map((fase, idx) => (
                      <li key={idx} style={{ marginBottom: "0.25rem" }}>
                        <strong>{fase.fase || `Fase ${idx + 1}`}</strong>
                        {fase.tijd ? ` – ${fase.tijd}` : ""}
                        {fase.doel && (
                          <>
                            <br />
                            Doel: {fase.doel}
                          </>
                        )}
                        {fase.activiteit && (
                          <>
                            <br />
                            Activiteit: {fase.activiteit}
                          </>
                        )}
                        {fase.werkvorm && (
                          <>
                            <br />
                            Werkvorm: {fase.werkvorm}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "step2" && (
        <div style={{ fontSize: "0.9rem" }}>
          {step2Status === "idle" && (
            <p>
              Klik op <em>&quot;Step 2 – Leerlingmateriaal&quot;</em> bovenaan om
              het leerlingmateriaal te genereren.
            </p>
          )}
          {step2Status === "loading" && <p>Leerlingmateriaal wordt geladen…</p>}
          {step2Status === "error" && step2Error && (
            <p style={{ color: "#a10000" }}>{step2Error}</p>
          )}
          {step2Status === "done" && !leerlingData && (
            <p>Geen leerlingmateriaal gevonden in de response.</p>
          )}
          {step2Status === "done" && leerlingData && (
            <>
              {leerlingData.antiPresentismeIntro && (
                <>
                  <h3 style={{ fontSize: "0.95rem" }}>
                    Anti-presentisme-inleiding
                  </h3>
                  <p>{leerlingData.antiPresentismeIntro}</p>
                </>
              )}

              {leerlingData.startopdracht && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    Startopdracht
                  </h3>
                  <p>{leerlingData.startopdracht.beschrijving}</p>
                  {leerlingData.startopdracht.stappen &&
                    leerlingData.startopdracht.stappen.length > 0 && (
                      <ol>
                        {leerlingData.startopdracht.stappen.map((stap, idx) => (
                          <li key={idx}>{stap}</li>
                        ))}
                      </ol>
                    )}
                </>
              )}

              {leerlingData.bronnenblad && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    Bronnenblad
                  </h3>
                  {leerlingData.bronnenblad.instructie && (
                    <p>{leerlingData.bronnenblad.instructie}</p>
                  )}
                  {leerlingData.bronnenblad.bronNummering &&
                    leerlingData.bronnenblad.bronNummering.length > 0 && (
                      <ul>
                        {leerlingData.bronnenblad.bronNummering.map((b) => (
                          <li key={b.nummer}>
                            <strong>Bron {b.nummer}:</strong>{" "}
                            {b.label || `id ${String(b.id)}`}{" "}
                            {b.provider ? `(${b.provider})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                </>
              )}

              {leerlingData.bronvragen && leerlingData.bronvragen.length > 0 && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    Bronvragen
                  </h3>
                  {leerlingData.bronvragen.map((blok) => (
                    <div
                      key={`${blok.bronNummer}-${String(blok.bronId)}`}
                      style={{ marginBottom: "0.5rem" }}
                    >
                      <strong>
                        Bron {blok.bronNummer} – id {String(blok.bronId)}
                      </strong>
                      <ul>
                        {blok.vragen.map((v, idx) => (
                          <li key={idx}>
                            {idx + 1}. [{v.type}] {v.vraag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}

              {leerlingData.samenwerkingstabel && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    Samenwerkingstabel
                  </h3>
                  {leerlingData.samenwerkingstabel.instructie && (
                    <p>{leerlingData.samenwerkingstabel.instructie}</p>
                  )}
                  {leerlingData.samenwerkingstabel.kolommen &&
                    leerlingData.samenwerkingstabel.rijen && (
                      <table
                        style={{
                          borderCollapse: "collapse",
                          fontSize: "0.8rem",
                          width: "100%",
                        }}
                      >
                        <thead>
                          <tr>
                            {leerlingData.samenwerkingstabel.kolommen.map(
                              (kol, idx) => (
                                <th
                                  key={idx}
                                  style={{
                                    border: "1px solid #ccc",
                                    padding: "0.25rem",
                                  }}
                                >
                                  {kol}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {leerlingData.samenwerkingstabel.rijen.map(
                            (rij, idx) => (
                              <tr key={idx}>
                                {(
                                  leerlingData.samenwerkingstabel!.kolommen ||
                                  []
                                ).map((_, colIdx) => (
                                  <td
                                    key={colIdx}
                                    style={{
                                      border: "1px solid #eee",
                                      padding: "0.25rem",
                                    }}
                                  >
                                    {colIdx === 0 ? rij : ""}
                                  </td>
                                ))}
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    )}
                </>
              )}
{/* Meerkeuze-opties onder de tabel */}
{leerlingData.samenwerkingstabel?.meerkeuze && (
  <div style={{ marginTop: "1rem" }}>
    <h4 style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>
      Keuzemogelijkheden
    </h4>

    {/* Wie spreekt */}
    {leerlingData.samenwerkingstabel.meerkeuze.wieSpreektOpties && (
      <>
        <strong>Wie spreekt in de bron?</strong>
        <ul>
          {leerlingData.samenwerkingstabel.meerkeuze.wieSpreektOpties.map(
            (opt, idx) => (
              <li key={idx}>{opt}</li>
            )
          )}
        </ul>
      </>
    )}

    {/* Dimensies */}
    {leerlingData.samenwerkingstabel.meerkeuze.dimensieOpties && (
      <>
        <strong>Dimensies</strong>
        <ul>
          {leerlingData.samenwerkingstabel.meerkeuze.dimensieOpties.map(
            (opt, idx) => (
              <li key={idx}>{opt}</li>
            )
          )}
        </ul>
      </>
    )}

    {/* Subdimensies */}
    {leerlingData.samenwerkingstabel.meerkeuze.subdimensieOpties && (
      <>
        <strong>Subdimensies / soorten verklaring</strong>
        <ul>
          {leerlingData.samenwerkingstabel.meerkeuze.subdimensieOpties.map(
            (opt, idx) => (
              <li key={idx}>{opt}</li>
            )
          )}
        </ul>
      </>
    )}
  </div>
)}

              {leerlingData.reflectie && (
                <>
                  <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
                    Reflectie
                  </h3>
                  {leerlingData.reflectie.instructie && (
                    <p>{leerlingData.reflectie.instructie}</p>
                  )}
                  {leerlingData.reflectie.vragen && (
                    <ol>
                      {leerlingData.reflectie.vragen.map((vr, idx) => (
                        <li key={idx}>{`${idx + 1}. ${vr}`}</li>
                      ))}
                    </ol>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "debug" && (
        <pre
          style={{
            fontSize: "0.75rem",
            backgroundColor: "#111",
            color: "#f5f5f5",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            whiteSpace: "pre-wrap",
            maxHeight: "60vh",
            overflow: "auto",
          }}
        >
          {step2RawJson || "// Nog geen STEP 2 JSON opgehaald"}
        </pre>
      )}
    </div>
  );
};

export default LessonPage;


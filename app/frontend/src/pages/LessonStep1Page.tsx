import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LessonNav from "../components/LessonNav";

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
  masterSignature?: string;
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

type Step1Response = {
  step?: string;
  data?: {
    chainSignature?: string;
    docent?: any;
  };
  error?: string;
  message?: string;
};

export default function LessonStep1Page() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as {
    tvKa?: TvKaInfo;
    concept?: LessonConcept;
    sources?: Source[];
    step1?: Step1Response;
    step2?: any;
    step3?: any;
    step4?: any;
  };

  const tvKa = state.tvKa || {};
  const concept = state.concept;
  const sources = state.sources || [];

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    state.step1 ? "done" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [step1, setStep1] = useState<Step1Response | null>(
    state.step1 || null
  );

  const canRun = !!concept?.hoofdvraag && sources.length > 0;

  const docent = step1?.data?.docent || null;

  const deelvragen: string[] = useMemo(() => {
    const dv = docent?.deelvragen;
    return Array.isArray(dv) ? dv : [];
  }, [docent]);

  const runStep1 = async () => {
    if (!canRun) return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/generate-lesson-v2/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tvKa, concept, sources }),
      });

      const json = (await res.json()) as Step1Response;

      if (!res.ok || json.error) {
        throw new Error(
          json.message || json.error || `Backend-fout step1 (${res.status})`
        );
      }

      setStep1(json);
      setStatus("done");

      navigate("/lesson/step1", {
        replace: true,
        state: { ...state, step1: json },
      });
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Onbekende fout bij Step 1");
    }
  };

  if (!concept || sources.length === 0) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 980, margin: "0 auto" }}>
        <h1>Lesgenerator – Stap 1</h1>
        <p>
          Er is geen voorstel of tijdvak/Kenmerkend Aspect meegegeven. Ga terug
          naar de lesvoorstellenpagina en kies opnieuw.
        </p>
        <button
          type="button"
          onClick={() => navigate("/proposals")}
          style={{ padding: "0.6rem 0.9rem", borderRadius: "0.6rem" }}
        >
          ← Terug naar lesvoorstellen
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 980, margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "0.75rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        ← Terug
      </button>

      <LessonNav
        current="step1"
        canGoStep2={!!state.step1}
        canGoStep3={false}
        canGoStep4={false}
      />

      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Lesgenerator – Step 1</h1>
        <p style={{ marginTop: "0.5rem", fontWeight: 700 }}>
          Hoofdvraag: {concept.hoofdvraag}
        </p>
        {(tvKa.tvLabel || tvKa.kaLabel) && (
          <p style={{ fontSize: "0.9rem", color: "#555" }}>
            {tvKa.tvLabel || ""}
            {tvKa.tvLabel && tvKa.kaLabel ? " · " : ""}
            {tvKa.kaLabel || ""}
          </p>
        )}
        <p style={{ fontSize: "0.85rem", color: "#555" }}>
          Bronnen: <strong>{sources.length}</strong>
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={runStep1}
          disabled={!canRun || status === "loading"}
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: "0.6rem",
            border: "1px solid #d1d5db",
            cursor: !canRun || status === "loading" ? "not-allowed" : "pointer",
            opacity: !canRun ? 0.5 : 1,
          }}
        >
          {status === "loading" ? "Bezig…" : "Genereer Step 1"}
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/lesson/step2", { state: { ...state, step1 } })
          }
          disabled={!step1}
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: "0.6rem",
            border: "1px solid #d1d5db",
            cursor: step1 ? "pointer" : "not-allowed",
            opacity: step1 ? 1 : 0.45,
          }}
        >
          Naar Step 2 →
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            color: "#a10000",
            background: "#ffe5e5",
            padding: "0.75rem",
            borderRadius: "0.6rem",
          }}
        >
          {error}
        </div>
      )}

      {docent && (
        <div style={{ marginTop: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>WAT</h2>
          <p>{docent.wat}</p>

          <h2 style={{ fontSize: "1.1rem", marginTop: "1rem" }}>HOE</h2>
          <p>{docent.hoe}</p>

          <h2 style={{ fontSize: "1.1rem", marginTop: "1rem" }}>WAAROM</h2>
          <p>{docent.waarom}</p>

          {Array.isArray(deelvragen) && deelvragen.length === 4 && (
            <>
              <h2 style={{ fontSize: "1.1rem", marginTop: "1rem" }}>
                Deelvragen
              </h2>
              <ol>
                {deelvragen.map((dv, i) => (
                  <li key={i} style={{ marginBottom: "0.35rem" }}>
                    {dv}
                  </li>
                ))}
              </ol>
            </>
          )}

          {docent.hoofdvraagAntwoord && (
            <>
              <h2 style={{ fontSize: "1.1rem", marginTop: "1rem" }}>
                Globaal hoofdantwoord
              </h2>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  padding: "0.75rem",
                }}
              >
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {docent.hoofdvraagAntwoord.vraag}
                </p>
                <p style={{ marginTop: "0.4rem" }}>
                  {docent.hoofdvraagAntwoord.antwoord}
                </p>
                <p style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
                  Bronnen:{" "}
                  {(docent.hoofdvraagAntwoord.gebruikteBronNummers || []).join(
                    ", "
                  ) || "—"}
                </p>
              </div>
            </>
          )}

          {Array.isArray(docent.deelantwoorden) && docent.deelantwoorden.length > 0 && (
            <>
              <h2 style={{ fontSize: "1.1rem", marginTop: "1rem" }}>
                Globale deelantwoorden
              </h2>
              {docent.deelantwoorden.map((a: any, i: number) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.75rem",
                    padding: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700 }}>{a.vraag}</p>
                  <p style={{ marginTop: "0.4rem" }}>{a.antwoord}</p>
                  <p style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
                    Bronnen: {(a.gebruikteBronNummers || []).join(", ") || "—"}
                  </p>
                </div>
              ))}
            </>
          )}

          {Array.isArray(docent.lesfasen) && docent.lesfasen.length > 0 && (
            <>
              <h2 style={{ fontSize: "1.1rem", marginTop: "1rem" }}>
                Lesfasen
              </h2>
              <ul>
                {docent.lesfasen.map((f: any, i: number) => (
                  <li key={i} style={{ marginBottom: "0.5rem" }}>
                    <strong>{f.fase}</strong>
                    {f.tijd ? ` – ${f.tijd}` : ""}
                    {f.doel ? <div>Doel: {f.doel}</div> : null}
                    {f.activiteit ? <div>Activiteit: {f.activiteit}</div> : null}
                    {f.werkvorm ? <div>Werkvorm: {f.werkvorm}</div> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {status === "idle" && (
        <div style={{ marginTop: "1rem", color: "#555", fontSize: "0.9rem" }}>
          Klik op “Genereer Step 1” om te starten.
        </div>
      )}
    </div>
  );
}


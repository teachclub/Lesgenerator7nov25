import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LessonStep2View from "../components/LessonStep2View";
import type { LessonStep2Data } from "../types/lessonV2";

type LessonConcept = {
  titel?: string;
  hook?: string;
  context?: string;
  hoofdvraag?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
};

type Source = {
  id: string | number;
  provider?: string;
  type?: string;
  title?: string;
  description?: string;
  fullText?: string;
  content?: string;
  snippet?: string;
  url?: string | null;
  imageUrl?: string | null;
};

type TvKa = {
  tv: number | null;
  tvLabel?: string | null;
  ka?: string | null;
  kaLabel?: string | null;
};

type LocationState = {
  concept: LessonConcept;
  sources: Source[];
  tvKa?: TvKa;
};

type Step1Data = any;

const LessonPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || {}) as Partial<LocationState>;
  const concept = state.concept;
  const sources = state.sources || [];
  const tvKa = state.tvKa;

  const [activeTab, setActiveTab] = useState<"step1" | "step2">("step1");

  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<LessonStep2Data | null>(null);

  const [loadingStep1, setLoadingStep1] = useState(false);
  const [loadingStep2, setLoadingStep2] = useState(false);
  const [errorStep1, setErrorStep1] = useState<string | null>(null);
  const [errorStep2, setErrorStep2] = useState<string | null>(null);

  // Redirect if no data
  useEffect(() => {
    if (!concept || !sources || sources.length === 0) {
      const t = setTimeout(() => navigate("/proposals"), 300);
      return () => clearTimeout(t);
    }
  }, [concept, sources, navigate]);

  // NEW: Sequential execution of Step1 then Step2
  useEffect(() => {
    if (!concept || !sources || sources.length === 0) return;

    const body = JSON.stringify({ concept, sources, tvKa: tvKa || null });
    const headers = { "Content-Type": "application/json" };

    let cancelled = false;

    async function run() {
      setLoadingStep1(true);
      setLoadingStep2(true);
      setErrorStep1(null);
      setErrorStep2(null);

      //
      // STEP 1 – DOCENT
      //
      try {
        const res1 = await fetch("/api/generate-lesson-v2/step1", {
          method: "POST",
          headers,
          body,
        });

        if (!res1.ok) throw new Error(`Step 1 error: ${res1.status}`);

        const json1 = await res1.json();
        if (!cancelled) {
          setStep1Data(json1.data || json1);
          setLoadingStep1(false);
        }
      } catch (e: any) {
        console.error("Step1 failed", e);
        if (!cancelled) {
          setErrorStep1(e?.message || "Kon docentmateriaal niet genereren.");
          setLoadingStep1(false);
        }
      }

      if (cancelled) return;

      //
      // STEP 2 – LEERLING
      //
      try {
        const res2 = await fetch("/api/generate-lesson-v2/step2", {
          method: "POST",
          headers,
          body,
        });

        if (!res2.ok) throw new Error(`Step 2 error: ${res2.status}`);

        const json2 = await res2.json();
        if (!cancelled) {
          setStep2Data(json2.data || json2);
          setLoadingStep2(false);
        }
      } catch (e: any) {
        console.error("Step2 failed", e);
        if (!cancelled) {
          setErrorStep2(e?.message || "Kon leerlingmateriaal niet genereren.");
          setLoadingStep2(false);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [concept, sources, tvKa]);

  const titel = concept?.titel || "Lesconcept";
  const hook = concept?.hook;
  const hoofdvraagConcept = concept?.hoofdvraag;

  const tvKaLabel = useMemo(() => {
    if (!tvKa) return "";
    const parts = [];
    if (tvKa.tvLabel) parts.push(tvKa.tvLabel);
    if (tvKa.kaLabel) parts.push(tvKa.kaLabel);
    return parts.join(" • ");
  }, [tvKa]);

  if (!concept || !sources || sources.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-sm text-blue-600 hover:underline">
          ← Terug
        </button>
        <p className="text-sm text-gray-600">Geen lesconcept geladen.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
        ← Terug naar lesvoorstellen
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{titel}</h1>
        {hook && <p className="italic mb-2">{hook}</p>}
        {tvKaLabel && <p className="text-sm text-gray-600 mb-1">{tvKaLabel}</p>}
        {hoofdvraagConcept && (
          <p className="text-sm">
            <span className="font-semibold">Hoofdvraag (concept): </span>
            {hoofdvraagConcept}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">

        <div className="space-y-6">
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
            <button
              onClick={() => setActiveTab("step1")}
              className={
                "px-4 py-1 rounded-full " +
                (activeTab === "step1" ? "bg-black text-white" : "hover:bg-gray-200")
              }
            >
              Stap 1 – Docent
            </button>
            <button
              onClick={() => setActiveTab("step2")}
              className={
                "px-4 py-1 rounded-full " +
                (activeTab === "step2" ? "bg-black text-white" : "hover:bg-gray-200")
              }
            >
              Stap 2 – Leerling
            </button>
          </div>

          {activeTab === "step1" && (
            <>
              {loadingStep1 && <p className="text-sm text-gray-500">Docentversie wordt geladen…</p>}
              {errorStep1 && <p className="text-sm text-red-600">Fout: {errorStep1}</p>}
              {!loadingStep1 && !errorStep1 && step1Data && (
                <>
                  {step1Data.docentenInstructie && (
                    <section className="space-y-2">
                      <h2 className="text-lg font-bold">Docentinstructie – wat, hoe, waarom</h2>
                      <dl className="text-sm space-y-1">
                        {step1Data.docentenInstructie.wat && (
                          <div>
                            <dt className="font-semibold">Wat?</dt>
                            <dd>{step1Data.docentenInstructie.wat}</dd>
                          </div>
                        )}
                        {step1Data.docentenInstructie.hoe && (
                          <div>
                            <dt className="font-semibold">Hoe?</dt>
                            <dd>{step1Data.docentenInstructie.hoe}</dd>
                          </div>
                        )}
                        {step1Data.docentenInstructie.waarom && (
                          <div>
                            <dt className="font-semibold">Waarom?</dt>
                            <dd>{step1Data.docentenInstructie.waarom}</dd>
                          </div>
                        )}
                      </dl>
                    </section>
                  )}

                  {Array.isArray(step1Data.deelvragen) && (
                    <section>
                      <h2 className="text-lg font-bold mb-2">Deelvragen</h2>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr>
                            <th className="border p-1 bg-gray-50">#</th>
                            <th className="border p-1 bg-gray-50">Deelvraag</th>
                            <th className="border p-1 bg-gray-50">Dimensie</th>
                            <th className="border p-1 bg-gray-50">Subdimensie</th>
                            <th className="border p-1 bg-gray-50">Bronnen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {step1Data.deelvragen.map((dv: any, i: number) => (
                            <tr key={i}>
                              <td className="border p-1">{i + 1}</td>
                              <td className="border p-1">{dv.vraag}</td>
                              <td className="border p-1">{dv.dimensie}</td>
                              <td className="border p-1">{dv.subdimensie}</td>
                              <td className="border p-1">
                                {Array.isArray(dv.bronIds) ? dv.bronIds.join(", ") : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}

                  {(step1Data.samenvattendAntwoord ||
                    step1Data.samenhang ||
                    step1Data.docentSamenvatting) && (
                    <section className="space-y-2">
                      <h2 className="text-lg font-bold">Inhoudelijke ruggensteun</h2>
                      <p className="text-sm whitespace-pre-line">
                        {step1Data.samenvattendAntwoord ||
                          step1Data.samenhang ||
                          step1Data.docentSamenvatting}
                      </p>
                    </section>
                  )}

                  <details className="mt-4 text-xs text-gray-500">
                    <summary>Debug: Step1 raw</summary>
                    <pre className="mt-2">{JSON.stringify(step1Data, null, 2)}</pre>
                  </details>
                </>
              )}
            </>
          )}

          {activeTab === "step2" && (
            <LessonStep2View step2={step2Data} loading={loadingStep2} error={errorStep2} />
          )}
        </div>

        <aside className="space-y-4">
          <h2 className="text-lg font-bold">Bronnen in deze les</h2>
          <p className="text-xs text-gray-500">→ {sources.length} bronnen</p>

          <div className="space-y-3">
            {sources.map((src) => (
              <article key={src.id} className="border rounded-2xl p-3 shadow-sm bg-white">
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                  {src.provider && (
                    <span className="px-2 py-0.5 border rounded-full">{src.provider}</span>
                  )}
                  {src.type && (
                    <span className="px-2 py-0.5 border rounded-full">
                      {src.type.toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold">{src.title}</h3>
                <p className="text-xs text-gray-700">
                  {src.snippet || src.description || ""}
                </p>
              </article>
            ))}
          </div>
        </aside>

      </div>
    </div>
  );
};

export default LessonPage;


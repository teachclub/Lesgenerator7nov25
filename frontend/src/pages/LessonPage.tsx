// src/pages/LessonPage.tsx
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

type Step1Data = any; // backend bepaalt structuur; we tonen wat er is

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

  // Als iemand direct op /lesson komt zonder state → terug naar proposals
  useEffect(() => {
    if (!concept || !sources || sources.length === 0) {
      // klein timeoutje zodat de gebruiker geen flits ziet
      const t = setTimeout(() => {
        navigate("/proposals");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [concept, sources, navigate]);

  // Backend aanroepen voor step1 & step2
  useEffect(() => {
    if (!concept || !sources || sources.length === 0) return;

    const body = {
      concept,
      sources,
      tvKa: tvKa || null,
    };

    let cancelled = false;

    async function run() {
      setLoadingStep1(true);
      setLoadingStep2(true);
      setErrorStep1(null);
      setErrorStep2(null);

      try {
        const [res1, res2] = await Promise.all([
          fetch("/api/generate-lesson-v2/step1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
          fetch("/api/generate-lesson-v2/step2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        ]);

        if (!res1.ok) {
          throw new Error(`step1: HTTP ${res1.status}`);
        }
        if (!res2.ok) {
          throw new Error(`step2: HTTP ${res2.status}`);
        }

        const json1 = await res1.json();
        const json2 = await res2.json();

        if (cancelled) return;

        setStep1Data(json1?.data ?? null);
        setStep2Data(json2?.data ?? null);
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message || "Onbekende fout";
        if (msg.startsWith("step1:")) setErrorStep1(msg);
        else if (msg.startsWith("step2:")) setErrorStep2(msg);
        else {
          setErrorStep1(msg);
          setErrorStep2(msg);
        }
      } finally {
        if (!cancelled) {
          setLoadingStep1(false);
          setLoadingStep2(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [concept, sources, tvKa]);

  const titel = concept?.titel || "Lesconcept";
  const hook = concept?.hook;
  const context = concept?.context;
  const hoofdvraagConcept = concept?.hoofdvraag;

  const tvKaLabel = useMemo(() => {
    if (!tvKa) return "";
    const parts: string[] = [];
    if (tvKa.tvLabel) parts.push(tvKa.tvLabel);
    if (tvKa.kaLabel) parts.push(tvKa.kaLabel);
    return parts.join(" • ");
  }, [tvKa]);

  if (!concept || !sources || sources.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          ← Terug
        </button>
        <p className="text-sm text-gray-600">
          Er is geen lesconcept geladen. Ga terug naar de lesvoorstellen.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header + concept */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        ← Terug naar lesvoorstellen
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{titel}</h1>
        {hook && <p className="italic mb-2">{hook}</p>}
        {tvKaLabel && (
          <p className="text-sm text-gray-600 mb-1">{tvKaLabel}</p>
        )}
        {hoofdvraagConcept && (
          <p className="text-sm">
            <span className="font-semibold">Hoofdvraag (concept): </span>
            {hoofdvraagConcept}
          </p>
        )}
      </div>

      {/* Layout: links inhoud, rechts bronnenoverzicht */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
        {/* LINKERKOLOM: tabs + inhoud */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("step1")}
              className={
                "px-4 py-1 rounded-full transition " +
                (activeTab === "step1"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-200")
              }
            >
              Stap 1 – Docentversie
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("step2")}
              className={
                "px-4 py-1 rounded-full transition " +
                (activeTab === "step2"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-200")
              }
            >
              Stap 2 – Leerlingmateriaal
            </button>
          </div>

          {/* STEP 1 – DOCENTPREVIEW */}
          {activeTab === "step1" && (
            <div className="space-y-4">
              {loadingStep1 && (
                <p className="text-sm text-gray-500">
                  Docentversie wordt geladen…
                </p>
              )}
              {errorStep1 && (
                <p className="text-sm text-red-600">
                  Fout bij stap 1: {errorStep1}
                </p>
              )}
              {!loadingStep1 && !errorStep1 && step1Data && (
                <>
                  {/* Docenteninstructie */}
                  {step1Data.docentenInstructie && (
                    <section className="space-y-2">
                      <h2 className="text-lg font-bold">
                        Docentinstructie – wat, hoe, waarom
                      </h2>
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

                  {/* Deelvragen-overzicht als dat aanwezig is */}
                  {Array.isArray(step1Data.deelvragen) &&
                    step1Data.deelvragen.length > 0 && (
                      <section className="space-y-2">
                        <h2 className="text-lg font-bold">Deelvragen</h2>
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="border px-2 py-1 text-left bg-gray-50">
                                #
                              </th>
                              <th className="border px-2 py-1 text-left bg-gray-50">
                                Deelvraag
                              </th>
                              <th className="border px-2 py-1 text-left bg-gray-50">
                                Dimensie
                              </th>
                              <th className="border px-2 py-1 text-left bg-gray-50">
                                Subdimensie
                              </th>
                              <th className="border px-2 py-1 text-left bg-gray-50">
                                Bronnen
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {step1Data.deelvragen.map(
                              (dv: any, index: number) => (
                                <tr key={index}>
                                  <td className="border px-2 py-1 align-top">
                                    {index + 1}
                                  </td>
                                  <td className="border px-2 py-1 align-top">
                                    {dv.vraag}
                                  </td>
                                  <td className="border px-2 py-1 align-top">
                                    {dv.dimensie}
                                  </td>
                                  <td className="border px-2 py-1 align-top">
                                    {dv.subdimensie}
                                  </td>
                                  <td className="border px-2 py-1 align-top">
                                    {Array.isArray(dv.bronIds)
                                      ? dv.bronIds.join(", ")
                                      : ""}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </section>
                    )}

                  {/* Samenvattende uitleg / ruggensteun */}
                  {(step1Data.samenvattendAntwoord ||
                    step1Data.samenhang ||
                    step1Data.docentSamenvatting) && (
                    <section className="space-y-2">
                      <h2 className="text-lg font-bold">
                        Inhoudelijke ruggensteun
                      </h2>
                      <p className="text-sm whitespace-pre-line">
                        {step1Data.samenvattendAntwoord ||
                          step1Data.samenhang ||
                          step1Data.docentSamenvatting}
                      </p>
                    </section>
                  )}

                  {/* Debug-blok zodat je altijd ziet wat er binnenkomt */}
                  <details className="mt-4 text-xs text-gray-500">
                    <summary className="cursor-pointer">
                      Technische debug – ruwe step1-data
                    </summary>
                    <pre className="mt-2 overflow-x-auto">
                      {JSON.stringify(step1Data, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </div>
          )}

          {/* STEP 2 – LEERLINGMATERIAAL */}
          {activeTab === "step2" && (
            <LessonStep2View
              step2={step2Data}
              loading={loadingStep2}
              error={errorStep2}
            />
          )}
        </div>

        {/* RECHTERKOLOM: bronnenoverzicht */}
        <aside className="space-y-4">
          <h2 className="text-lg font-bold">Bronnen in deze les</h2>
          <p className="text-xs text-gray-500 mb-1">
            Richting Gemini: {sources.length} bronnen
          </p>

          <div className="space-y-3">
            {sources.map((src) => (
              <article
                key={src.id}
                className="border rounded-2xl p-3 shadow-sm bg-white"
              >
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                  {src.provider && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border">
                      {src.provider}
                    </span>
                  )}
                  {src.type && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border">
                      {src.type.toUpperCase()}
                    </span>
                  )}
                </div>
                {src.title && (
                  <h3 className="text-sm font-semibold mb-1">{src.title}</h3>
                )}
                {src.snippet || src.description ? (
                  <p className="text-xs text-gray-700">
                    {src.snippet || src.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LessonPage;


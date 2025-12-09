// frontend/src/pages/LessonStep2Page.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LessonConcept = {
  hoofdvraag?: string;
  deelvragen?: {
    vraag: string;
    dimenSie?: string; // oude typo mogelijk
    dimensie?: string;
    subdimensie?: string;
  }[];
};

type Source = {
  id: string | number;
  // overige velden zijn niet nodig voor de UI in stap 2
};

type TvKa = {
  tv?: number | string;
  tvLabel?: string;
  ka?: number | string;
  kaLabel?: string;
};

type Step2Bronvraag = {
  sourceId: string | number;
  vraag: string;
  deelvraagIndex: number;
  dimenSie?: string; // tolerance voor eventuele oude sleutel
  dimensie?: string;
  subdimensie?: string;
};

type Step2InvultabelRij = {
  label: string;
  uitleg: string;
  deelvraagIndex: number;
};

type Step2Invultabel = {
  kolommen: string[];
  rijen: Step2InvultabelRij[];
};

type Step2ReflectieVraag = {
  vraag: string;
  aandachtspuntVoorDocent?: string;
};

type Step2Reflectie = {
  vragen: Step2ReflectieVraag[];
};

type Step2Data = {
  chainSignature: string;
  hoofdvraag: string;
  inleiding: string;
  bronvragen: Step2Bronvraag[];
  invultabel: Step2Invultabel;
  reflectie: Step2Reflectie;
};

type Step2Response = {
  step: string;
  data: Step2Data;
};

type LocationState = {
  concept?: LessonConcept;
  sources?: Source[];
  tvKa?: TvKa;
};

const LessonStep2Page: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);

  const concept = state.concept || {};
  const sources = Array.isArray(state.sources) ? state.sources : [];
  const tvKa = state.tvKa || {};

  // Veiligheidscheck: zonder concept + sources heeft deze pagina geen zin
  useEffect(() => {
    if (!concept || !concept.hoofdvraag || sources.length === 0) {
      // Terug naar stap 1
      // (of naar home; kies wat bij jouw flow past)
      navigate("/lesson/step1", { replace: true });
    }
  }, [concept, sources, navigate]);

  useEffect(() => {
    let cancelled = false;

    const fetchStep2 = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/generate-lesson-v2/step2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            concept,
            sources,
            tvKa,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `Backend-fout bij step2 (${res.status}): ${text.slice(0, 500)}`
          );
        }

        const json = (await res.json()) as Step2Response;

        if (!cancelled) {
          if (!json.data) {
            throw new Error("Ongeldige step2-response: data ontbreekt");
          }
          setStep2Data(json.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[LessonStep2Page] ERROR", err);
          setError(err?.message || "Onbekende fout bij laden van stap 2");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStep2();

    return () => {
      cancelled = true;
    };
  }, [concept, sources, tvKa]);

  // Groepeer bronvragen per sourceId
  const vragenPerBronId = useMemo(() => {
    const map = new Map<string, Step2Bronvraag[]>();

    if (!step2Data?.bronvragen) return map;

    for (const vraag of step2Data.bronvragen) {
      const key = String(vraag.sourceId);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(vraag);
    }

    return map;
  }, [step2Data]);

  const bronnenMetVragen = useMemo(() => {
    return Array.from(vragenPerBronId.entries()).map(([sourceId, vragen]) => ({
      sourceId,
      vragen,
    }));
  }, [vragenPerBronId]);

  const handleBackToStep1 = () => {
    navigate("/lesson/step1", {
      state: {
        concept,
        sources,
        tvKa,
      },
    });
  };

  const handleNextToStep3 = () => {
    navigate("/lesson/step3", {
      state: {
        concept,
        sources,
        tvKa,
        step2: step2Data,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <header className="space-y-2">
        <button
          type="button"
          onClick={handleBackToStep1}
          className="text-sm underline"
        >
          ← Terug naar stap 1
        </button>

        <h1 className="text-2xl font-bold">
          Stap 2 – Leerlingopdracht (bronvragen & invultabel)
        </h1>

        {(tvKa.tvLabel || tvKa.kaLabel) && (
          <p className="text-sm text-gray-600">
            {tvKa.tvLabel && <span>{tvKa.tvLabel}</span>}
            {tvKa.tvLabel && tvKa.kaLabel && <span> · </span>}
            {tvKa.kaLabel && <span>{tvKa.kaLabel}</span>}
          </p>
        )}
      </header>

      {loading && (
        <div className="p-4 rounded-xl border text-sm">
          Stap 2 wordt gegenereerd op basis van de hoofdvraag, deelvragen en
          bronnen…
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-400 bg-red-50 text-sm text-red-800">
          Er ging iets mis bij het ophalen van stap 2:
          <br />
          <code className="text-xs break-words">{error}</code>
        </div>
      )}

      {step2Data && !loading && !error && (
        <main className="space-y-8">
          {/* Hoofdvraag + inleiding */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Hoofdvraag voor leerlingen</h2>
            <p className="font-medium">{step2Data.hoofdvraag}</p>

            <h3 className="text-lg font-semibold mt-4">Inleiding (leerlingtekst)</h3>
            <p className="whitespace-pre-line">{step2Data.inleiding}</p>
          </section>

          {/* Bronvragen – alleen Bron X + vragen, geen broninhoud */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Bronvragen</h2>

            {bronnenMetVragen.length === 0 && (
              <p className="text-sm text-gray-600">
                Er zijn nog geen bronvragen gegenereerd voor deze les.
              </p>
            )}

            <div className="space-y-4">
              {bronnenMetVragen.map(({ sourceId, vragen }) => (
                <div
                  key={sourceId}
                  className="border rounded-xl p-3 md:p-4 space-y-2"
                >
                  <h3 className="font-semibold">
                    Bron {sourceId}
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {vragen.map((v, idx) => (
                      <li key={idx}>{v.vraag}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Invultabel – alleen structuur, zodat je ziet wat leerlingen doen */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Invultabel (structuur)</h2>

            <p className="text-sm text-gray-700">
              Leerlingen vullen deze tabel in tijdens de les. Hier zie je alleen
              de structuur (kolommen en groepsindeling).
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 border-b text-left">Groep</th>
                    <th className="px-3 py-2 border-b text-left">Uitleg</th>
                    {step2Data.invultabel.kolommen.map((kol, idx) => (
                      <th key={idx} className="px-3 py-2 border-b text-left">
                        {kol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {step2Data.invultabel.rijen.map((rij, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="px-3 py-2 border-b font-medium">
                        {rij.label}
                      </td>
                      <td className="px-3 py-2 border-b">{rij.uitleg}</td>
                      {step2Data.invultabel.kolommen.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-3 py-2 border-b text-gray-400 italic"
                        >
                          (door leerlingen in te vullen)
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Reflectievragen */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Reflectievragen</h2>

            <ul className="space-y-3">
              {step2Data.reflectie.vragen.map((rv, idx) => (
                <li
                  key={idx}
                  className="border rounded-xl p-3 md:p-4 text-sm space-y-1"
                >
                  <p className="font-medium">{rv.vraag}</p>
                  {rv.aandachtspuntVoorDocent && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Tip voor docent: </span>
                      {rv.aandachtspuntVoorDocent}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Navigatie onderaan */}
          <footer className="flex justify-between items-center pt-4 border-t mt-4">
            <button
              type="button"
              onClick={handleBackToStep1}
              className="text-sm underline"
            >
              ← Terug naar stap 1
            </button>
            <button
              type="button"
              onClick={handleNextToStep3}
              className="px-4 py-2 rounded-xl border text-sm font-medium"
            >
              Naar stap 3 (bronnenblad) →
            </button>
          </footer>
        </main>
      )}
    </div>
  );
};

export default LessonStep2Page;


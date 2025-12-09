import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ===== Types =====

type LessonConcept = {
  hoofdvraag?: string;
  hook?: string;
  context?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
  [key: string]: any;
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
  [key: string]: any;
};

type Step1DocentBronLink = {
  deelvraag: string;
  bronnen: number[];
};

type Step1DocentLesfase = {
  fase: string;
  tijd?: string;
  doel?: string;
  activiteit?: string;
  werkvorm?: string;
};

type Step1Docent = {
  wat: string;
  hoe: string;
  waarom: string;
  deelvragen: string[];
  bronverwijzingenPerDeelvraag: Step1DocentBronLink[];
  lesfasen?: Step1DocentLesfase[];
};

type Step1Response = {
  step: "step1";
  data: {
    chainSignature: string;
    docent: Step1Docent;
  };
};

type Step2Response = {
  step: "step2";
  [key: string]: any;
};

// ===== Helper om state uit de router te halen =====

type LocationStateLoose = {
  concept?: LessonConcept;
  lessonConcept?: LessonConcept;
  sources?: Source[];
  selectedSources?: Source[];
  [key: string]: any;
};

// ===== Component =====

const LessonPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as LocationStateLoose;

  const concept: LessonConcept =
    state.concept || state.lessonConcept || ({} as LessonConcept);

  const sources: Source[] =
    state.sources || state.selectedSources || ([] as Source[]);

  const [activeTab, setActiveTab] = useState<"docent" | "leerling">("docent");

  const [step1Loading, setStep1Loading] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);

  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const [step1Docent, setStep1Docent] = useState<Step1Docent | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Response | null>(null);

  const apiBase = "/api";

  const handleBackToProposals = () => {
    navigate("/proposals");
  };

  // ===== API helpers =====

  const generateStep1 = async () => {
    if (!concept || !concept.hoofdvraag) {
      setStep1Error("Geen geldig lesconcept beschikbaar.");
      return;
    }

    setStep1Loading(true);
    setStep1Error(null);

    try {
      const res = await fetch(`${apiBase}/generate-lesson-v2/step1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          concept,
          sources: sources.map((s) => ({
            id: s.id,
            title: s.title,
            provider: s.provider,
            type: s.type,
          })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson && errJson.error
            ? `Step1 HTTP ${res.status}: ${errJson.error}`
            : `Step1 HTTP ${res.status}`
        );
      }

      const json = (await res.json()) as Step1Response;

      if (!json.data || !json.data.docent) {
        throw new Error("STEP1: geen docent-data in response.");
      }

      const d = json.data.docent as any;
      const normalized: Step1Docent = {
        wat: typeof d.wat === "string" ? d.wat : "",
        hoe: typeof d.hoe === "string" ? d.hoe : "",
        waarom: typeof d.waarom === "string" ? d.waarom : "",
        deelvragen: Array.isArray(d.deelvragen)
          ? d.deelvragen.filter((v: any) => typeof v === "string")
          : [],
        bronverwijzingenPerDeelvraag: Array.isArray(
          d.bronverwijzingenPerDeelvraag
        )
          ? d.bronverwijzingenPerDeelvraag
              .filter((e: any) => e && typeof e === "object")
              .map((e: any) => ({
                deelvraag:
                  typeof e.deelvraag === "string" ? e.deelvraag : "",
                bronnen: Array.isArray(e.bronnen)
                  ? e.bronnen
                      .map((n: any) => parseInt(n, 10))
                      .filter((n: number) => Number.isInteger(n) && n > 0)
                  : [],
              }))
          : [],
        lesfasen: Array.isArray(d.lesfasen)
          ? d.lesfasen
              .filter((f: any) => f && typeof f === "object")
              .map((f: any) => ({
                fase: typeof f.fase === "string" ? f.fase : "",
                tijd: typeof f.tijd === "string" ? f.tijd : "",
                doel: typeof f.doel === "string" ? f.doel : "",
                activiteit:
                  typeof f.activiteit === "string" ? f.activiteit : "",
                werkvorm:
                  typeof f.werkvorm === "string" ? f.werkvorm : "",
              }))
          : [],
      };

      setStep1Docent(normalized);
    } catch (err: any) {
      console.error("[LessonPage] Fout bij step1:", err);
      setStep1Error(err.message || String(err));
      setStep1Docent(null);
    } finally {
      setStep1Loading(false);
    }
  };

  const generateStep2 = async () => {
    if (!concept || !concept.hoofdvraag) {
      setStep2Error("Geen geldig lesconcept beschikbaar.");
      return;
    }

    setStep2Loading(true);
    setStep2Error(null);

    try {
      const res = await fetch(`${apiBase}/generate-lesson-v2/step2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          concept,
          sources,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson && errJson.error
            ? `Step2 HTTP ${res.status}: ${errJson.error}`
            : `Step2 HTTP ${res.status}`
        );
      }

      const json = (await res.json()) as Step2Response;
      setStep2Data(json);
    } catch (err: any) {
      console.error("[LessonPage] Fout bij step2:", err);
      setStep2Error(err.message || String(err));
      setStep2Data(null);
    } finally {
      setStep2Loading(false);
    }
  };

  // ===== Render helpers =====

  const renderConcept = () => (
    <div className="p-4 border-b border-gray-200">
      <button
        className="mb-4 text-sm text-blue-600 hover:underline"
        onClick={handleBackToProposals}
      >
        ← Terug naar lesvoorstellen
      </button>

      <h2 className="text-lg font-semibold mb-2">Lesconcept</h2>
      {concept.hook && (
        <p className="italic text-gray-700 mb-2">{concept.hook}</p>
      )}

      <div className="text-sm text-gray-600 mb-1">
        {concept.tvLabel || (concept.tv && `Tijdvak ${concept.tv}`)}{" "}
        {concept.kaLabel && <>· {concept.kaLabel}</>}
      </div>

      <div className="mt-4">
        <h3 className="font-semibold mb-1">Hoofdvraag (concept):</h3>
        <p className="text-gray-800">{concept.hoofdvraag}</p>
      </div>
    </div>
  );

  const renderDocentTab = () => {
    if (step1Loading) {
      return <p className="p-4 text-sm text-gray-600">Step 1 laden…</p>;
    }

    if (step1Error) {
      return (
        <div className="p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">
            Fout bij genereren van het docentmateriaal (stap 1).
          </p>
          <p>{step1Error}</p>
        </div>
      );
    }

    if (!step1Docent) {
      return (
        <div className="p-4 text-sm text-gray-700">
          <p className="mb-2">
            Er is nog geen docentmateriaal gegenereerd voor deze les.
          </p>
          <p className="mb-2">
            Klik op{" "}
            <button
              className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-xs"
              onClick={generateStep1}
            >
              Step 1 – genereer docentmateriaal
            </button>{" "}
            om STEP 1 te starten.
          </p>
        </div>
      );
    }

    const deelvragen = step1Docent.deelvragen ?? [];
    const koppelingen = step1Docent.bronverwijzingenPerDeelvraag ?? [];
    const lesfasen = step1Docent.lesfasen ?? [];

    return (
      <div className="p-4 space-y-4">
        <section>
          <h3 className="font-semibold mb-1">WAT?</h3>
          <p className="text-sm text-gray-800 whitespace-pre-line">
            {step1Docent.wat}
          </p>
        </section>

        <section>
          <h3 className="font-semibold mb-1">HOE?</h3>
          <p className="text-sm text-gray-800 whitespace-pre-line">
            {step1Docent.hoe}
          </p>
        </section>

        <section>
          <h3 className="font-semibold mb-1">WAAROM?</h3>
          <p className="text-sm text-gray-800 whitespace-pre-line">
            {step1Docent.waarom}
          </p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Deelvragen</h3>
          {deelvragen.length === 0 ? (
            <p className="text-sm text-gray-500">
              Geen deelvragen beschikbaar.
            </p>
          ) : (
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {deelvragen.map((dv, idx) => (
                <li key={idx}>{dv}</li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h3 className="font-semibold mb-2">Lesplanning (lesfasen)</h3>
          {lesfasen.length === 0 ? (
            <p className="text-sm text-gray-500">
              Geen lesfasen beschikbaar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-b border-gray-200 px-2 py-1 text-left">
                      Fase
                    </th>
                    <th className="border-b border-gray-200 px-2 py-1 text-left">
                      Tijd
                    </th>
                    <th className="border-b border-gray-200 px-2 py-1 text-left">
                      Doel
                    </th>
                    <th className="border-b border-gray-200 px-2 py-1 text-left">
                      Activiteit
                    </th>
                    <th className="border-b border-gray-200 px-2 py-1 text-left">
                      Werkvorm
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lesfasen.map((fase, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="border-b border-gray-200 px-2 py-1">
                        {fase.fase || `Fase ${idx + 1}`}
                      </td>
                      <td className="border-b border-gray-200 px-2 py-1">
                        {fase.tijd || "–"}
                      </td>
                      <td className="border-b border-gray-200 px-2 py-1">
                        {fase.doel || "–"}
                      </td>
                      <td className="border-b border-gray-200 px-2 py-1">
                        {fase.activiteit || "–"}
                      </td>
                      <td className="border-b border-gray-200 px-2 py-1">
                        {fase.werkvorm || "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h3 className="font-semibold mb-2">
            Bronverwijzingen per deelvraag
          </h3>
          {koppelingen.length === 0 ? (
            <p className="text-sm text-gray-500">
              Geen bronverwijzingen beschikbaar.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {koppelingen.map((koppeling, idx) => (
                <li key={idx}>
                  <div className="font-medium">
                    {koppeling.deelvraag || `Deelvraag ${idx + 1}`}
                  </div>
                  <div className="text-gray-700">
                    Bronnen:{" "}
                    {koppeling.bronnen && koppeling.bronnen.length > 0
                      ? koppeling.bronnen.join(", ")
                      : "–"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  };

  const renderLeerlingTab = () => {
    if (step2Loading) {
      return <p className="p-4 text-sm text-gray-600">Step 2 laden…</p>;
    }

    if (step2Error) {
      return (
        <div className="p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">
            Fout bij genereren van het leerlingmateriaal (stap 2).
          </p>
          <p>{step2Error}</p>
        </div>
      );
    }

    if (!step2Data) {
      return (
        <div className="p-4 text-sm text-gray-700">
          <p className="mb-2">
            Er is nog geen leerlingmateriaal gegenereerd voor deze les.
          </p>
          <p className="mb-2">
            Klik op{" "}
            <button
              className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-xs"
              onClick={generateStep2}
            >
              Step 2 – genereer leerlingmateriaal
            </button>{" "}
            om STEP 2 te starten.
          </p>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        <section>
          <h3 className="font-semibold mb-2">Debug-weergave STEP 2 JSON</h3>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-2 overflow-auto max-h-[60vh]">
            {JSON.stringify(step2Data, null, 2)}
          </pre>
        </section>
      </div>
    );
  };

  // ===== Main render =====

  if (!concept || !concept.hoofdvraag) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <button
          className="mb-4 text-sm text-blue-600 hover:underline"
          onClick={handleBackToProposals}
        >
          ← Terug naar lesvoorstellen
        </button>
        <p className="text-sm text-red-600">
          Geen lesconcept gevonden. Ga terug naar de lesvoorstellen.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mt-4">
      {renderConcept()}

      {/* Tabs */}
      <div className="px-4 pt-4 border-b border-gray-200 flex gap-2">
        <button
          className={`px-4 py-2 rounded-full text-sm border ${
            activeTab === "docent"
              ? "bg-black text-white border-black"
              : "bg-white text-gray-800 border-gray-300"
          }`}
          onClick={() => {
            setActiveTab("docent");
            if (!step1Docent && !step1Loading) {
              void generateStep1();
            }
          }}
        >
          Step 1 – Docent
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm border ${
            activeTab === "leerling"
              ? "bg-black text-white border-black"
              : "bg-white text-gray-800 border-gray-300"
          }`}
          onClick={() => {
            setActiveTab("leerling");
            if (!step2Data && !step2Loading) {
              void generateStep2();
            }
          }}
        >
          Step 2 – Leerling
        </button>
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === "docent" ? renderDocentTab() : renderLeerlingTab()}
      </div>
    </div>
  );
};

export default LessonPage;


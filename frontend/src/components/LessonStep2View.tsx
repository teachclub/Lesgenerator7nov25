// src/components/LessonStep2View.tsx
import React, { useMemo } from "react";
import type { LessonStep2Data } from "../types/lessonV2";
import { groupBronvragenBySourceId } from "../utils/groupBronvragenBySourceId";

type Props = {
  step2: LessonStep2Data | null | undefined;
  loading?: boolean;
  error?: string | null;
};

const LessonStep2View: React.FC<Props> = ({ step2, loading, error }) => {
  const grouped = useMemo(
    () => (step2 ? groupBronvragenBySourceId(step2.bronvragen) : {}),
    [step2]
  );

  const sourceIds = Object.keys(grouped);

  if (loading) {
    return <p className="text-sm text-gray-500">Leerlingmateriaal wordt geladen…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-600">
        Fout bij het laden van het leerlingmateriaal: {error}
      </p>
    );
  }

  if (!step2) {
    return (
      <p className="text-sm text-gray-500">
        Er is nog geen leerlingmateriaal voor deze les geladen.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Inleiding + hoofdvraag */}
      <section>
        <h2 className="text-lg font-bold mb-1">Hoofdvraag voor leerlingen</h2>
        <p className="mb-4">{step2.hoofdvraag}</p>

        <h3 className="font-semibold mb-1">Inleiding (context van toen)</h3>
        <p className="whitespace-pre-line">{step2.inleiding}</p>
      </section>

      {/* Bronvragen per bronId */}
      <section>
        <h2 className="text-lg font-bold mb-2">Bronvragen</h2>

        {sourceIds.length === 0 ? (
          <p className="text-sm text-gray-500">
            Er zijn nog geen bronvragen gegenereerd voor deze les.
          </p>
        ) : (
          <div className="space-y-4">
            {sourceIds.map((sourceId) => (
              <div key={sourceId} className="border rounded-xl p-3">
                <h3 className="font-semibold mb-1">
                  Bron {sourceId}
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {grouped[sourceId].map((q, index) => (
                    <li key={sourceId + "-" + index}>{q.vraag}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invultabel (groep A/B/C/D) */}
      <section>
        <h2 className="text-lg font-bold mb-2">
          Invultabel – samenhang tussen bronnen en hoofdvraag
        </h2>

        <p className="text-sm text-gray-700 mb-2">
          De docent deelt de klas in vier groepen. Elke groep werkt met een
          cluster van bronnen en vult de tabel in. Leerlingen koppelen daarbij
          bron, subdimensie en een argument richting de hoofdvraag.
        </p>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {step2.invultabel.kolommen.map((kolom) => (
                <th
                  key={kolom}
                  className="border px-2 py-1 text-left bg-gray-50 font-semibold"
                >
                  {kolom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {step2.invultabel.rijen.map((rij) => (
              <tr key={rij.label}>
                <td className="border px-2 py-1 font-semibold">{rij.label}</td>
                {/* Voor nu: uitleg over meerdere kolommen, de precieze invulling doen leerlingen zelf op werkblad / in boekje */}
                <td className="border px-2 py-1" colSpan={step2.invultabel.kolommen.length - 1}>
                  {rij.uitleg}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Reflectievragen */}
      <section>
        <h2 className="text-lg font-bold mb-2">Reflectievragen</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          {step2.reflectie.vragen.map((r, idx) => (
            <li key={idx}>{r.vraag}</li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default LessonStep2View;


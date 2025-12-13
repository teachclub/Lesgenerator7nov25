import React from "react";

type StepStatus = "idle" | "loading" | "done" | "error";

type Step4LeerlingData = {
  antiPresentismeIntro?: string;
  startopdracht?: { beschrijving?: string; stappen?: string[] };
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
    antwoorden: { nummer: number; antwoord: string }[];
  }[];
  samenwerkingstabel?: {
    rijen?: {
      bron?: string;
      wieSpreekt?: string;
      observatie?: string;
      interpretatie?: string;
      dimensie?: string;
      subdimensie?: string;
    }[];
  };
  reflectie?: {
    antwoorden?: { nummer: number; antwoord: string }[];
  };
};

export default function Step4View({
  status,
  error,
  leerlingData,
}: {
  status: StepStatus;
  error: string | null;
  leerlingData: Step4LeerlingData | null;
}) {
  if (status === "idle") {
    return (
      <div style={{ fontSize: "0.9rem" }}>
        <p>
          Klik op <em>&quot;Step 4 – Antwoordmodel&quot;</em> om Step 2 in te
          vullen met voorbeeldantwoorden.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div style={{ fontSize: "0.9rem" }}>
        <p>Antwoordmodel wordt geladen…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ fontSize: "0.9rem" }}>
        <p style={{ color: "#a10000" }}>
          Fout bij Step 4: {error || "Onbekende fout in Step 4."}
        </p>
      </div>
    );
  }

  if (status === "done" && !leerlingData) {
    return (
      <div style={{ fontSize: "0.9rem" }}>
        <p>Geen Step 4 leerlingdata gevonden in de response.</p>
      </div>
    );
  }

  if (!leerlingData) return null;

  return (
    <div style={{ fontSize: "0.9rem" }}>
      {leerlingData.antiPresentismeIntro && (
        <>
          <h3 style={{ fontSize: "0.95rem" }}>Anti-presentisme-inleiding</h3>
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
            Bronvragen + antwoorden
          </h3>
          {leerlingData.bronvragen.map((blok) => (
            <div
              key={`${blok.bronNummer}-${String(blok.bronId)}`}
              style={{ marginBottom: "0.75rem" }}
            >
              <strong>
                Bron {blok.bronNummer} – id {String(blok.bronId)}
              </strong>
              <ol style={{ marginTop: "0.35rem" }}>
                {blok.antwoorden?.map((a) => (
                  <li key={a.nummer}>{a.antwoord}</li>
                ))}
              </ol>
            </div>
          ))}
        </>
      )}

      {leerlingData.samenwerkingstabel?.rijen &&
        leerlingData.samenwerkingstabel.rijen.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
              Samenwerkingstabel (ingevuld)
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                  width: "100%",
                  minWidth: "900px",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Bron",
                      "Wie spreekt",
                      "Observatie",
                      "Interpretatie",
                      "Dimensie",
                      "Subdimensie",
                    ].map((k) => (
                      <th
                        key={k}
                        style={{ border: "1px solid #ccc", padding: "0.25rem" }}
                      >
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leerlingData.samenwerkingstabel.rijen.map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ border: "1px solid #eee", padding: "0.25rem" }}>
                        {r.bron || ""}
                      </td>
                      <td style={{ border: "1px solid #eee", padding: "0.25rem" }}>
                        {r.wieSpreekt || ""}
                      </td>
                      <td style={{ border: "1px solid #eee", padding: "0.25rem" }}>
                        {r.observatie || ""}
                      </td>
                      <td style={{ border: "1px solid #eee", padding: "0.25rem" }}>
                        {r.interpretatie || ""}
                      </td>
                      <td style={{ border: "1px solid #eee", padding: "0.25rem" }}>
                        {r.dimensie || ""}
                      </td>
                      <td style={{ border: "1px solid #eee", padding: "0.25rem" }}>
                        {r.subdimensie || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      {leerlingData.reflectie?.antwoorden &&
        leerlingData.reflectie.antwoorden.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>
              Reflectie (antwoorden)
            </h3>
            <ol>
              {leerlingData.reflectie.antwoorden.map((a) => (
                <li key={a.nummer}>{a.antwoord}</li>
              ))}
            </ol>
          </>
        )}
    </div>
  );
}


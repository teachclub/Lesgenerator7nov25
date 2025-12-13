import React from "react";

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
    vragen: { nummer: number; type: string; vraag: string }[];
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

export default function Step2View({
  status,
  error,
  leerlingData,
}: {
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
  leerlingData: Step2LeerlingData | null;
}) {
  if (status === "idle") {
    return (
      <div style={{ fontSize: "0.9rem" }}>
        <p>
          Klik op <em>&quot;Step 2 – Leerlingmateriaal&quot;</em> om het
          leerlingmateriaal te genereren.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div style={{ fontSize: "0.9rem" }}>
        <p>Leerlingmateriaal wordt geladen…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ fontSize: "0.9rem" }}>
        <p style={{ color: "#a10000" }}>{error || "Onbekende fout in Step 2."}</p>
      </div>
    );
  }

  if (status === "done" && !leerlingData) {
    return (
      <div style={{ fontSize: "0.9rem" }}>
        <p>Geen leerlingmateriaal gevonden in de response.</p>
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
                    <strong>Bron {b.nummer}:</strong> {b.label || `id ${String(b.id)}`}{" "}
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
              style={{ marginBottom: "0.75rem" }}
            >
              <strong>
                Bron {blok.bronNummer} – id {String(blok.bronId)}
              </strong>
              <ol style={{ marginTop: "0.35rem" }}>
                {blok.vragen
                  .slice()
                  .sort((a, b) => (a.nummer || 0) - (b.nummer || 0))
                  .map((v, idx) => (
                    <li key={idx}>
                      {v.vraag /* bevat al "1. ..." volgens prompt */}
                    </li>
                  ))}
              </ol>
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
                    {leerlingData.samenwerkingstabel.kolommen.map((kol, idx) => (
                      <th
                        key={idx}
                        style={{
                          border: "1px solid #ccc",
                          padding: "0.25rem",
                        }}
                      >
                        {kol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leerlingData.samenwerkingstabel.rijen.map((rij, idx) => (
                    <tr key={idx}>
                      {(leerlingData.samenwerkingstabel!.kolommen || []).map(
                        (_, colIdx) => (
                          <td
                            key={colIdx}
                            style={{
                              border: "1px solid #eee",
                              padding: "0.25rem",
                            }}
                          >
                            {colIdx === 0 ? rij : ""}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          {leerlingData.samenwerkingstabel.meerkeuze && (
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                Keuzemogelijkheden
              </h4>

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
        </>
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
                <li key={idx}>{vr}</li> // bevat al "1. ..." volgens prompt
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}


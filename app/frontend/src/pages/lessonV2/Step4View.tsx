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
    qa: { nummer: number; vraag: string; antwoord: string }[];
  }[];

  samenwerkingstabel?: {
    kolommen?: string[];
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
    instructie?: string;
    vragen?: string[];
    antwoorden?: { nummer: number; vraag?: string; antwoord: string }[];
  };
};

function RenderLines({ text }: { text?: string }) {
  const t = (text || "").trim();
  if (!t) return null;
  return <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{t}</p>;
}

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
      <div style={{ fontSize: "0.95rem", color: "#555" }}>
        Klik op “Genereer Step 4” om Step 2 integraal aan te vullen met voorbeeldantwoorden.
      </div>
    );
  }

  if (status === "loading") {
    return <div style={{ fontSize: "0.95rem" }}>Antwoordmodel wordt gegenereerd…</div>;
  }

  if (status === "error") {
    return (
      <div style={{ fontSize: "0.95rem", color: "#a10000" }}>
        Fout bij Step 4: {error || "Onbekende fout in Step 4."}
      </div>
    );
  }

  if (status === "done" && !leerlingData) {
    return <div style={{ color: "#555" }}>Geen Step 4 leerlingdata gevonden.</div>;
  }

  if (!leerlingData) return null;

  const bronvragen = Array.isArray(leerlingData.bronvragen) ? leerlingData.bronvragen : [];
  const tabelRijen = Array.isArray(leerlingData.samenwerkingstabel?.rijen)
    ? leerlingData.samenwerkingstabel!.rijen!
    : [];

  const reflectieAntwoorden = Array.isArray(leerlingData.reflectie?.antwoorden)
    ? leerlingData.reflectie!.antwoorden!
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {(leerlingData.antiPresentismeIntro || leerlingData.startopdracht) && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.9rem" }}>
          {leerlingData.antiPresentismeIntro && (
            <>
              <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>
                Anti-presentisme-inleiding
              </h2>
              <RenderLines text={leerlingData.antiPresentismeIntro} />
            </>
          )}

          {leerlingData.startopdracht && (
            <div style={{ marginTop: leerlingData.antiPresentismeIntro ? "0.8rem" : 0 }}>
              <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>
                Startopdracht
              </h2>
              {leerlingData.startopdracht.beschrijving && (
                <RenderLines text={leerlingData.startopdracht.beschrijving} />
              )}
              {Array.isArray(leerlingData.startopdracht.stappen) &&
                leerlingData.startopdracht.stappen.length > 0 && (
                  <ol style={{ marginTop: "0.5rem", marginBottom: 0, paddingLeft: "1.4rem" }}>
                    {leerlingData.startopdracht.stappen.map((s, i) => (
                      <li key={i} style={{ marginBottom: "0.25rem", whiteSpace: "pre-wrap" }}>
                        {s}
                      </li>
                    ))}
                  </ol>
                )}
            </div>
          )}
        </div>
      )}

      {leerlingData.bronnenblad && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.9rem" }}>
          <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>Bronnenblad</h2>
          {leerlingData.bronnenblad.instructie && (
            <RenderLines text={leerlingData.bronnenblad.instructie} />
          )}
          {Array.isArray(leerlingData.bronnenblad.bronNummering) &&
            leerlingData.bronnenblad.bronNummering.length > 0 && (
              <ul style={{ marginTop: "0.6rem", marginBottom: 0, paddingLeft: "1.2rem" }}>
                {leerlingData.bronnenblad.bronNummering.map((b) => (
                  <li key={b.nummer} style={{ marginBottom: "0.25rem" }}>
                    <strong>Bron {b.nummer}:</strong> {b.label || `id ${String(b.id)}`}{" "}
                    {b.provider ? `(${b.provider})` : ""}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}

      {bronvragen.length > 0 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.9rem" }}>
          <h2 style={{ margin: 0, marginBottom: "0.6rem", fontSize: "1rem" }}>
            Bronvragen + voorbeeldantwoorden (integraal)
          </h2>

          {bronvragen.map((blok) => (
            <div key={`${blok.bronNummer}-${String(blok.bronId)}`} style={{ marginBottom: "1rem" }}>
              <div style={{ fontWeight: 800, marginBottom: "0.4rem" }}>
                Bron {blok.bronNummer}
              </div>

              {Array.isArray(blok.qa) && blok.qa.length > 0 ? (
                <ol style={{ margin: 0, paddingLeft: "1.4rem" }}>
                  {blok.qa.map((qa) => (
                    <li key={qa.nummer} style={{ marginBottom: "0.6rem" }}>
                      <div style={{ fontWeight: 700, whiteSpace: "pre-wrap" }}>
                        {qa.nummer}. {qa.vraag}
                      </div>
                      <div style={{ marginTop: "0.2rem", whiteSpace: "pre-wrap" }}>
                        {qa.antwoord}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div style={{ color: "#555" }}>Geen QA gevonden bij deze bron.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tabelRijen.length > 0 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.9rem" }}>
          <h2 style={{ margin: 0, marginBottom: "0.6rem", fontSize: "1rem" }}>
            Samenwerkingstabel (ingevuld)
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                minWidth: "900px",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr>
                  {["Bron", "Wie spreekt", "Observatie", "Interpretatie", "Dimensie", "Subdimensie"].map((k) => (
                    <th key={k} style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabelRijen.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem", fontWeight: 700 }}>
                      {r.bron || `Bron ${idx + 1}`}
                    </td>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem", whiteSpace: "pre-wrap" }}>
                      {r.wieSpreekt || ""}
                    </td>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem", whiteSpace: "pre-wrap" }}>
                      {r.observatie || ""}
                    </td>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem", whiteSpace: "pre-wrap" }}>
                      {r.interpretatie || ""}
                    </td>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem", whiteSpace: "pre-wrap" }}>
                      {r.dimensie || ""}
                    </td>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem", whiteSpace: "pre-wrap" }}>
                      {r.subdimensie || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(leerlingData.reflectie?.instructie || reflectieAntwoorden.length > 0) && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.9rem" }}>
          <h2 style={{ margin: 0, marginBottom: "0.6rem", fontSize: "1rem" }}>Reflectie (met antwoorden)</h2>

          {leerlingData.reflectie?.instructie && (
            <div style={{ marginBottom: "0.6rem" }}>
              <RenderLines text={leerlingData.reflectie.instructie} />
            </div>
          )}

          {reflectieAntwoorden.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: "1.4rem" }}>
              {reflectieAntwoorden.map((a) => (
                <li key={a.nummer} style={{ marginBottom: "0.8rem" }}>
                  {a.vraag ? (
                    <div style={{ fontWeight: 700, whiteSpace: "pre-wrap" }}>
                      {a.nummer}. {a.vraag}
                    </div>
                  ) : null}
                  <div style={{ marginTop: "0.2rem", whiteSpace: "pre-wrap" }}>{a.antwoord}</div>
                </li>
              ))}
            </ol>
          ) : (
            <div style={{ color: "#555" }}>Geen reflectie-antwoorden gevonden.</div>
          )}
        </div>
      )}
    </div>
  );
}


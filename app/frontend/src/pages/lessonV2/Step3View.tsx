import React from "react";

type Props = {
  status?: "idle" | "loading" | "done" | "error" | string;
  error?: string | null;
  step3?: any;
};

function Box({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "0.9rem",
        background: "white",
      }}
    >
      {title ? <h2 style={{ margin: 0, marginBottom: "0.6rem", fontSize: "1rem" }}>{title}</h2> : null}
      {children}
    </div>
  );
}

export default function Step3View({ status, error, step3 }: Props) {
  if (status === "idle") {
    return <div style={{ color: "#555", fontSize: "0.95rem" }}>Klik op “Genereer Step 3” om het bronnenblad te maken.</div>;
  }

  if (status === "loading") {
    return <div>Step 3 wordt gemaakt…</div>;
  }

  if (error) {
    return (
      <div style={{ marginTop: "0.75rem", color: "#a10000", background: "#ffe5e5", padding: "0.75rem", borderRadius: "0.6rem" }}>
        {error}
      </div>
    );
  }

  const bronnenblad = step3?.data?.bronnenblad || null;
  const instructie = typeof bronnenblad?.instructie === "string" ? bronnenblad.instructie : "";
  const bronnen = Array.isArray(bronnenblad?.bronnen) ? bronnenblad.bronnen : [];

  if (!bronnenblad) {
    return <div style={{ color: "#555" }}>Geen Step 3 data om te tonen.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <Box title="Bronnenblad">
        {instructie ? <p style={{ marginTop: 0, whiteSpace: "pre-wrap" }}>{instructie}</p> : null}

        {bronnen.length === 0 ? (
          <div style={{ color: "#555" }}>Geen bronnen gevonden.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Nr", "Titel/label", "Provider", "Type", "Link"].map((k) => (
                    <th
                      key={k}
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #e5e7eb",
                        padding: "0.5rem",
                        fontSize: "0.95rem",
                      }}
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bronnen.map((b: any, i: number) => {
                  const nr = b?.nummer ?? i + 1;
                  const label = b?.label || b?.title || `Bron ${nr}`;
                  const provider = b?.provider || "—";
                  const type = b?.type || "—";
                  const url = b?.url || null;

                  return (
                    <tr key={`${nr}-${String(b?.id ?? i)}`}>
                      <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem", fontWeight: 800 }}>
                        {nr}
                      </td>
                      <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem", whiteSpace: "pre-wrap" }}>
                        {label}
                      </td>
                      <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem" }}>{provider}</td>
                      <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem" }}>{type}</td>
                      <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.5rem" }}>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Box>

      <Box title="Gebruik in opdrachten">
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>Verwijs altijd als: <strong>Bron 1</strong>, <strong>Bron 2</strong>, enz.</li>
          <li>Laat leerlingen nooit een URL opschrijven; alleen bronnummer + wat ze zagen/ lazen.</li>
        </ul>
      </Box>
    </div>
  );
}


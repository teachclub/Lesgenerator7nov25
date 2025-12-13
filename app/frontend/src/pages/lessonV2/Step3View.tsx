import React from "react";

type Props = {
  status?: "idle" | "loading" | "done" | "error" | string;
  error?: string | null;
  step3?: any;
};

function normStr(x: any) {
  return typeof x === "string" ? x.trim() : "";
}

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

function Chip({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: "999px",
        border: "1px solid #e5e7eb",
        background: "#fafafa",
        fontSize: "0.85rem",
        marginRight: "0.4rem",
        marginBottom: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function proxiedImageSrc(url: string) {
  const u = normStr(url);
  if (!u) return "";
  if (u.startsWith("data:")) return u;
  return `/api/image-proxy?url=${encodeURIComponent(u)}`;
}

function pickText(b: any) {
  return (
    normStr(b?.tekst) ||
    normStr(b?.fullText) ||
    normStr(b?.content) ||
    normStr(b?.description) ||
    ""
  );
}

export default function Step3View({ status, error, step3 }: Props) {
  if (status === "idle") return <div style={{ color: "#555" }}>Klik op “Genereer Step 3”.</div>;
  if (status === "loading") return <div>Step 3 wordt opgebouwd…</div>;

  if (error) {
    return (
      <div style={{ marginTop: "0.75rem", color: "#a10000", background: "#ffe5e5", padding: "0.75rem", borderRadius: "0.6rem" }}>
        {error}
      </div>
    );
  }

  const bronnenblad = step3?.data?.bronnenblad || null;
  const instructie = normStr(bronnenblad?.instructie);
  const bronNummering = Array.isArray(bronnenblad?.bronNummering) ? bronnenblad.bronNummering : [];

  if (!bronnenblad || bronNummering.length === 0) {
    return <div style={{ color: "#555" }}>Geen Step 3 data om te tonen.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <Box title="Bronnenblad">
        {instructie ? <p style={{ marginTop: 0, whiteSpace: "pre-wrap" }}>{instructie}</p> : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {bronNummering.map((b: any, idx: number) => {
            const nummer = b?.nummer ?? idx + 1;
            const titel = normStr(b?.titel) || normStr(b?.label) || "";
            const provider = normStr(b?.provider);
            const type = normStr(b?.type);
            const url = b?.url ? String(b.url) : "";
            const imageUrl = b?.imageUrl ? String(b.imageUrl) : "";
            const tekst = pickText(b);

            const isKleio =
              !!b?.isKleio ||
              provider.toLowerCase().includes("kleio") ||
              url.toLowerCase().includes("vgnkleio") ||
              url.toLowerCase().includes("kleio");

            return (
              <div key={`${nummer}-${String(b?.id ?? idx)}`} style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>
                    Bron {nummer}
                    {titel ? ` — ${titel}` : ""}
                  </div>

                  <div>
                    {provider ? <Chip text={provider} /> : null}
                    {type ? <Chip text={type} /> : null}
                  </div>
                </div>

                {isKleio && url ? (
                  <div style={{ marginTop: "0.35rem" }}>
                    <a href={url} target="_blank" rel="noreferrer">
                      Origineel (Kleio)
                    </a>
                  </div>
                ) : null}

                {imageUrl ? (
                  <div style={{ marginTop: "0.6rem" }}>
                    <img
                      src={proxiedImageSrc(imageUrl)}
                      alt={titel ? titel : `Bron ${nummer}`}
                      style={{ maxWidth: "100%", borderRadius: "0.6rem", border: "1px solid #eee" }}
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                      }}
                    />
                    <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                      Afbeelding via proxy
                    </div>
                  </div>
                ) : null}

                {tekst ? (
                  <p style={{ marginTop: "0.6rem", marginBottom: 0, whiteSpace: "pre-wrap" }}>{tekst}</p>
                ) : (
                  <p style={{ marginTop: "0.6rem", marginBottom: 0, color: "#666" }}>Geen tekst gevonden bij deze bron.</p>
                )}
              </div>
            );
          })}
        </div>
      </Box>
    </div>
  );
}


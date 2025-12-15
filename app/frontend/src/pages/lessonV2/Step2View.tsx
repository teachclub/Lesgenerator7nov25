import React, { useMemo } from "react";

type Props = {
  status?: "idle" | "loading" | "done" | "error" | string;
  error?: string | null;
  leerlingData?: any;
};

function isObj(x: any) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function toText(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);

  if (isObj(v)) {
    if (typeof v.vraag === "string") return v.vraag;
    if (typeof v.tekst === "string") return v.tekst;
    if (typeof v.text === "string") return v.text;
    if (typeof v.beschrijving === "string") return v.beschrijving;
    if (typeof v.description === "string") return v.description;
    if (typeof v.label === "string") return v.label;
  }

  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toStringArray(x: any): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map((v) => toText(v)).filter(Boolean);
  return [];
}

function Box({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "0.9rem",
        background: "white",
      }}
    >
      {title ? (
        <h2 style={{ margin: 0, marginBottom: "0.6rem", fontSize: "1rem" }}>
          {title}
        </h2>
      ) : null}
      {children}
    </div>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.5rem",
        borderRadius: "999px",
        border: "1px solid #e5e7eb",
        background: "#fafafa",
        fontSize: "0.9rem",
        marginRight: "0.4rem",
        marginBottom: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function RenderBlock({ value }: { value: any }) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    return <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{t}</p>;
  }

  if (Array.isArray(value)) {
    const items = value.map((x) => toText(x)).filter(Boolean);
    if (!items.length) return null;
    return (
      <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
        {items.map((t, i) => (
          <li key={i} style={{ marginBottom: "0.25rem", whiteSpace: "pre-wrap" }}>
            {t}
          </li>
        ))}
      </ul>
    );
  }

  if (isObj(value)) {
    const beschrijving =
      (typeof value.beschrijving === "string" && value.beschrijving) ||
      (typeof value.description === "string" && value.description) ||
      "";

    const stappenRaw = value.stappen || value.steps;
    const stappen = Array.isArray(stappenRaw)
      ? stappenRaw.map((x: any) => toText(x)).filter(Boolean)
      : [];

    return (
      <div>
        {beschrijving ? (
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{beschrijving}</p>
        ) : null}

        {stappen.length ? (
          <ol style={{ marginTop: "0.5rem", marginBottom: 0, paddingLeft: "1.4rem" }}>
            {stappen.map((t: string, i: number) => (
              <li key={i} style={{ marginBottom: "0.25rem", whiteSpace: "pre-wrap" }}>
                {t}
              </li>
            ))}
          </ol>
        ) : null}

        {!beschrijving && !stappen.length ? (
          <pre
            style={{
              margin: 0,
              padding: "0.75rem",
              borderRadius: "0.6rem",
              background: "#f6f6f6",
              overflowX: "auto",
              fontSize: "0.85rem",
            }}
          >
            {toText(value)}
          </pre>
        ) : null}
      </div>
    );
  }

  return <p style={{ margin: 0 }}>{toText(value)}</p>;
}

function AnswerLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="print-only answer-lines">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="answer-line" />
      ))}
    </div>
  );
}

function CellLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="print-only cell-lines">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="cell-line" />
      ))}
    </div>
  );
}

type BronVragenGroup = {
  bronNummer: number;
  vragen: string[];
};

function normalizeBronvragen(raw: any): BronVragenGroup[] {
  const arr = Array.isArray(raw) ? raw : [];

  const groups: BronVragenGroup[] = arr
    .map((g: any) => {
      const bn = Number(g?.bronNummer ?? g?.bronnummer ?? g?.bron ?? g?.nummer ?? 0);

      const rawVragen = g?.vragen ?? g?.bronvragen ?? g?.questions ?? [];
      const vragenArr = Array.isArray(rawVragen) ? rawVragen : [];

      const vragen = vragenArr
        .map((x: any) => {
          if (typeof x === "string") return x;
          if (isObj(x) && typeof x.vraag === "string") return x.vraag;
          return toText(x);
        })
        .filter((s: string) => String(s || "").trim().length > 0);

      return { bronNummer: Number.isFinite(bn) ? bn : 0, vragen };
    })
    .filter((g: BronVragenGroup) => g.bronNummer >= 1);

  groups.sort((a, b) => a.bronNummer - b.bronNummer);
  return groups;
}

function extractChoicesPerKolom(invultabel: any): Record<string, string[]> {
  const out: Record<string, string[]> = {};

  const mk = invultabel?.meerkeuze ?? invultabel?.multipleChoice ?? null;

  const byKolom =
    (isObj(mk?.keuzesPerKolom) && mk.keuzesPerKolom) ||
    (isObj(invultabel?.keuzesPerKolom) && invultabel.keuzesPerKolom) ||
    null;

  if (byKolom) {
    for (const k of Object.keys(byKolom)) {
      const arr = toStringArray(byKolom[k]);
      if (arr.length) out[k] = arr;
    }
  }

  const legacyWho = toStringArray(mk?.wieSpreektOpties ?? mk?.speakers ?? mk?.whoSpeaksOptions);
  const legacyDim = toStringArray(mk?.dimensieOpties ?? mk?.dimensions ?? mk?.dimensionOptions);
  const legacySub = toStringArray(mk?.subdimensieOpties ?? mk?.subdimensions ?? mk?.subdimensionOptions);

  if (legacyWho.length) out["Wie spreekt in de bron?"] = legacyWho;
  if (legacyDim.length) out["Dimensie"] = legacyDim;
  if (legacySub.length) out["Subdimensie / soort verklaring"] = legacySub;

  return out;
}

function renderInvulTabel(invultabel: any, defaultRows: string[]) {
  const kolommenRaw = invultabel?.kolommen ?? invultabel?.columns ?? [];
  const kolommen = Array.isArray(kolommenRaw)
    ? kolommenRaw.map((x: any) => toText(x)).filter(Boolean)
    : [];

  const rijenRaw = invultabel?.rijen ?? invultabel?.rows ?? null;
  const rijen =
    Array.isArray(rijenRaw) && rijenRaw.length
      ? rijenRaw.map((x: any) => toText(x)).filter(Boolean)
      : defaultRows.length
        ? defaultRows
        : ["Invullen"];

  if (!kolommen.length) {
    return <RenderBlock value={invultabel} />;
  }

  return (
    <div className="print-invultabel-wrap" style={{ overflowX: "auto" }}>
      <table className="print-table print-invultabel" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {kolommen.map((k: string, i: number) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "0.5rem",
                  fontSize: "0.95rem",
                  whiteSpace: "normal",
                }}
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rijen.map((r: string, ri: number) => (
            <tr key={ri}>
              {kolommen.map((_, ci) => (
                <td
                  key={ci}
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "0.5rem",
                    verticalAlign: "top",
                    color: ci === 0 ? "#111" : "#666",
                    fontWeight: ci === 0 ? 700 : 400,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {ci === 0 ? r : ""}
                  {ci !== 0 ? <CellLines lines={3} /> : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Step2View({ status, error, leerlingData }: Props) {
  const bronvragenGroups = useMemo(() => {
    return normalizeBronvragen(leerlingData?.bronvragen);
  }, [leerlingData]);

  const numbered = useMemo(() => {
    let q = 1;
    return bronvragenGroups.map((g) => {
      const start = q;
      const vragen = g.vragen.map((text) => ({ n: q++, text }));
      const end = vragen.length ? vragen[vragen.length - 1].n : start - 1;
      return { bronNummer: g.bronNummer, start, end, vragen };
    });
  }, [bronvragenGroups]);

  const totaalVragen = useMemo(() => {
    return numbered.reduce((acc, g) => acc + g.vragen.length, 0);
  }, [numbered]);

  if (status === "idle") {
    return (
      <div style={{ color: "#555", fontSize: "0.95rem" }}>
        Klik op “Genereer Step 2” om het leerlingmateriaal te maken.
      </div>
    );
  }

  if (status === "loading") {
    return <div>Step 2 wordt gegenereerd…</div>;
  }

  if (error) {
    return (
      <div
        style={{
          marginTop: "0.75rem",
          color: "#a10000",
          background: "#ffe5e5",
          padding: "0.75rem",
          borderRadius: "0.6rem",
        }}
      >
        {error}
      </div>
    );
  }

  if (!leerlingData) {
    return <div style={{ color: "#555" }}>Geen Step 2 data om te tonen.</div>;
  }

  const introVal =
    leerlingData.antiPresentismeIntro ||
    leerlingData.antiPresentisme ||
    leerlingData.intro ||
    "";

  const startopdrachtVal =
    leerlingData.startopdracht || leerlingData.startOpdracht || null;

  const invultabelVal =
    leerlingData.samenwerkingstabel ||
    leerlingData.samenwerkingsTabel ||
    leerlingData.invultabel ||
    leerlingData.invulTabel ||
    leerlingData.meerkeuzeInvultabel ||
    null;

  const reflectieVal = leerlingData.reflectie;

  const reflectieInstructie =
    (typeof reflectieVal?.instructie === "string" && reflectieVal.instructie) ||
    "";

  const reflectieVragen = Array.isArray(reflectieVal?.vragen)
    ? reflectieVal.vragen.map((x: any) => toText(x)).filter(Boolean)
    : Array.isArray(reflectieVal)
      ? reflectieVal.map((x: any) => toText(x)).filter(Boolean)
      : [];

  const defaultRowsFromBronnen = bronvragenGroups.map((g) => `Bron ${g.bronNummer}`);

  const keuzesPerKolom = extractChoicesPerKolom(invultabelVal);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {(introVal || startopdrachtVal) && (
        <Box title="Start">
          {introVal ? <RenderBlock value={introVal} /> : null}
          {startopdrachtVal ? (
            <div style={{ marginTop: introVal ? "0.6rem" : 0 }}>
              <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>
                Startopdracht
              </div>
              <RenderBlock value={startopdrachtVal} />
            </div>
          ) : null}
        </Box>
      )}

      <Box title={`Bronvragen (doorlopend genummerd) — totaal ${totaalVragen}`}>
        {numbered.length === 0 ? (
          <div style={{ color: "#555" }}>Geen bronvragen gevonden in step2-data.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {numbered.map((g, idx) => (
              <div key={`${g.bronNummer}-${idx}`}>
                <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>
                  Bron {g.bronNummer}
                  {g.vragen.length ? (
                    <span style={{ fontWeight: 600, color: "#555" }}>
                      {" "}
                      (vragen {g.start}–{g.end})
                    </span>
                  ) : null}
                </div>

                {g.vragen.length === 0 ? (
                  <div style={{ color: "#555" }}>Geen vragen bij deze bron.</div>
                ) : (
                  <ol
                    style={{
                      marginTop: 0,
                      marginBottom: 0,
                      paddingLeft: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    {g.vragen.map((q) => (
                      <li key={`${g.bronNummer}-${q.n}`}>
                        <div>
                          <span style={{ fontWeight: 800, marginRight: "0.4rem" }}>
                            {q.n}.
                          </span>
                          <span style={{ whiteSpace: "pre-wrap" }}>{q.text}</span>
                        </div>
                        <AnswerLines lines={3} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </Box>

      {invultabelVal ? (
        <div className="print-break-before">
          <Box title={invultabelVal?.titel || "Invultabel (meerkeuze)"}>
            {invultabelVal?.instructie ? (
              <div style={{ marginBottom: "0.75rem" }}>
                <RenderBlock value={invultabelVal.instructie} />
              </div>
            ) : null}

            {renderInvulTabel(invultabelVal, defaultRowsFromBronnen)}

            <div style={{ marginTop: "0.9rem" }}>
              <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>
                Keuzes om te gebruiken (per categorie)
              </div>

              {Object.keys(keuzesPerKolom).length === 0 ? (
                <div style={{ color: "#555" }}>
                  Geen keuzes gevonden in Step 2 data (keuzes/opties ontbreken).
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {Object.entries(keuzesPerKolom).map(([cat, opties]) => (
                    <div key={cat}>
                      <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>
                        {cat}
                      </div>
                      <div>
                        {opties.map((o, i) => (
                          <Chip key={`${cat}-${i}`} text={o} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Box>
        </div>
      ) : null}

      {(reflectieInstructie || reflectieVragen.length > 0) && (
        <div className="print-break-before">
          <Box title="Reflectie">
            {reflectieInstructie ? (
              <div style={{ marginBottom: "0.6rem" }}>
                <RenderBlock value={reflectieInstructie} />
              </div>
            ) : null}
            {reflectieVragen.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: "1.4rem" }}>
                {reflectieVragen.map((r, i) => (
                  <li key={i} style={{ marginBottom: "0.5rem", whiteSpace: "pre-wrap" }}>
                    {r}
                    <AnswerLines lines={3} />
                  </li>
                ))}
              </ol>
            ) : null}
          </Box>
        </div>
      )}
    </div>
  );
}


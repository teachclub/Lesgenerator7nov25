import React from "react";

type Step1HoofdvraagAntwoord = {
  vraag?: string;
  antwoord?: string;
  gebruikteBronNummers?: number[];
};

type Step1DeelvraagAntwoord = {
  vraag?: string;
  antwoord?: string;
  gebruikteBronNummers?: number[];
};

type Step1DocentData = {
  wat?: string;
  hoe?: string;
  waarom?: string;

  // v7.1 (nieuw)
  globaalAntwoord?: Step1HoofdvraagAntwoord;

  // (oude/compat)
  hoofdvraagAntwoord?: Step1HoofdvraagAntwoord;

  deelvragen?: string[];

  bronverwijzingenPerDeelvraag?: {
    deelvraag?: string;
    bronnen?: number[];
  }[];

  deelantwoorden?: Step1DeelvraagAntwoord[];

  lesfasen?: {
    fase?: string;
    tijd?: string;
    doel?: string;
    activiteit?: string;
    werkvorm?: string;
  }[];
};

function uniqInts(arr: unknown, maxN?: number): number[] {
  if (!Array.isArray(arr)) return [];
  const out: number[] = [];
  for (const v of arr) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1 && (typeof maxN !== "number" || n <= maxN)) {
      out.push(n);
    }
  }
  return [...new Set(out)];
}

function pickHoofdantwoord(docentData: Step1DocentData): Step1HoofdvraagAntwoord | null {
  return (docentData.globaalAntwoord ||
    docentData.hoofdvraagAntwoord ||
    null) as Step1HoofdvraagAntwoord | null;
}

function pickDeelvragen(docentData: Step1DocentData, fallback: string[]): string[] {
  const dv = Array.isArray(docentData.deelvragen) ? docentData.deelvragen : [];
  if (dv.length > 0) return dv.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
  return (fallback || []).filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
}

function bronnenVoorDeelvraag(
  docentData: Step1DocentData,
  deelvraagText: string,
  idx: number
): number[] {
  const lijst = Array.isArray(docentData.bronverwijzingenPerDeelvraag)
    ? docentData.bronverwijzingenPerDeelvraag
    : [];

  // 1) eerst exact match op tekst
  const hit = lijst.find((x) => (x?.deelvraag || "").trim() === deelvraagText.trim());
  if (hit) return uniqInts(hit.bronnen);

  // 2) anders index-match
  const byIdx = lijst[idx];
  if (byIdx) return uniqInts(byIdx.bronnen);

  return [];
}

function deelantwoordVoorDeelvraag(
  docentData: Step1DocentData,
  deelvraagText: string,
  idx: number
): Step1DeelvraagAntwoord | null {
  const arr = Array.isArray(docentData.deelantwoorden) ? docentData.deelantwoorden : [];

  // 1) exact match op vraag
  const hit = arr.find((x) => (x?.vraag || "").trim() === deelvraagText.trim());
  if (hit) return hit;

  // 2) anders index
  const byIdx = arr[idx];
  if (byIdx) return byIdx;

  return null;
}

export default function Step1View({
  docentData,
  deelvragenFromStep1,
  loading,
  error,
}: {
  docentData: Step1DocentData | null;
  deelvragenFromStep1: string[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <p>Docentmateriaal wordt geladen…</p>;

  if (error) {
    return (
      <div
        style={{
          color: "#a10000",
          backgroundColor: "#ffe5e5",
          padding: "0.5rem",
          borderRadius: "0.5rem",
        }}
      >
        Fout bij Step 1: {error}
      </div>
    );
  }

  if (!docentData) return <p>Geen docentmateriaal gevonden in de response.</p>;

  const hoofd = pickHoofdantwoord(docentData);
  const deelvragen = pickDeelvragen(docentData, deelvragenFromStep1);

  return (
    <div style={{ fontSize: "0.9rem" }}>
      {(docentData.wat || docentData.hoe || docentData.waarom) && (
        <>
          {docentData.wat && (
            <>
              <h3 style={{ fontSize: "0.95rem" }}>WAT</h3>
              <p>{docentData.wat}</p>
            </>
          )}
          {docentData.hoe && (
            <>
              <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>HOE</h3>
              <p>{docentData.hoe}</p>
            </>
          )}
          {docentData.waarom && (
            <>
              <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>WAAROM</h3>
              <p>{docentData.waarom}</p>
            </>
          )}
        </>
      )}

      {hoofd && (hoofd.vraag || hoofd.antwoord) && (
        <>
          <h3 style={{ fontSize: "0.95rem", marginTop: "0.9rem" }}>
            Hoofdvraag + globaal antwoord
          </h3>
          {hoofd.vraag && (
            <p>
              <strong>{hoofd.vraag}</strong>
            </p>
          )}
          {hoofd.antwoord && <p>{hoofd.antwoord}</p>}
          <p style={{ fontSize: "0.85rem", color: "#444" }}>
            <em>Bronnen: {uniqInts(hoofd.gebruikteBronNummers).join(", ") || "—"}</em>
          </p>
        </>
      )}

      {deelvragen.length > 0 && (
        <>
          <h3 style={{ fontSize: "0.95rem", marginTop: "0.9rem" }}>Deelvragen (exact 4)</h3>
          <ol>
            {deelvragen.map((dv, idx) => {
              const da = deelantwoordVoorDeelvraag(docentData, dv, idx);
              const bronnen =
                uniqInts(da?.gebruikteBronNummers).length > 0
                  ? uniqInts(da?.gebruikteBronNummers)
                  : bronnenVoorDeelvraag(docentData, dv, idx);

              return (
                <li key={idx} style={{ marginBottom: "0.75rem" }}>
                  <div>
                    <strong>{dv}</strong>
                  </div>

                  {da?.antwoord ? (
                    <div style={{ marginTop: "0.25rem" }}>{da.antwoord}</div>
                  ) : null}

                  <div style={{ fontSize: "0.85rem", color: "#444", marginTop: "0.15rem" }}>
                    <em>Bronnen: {bronnen.join(", ") || "—"}</em>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {docentData.lesfasen && docentData.lesfasen.length > 0 && (
        <>
          <h3 style={{ fontSize: "0.95rem", marginTop: "0.9rem" }}>Globale lesfasen</h3>
          <ul>
            {docentData.lesfasen.map((fase, idx) => (
              <li key={idx} style={{ marginBottom: "0.25rem" }}>
                <strong>{fase.fase || `Fase ${idx + 1}`}</strong>
                {fase.tijd ? ` – ${fase.tijd}` : ""}
                {fase.doel && (
                  <>
                    <br />
                    Doel: {fase.doel}
                  </>
                )}
                {fase.activiteit && (
                  <>
                    <br />
                    Activiteit: {fase.activiteit}
                  </>
                )}
                {fase.werkvorm && (
                  <>
                    <br />
                    Werkvorm: {fase.werkvorm}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}


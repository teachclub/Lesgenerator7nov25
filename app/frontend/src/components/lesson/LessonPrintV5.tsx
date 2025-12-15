import React, { useMemo, useRef, useState } from "react";

function isObj(x: any) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function normStr(x: any) {
  return typeof x === "string" ? x.trim() : "";
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

function proxiedImageSrc(url: string) {
  const u = normStr(url);
  if (!u) return "";
  if (u.startsWith("data:")) return u;
  return `/api/image-proxy?url=${encodeURIComponent(u)}`;
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

function pickTextFromSource(s: any) {
  return (
    normStr(s?.tekst) ||
    normStr(s?.fullText) ||
    normStr(s?.content) ||
    normStr(s?.description) ||
    ""
  );
}

function buildBronnenlijst(step3: any, sources: any[]) {
  const bronNummering = Array.isArray(step3?.data?.bronnenblad?.bronNummering)
    ? step3.data.bronnenblad.bronNummering
    : null;

  if (bronNummering && bronNummering.length) {
    return bronNummering.map((b: any, idx: number) => {
      const nummer = Number(b?.nummer ?? idx + 1);
      const titel = normStr(b?.titel) || normStr(b?.label) || "";
      const provider = normStr(b?.provider) || "";
      const type = normStr(b?.type) || "";
      const url = b?.url ? String(b.url) : "";
      const imageUrl = b?.imageUrl ? String(b.imageUrl) : "";
      const tekst = pickTextFromSource(b);
      const id = b?.id ?? `${nummer}-${idx}`;
      return { nummer, id, titel, provider, type, url, imageUrl, tekst };
    });
  }

  return (Array.isArray(sources) ? sources : []).map((s: any, idx: number) => {
    const nummer = idx + 1;
    const titel = normStr(s?.title) || normStr(s?.titel) || "";
    const provider = normStr(s?.provider) || "";
    const type = normStr(s?.type) || "";
    const url = s?.url ? String(s.url) : "";
    const imageUrl = s?.imageUrl ? String(s.imageUrl) : "";
    const tekst = pickTextFromSource(s);
    const id = s?.id ?? `${nummer}-${idx}`;
    return { nummer, id, titel, provider, type, url, imageUrl, tekst };
  });
}

function WritingLines({ n = 3 }: { n?: number }) {
  const lines = Array.from({ length: Math.max(1, n) });
  return (
    <div className="p-write">
      {lines.map((_, i) => (
        <div key={i} className="p-line" />
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="p-h2">{children}</h2>;
}

export default function LessonPrintV5({
  tvKa,
  concept,
  sources,
  step1,
  step2,
  step3,
  step4,
}: {
  tvKa?: any;
  concept?: any;
  sources?: any[];
  step1?: any;
  step2?: any;
  step3?: any;
  step4?: any;
}) {
  const printRef = useRef<HTMLDivElement | null>(null);

  const [opt, setOpt] = useState({
    step1: true,
    step2: true,
    step3: true,
    step4: true,
  });

  const docent = step1?.data?.docent || null;
  const leerling2 = step2?.data?.leerling || null;
  const leerling4 = step4?.data?.leerling || null;

  const bronvragenGroups = useMemo(() => normalizeBronvragen(leerling2?.bronvragen), [leerling2]);
  const numbered = useMemo(() => {
    let q = 1;
    return bronvragenGroups.map((g) => {
      const start = q;
      const vragen = g.vragen.map((text) => ({ n: q++, text }));
      const end = vragen.length ? vragen[vragen.length - 1].n : start - 1;
      return { bronNummer: g.bronNummer, start, end, vragen };
    });
  }, [bronvragenGroups]);

  const invultabelVal =
    leerling2?.samenwerkingstabel ||
    leerling2?.samenwerkingsTabel ||
    leerling2?.invultabel ||
    leerling2?.invulTabel ||
    leerling2?.meerkeuzeInvultabel ||
    null;

  const keuzesPerKolom = useMemo(() => extractChoicesPerKolom(invultabelVal), [invultabelVal]);

  const bronnenlijst = useMemo(() => buildBronnenlijst(step3, Array.isArray(sources) ? sources : []), [step3, sources]);

  const metaLine = useMemo(() => {
    const tvLabel = normStr(tvKa?.tvLabel);
    const kaLabel = normStr(tvKa?.kaLabel);
    const parts = [tvLabel, kaLabel].filter(Boolean);
    return parts.join(" · ");
  }, [tvKa]);

  const handlePrint = () => {
    window.print();
  };

  const renderInvulTabelBlank = () => {
    if (!invultabelVal) return null;

    const kolommenRaw = invultabelVal?.kolommen ?? invultabelVal?.columns ?? [];
    const kolommen = Array.isArray(kolommenRaw)
      ? kolommenRaw.map((x: any) => toText(x)).filter(Boolean)
      : [];

    const rijenRaw = invultabelVal?.rijen ?? invultabelVal?.rows ?? null;
    const defaultRows = bronnenlijst.map((b) => `Bron ${b.nummer}`);
    const rijen =
      Array.isArray(rijenRaw) && rijenRaw.length
        ? rijenRaw.map((x: any) => toText(x)).filter(Boolean)
        : defaultRows.length
          ? defaultRows
          : ["Invullen"];

    if (!kolommen.length) {
      return (
        <div className="p-box">
          <div className="p-muted">Invultabel heeft geen kolommen-structuur in Step 2 data.</div>
          <pre className="p-pre">{JSON.stringify(invultabelVal, null, 2)}</pre>
        </div>
      );
    }

    return (
      <div className="p-avoid-split">
        {invultabelVal?.instructie ? (
          <div className="p-box p-small">
            <div className="p-bold">Instructie</div>
            <div className="p-prelike">{toText(invultabelVal.instructie)}</div>
          </div>
        ) : null}

        <div className="p-tablewrap">
          <table className="p-table p-table-big">
            <thead>
              <tr>
                {kolommen.map((k: string, i: number) => (
                  <th key={i}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rijen.map((r: string, ri: number) => (
                <tr key={ri}>
                  {kolommen.map((_, ci) => (
                    <td key={ci} className={ci === 0 ? "p-cell-label" : "p-cell-write"}>
                      {ci === 0 ? r : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-choices">
          <div className="p-bold">Keuzes om te gebruiken</div>
          {Object.keys(keuzesPerKolom).length === 0 ? (
            <div className="p-muted">Geen keuzes gevonden in Step 2 data.</div>
          ) : (
            <div className="p-choices-grid">
              {Object.entries(keuzesPerKolom).map(([cat, opties]) => (
                <div key={cat} className="p-choices-block p-avoid-split">
                  <div className="p-bold">{cat}</div>
                  <ul className="p-ul">
                    {opties.map((o, i) => (
                      <li key={`${cat}-${i}`}>{o}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep1 = () => {
    if (!docent) {
      return (
        <div className="p-box">
          <div className="p-muted">Step 1 ontbreekt. Genereer Step 1 om docentmateriaal te printen.</div>
        </div>
      );
    }

    const deelvragen = Array.isArray(docent?.deelvragen) ? docent.deelvragen : [];
    const hoofd = docent?.globaalAntwoord || docent?.hoofdvraagAntwoord || null;

    return (
      <div className="p-page">
        <h1 className="p-h1">Step 1 — Docent</h1>

        <div className="p-meta">
          <div className="p-bold">{normStr(concept?.hoofdvraag) ? `Hoofdvraag: ${concept.hoofdvraag}` : ""}</div>
          {metaLine ? <div className="p-muted">{metaLine}</div> : null}
        </div>

        <SectionTitle>WAT</SectionTitle>
        <div className="p-prelike">{toText(docent?.wat) || "—"}</div>

        <SectionTitle>HOE</SectionTitle>
        <div className="p-prelike">{toText(docent?.hoe) || "—"}</div>

        <SectionTitle>WAAROM</SectionTitle>
        <div className="p-prelike">{toText(docent?.waarom) || "—"}</div>

        {hoofd ? (
          <>
            <SectionTitle>Globaal hoofdantwoord</SectionTitle>
            <div className="p-box p-avoid-split">
              <div className="p-bold">{toText(hoofd?.vraag)}</div>
              <div className="p-prelike">{toText(hoofd?.antwoord)}</div>
              <div className="p-muted">
                Bronnen: {uniqInts(hoofd?.gebruikteBronNummers).join(", ") || "—"}
              </div>
            </div>
          </>
        ) : null}

        {deelvragen.length ? (
          <>
            <SectionTitle>Deelvragen</SectionTitle>
            <ol className="p-ol">
              {deelvragen.slice(0, 4).map((dv: string, i: number) => (
                <li key={i}>{dv}</li>
              ))}
            </ol>
          </>
        ) : null}

        {Array.isArray(docent?.deelantwoorden) && docent.deelantwoorden.length ? (
          <>
            <SectionTitle>Globale deelantwoorden</SectionTitle>
            <div className="p-stack">
              {docent.deelantwoorden.map((a: any, i: number) => (
                <div key={i} className="p-box p-avoid-split">
                  <div className="p-bold">{toText(a?.vraag)}</div>
                  <div className="p-prelike">{toText(a?.antwoord)}</div>
                  <div className="p-muted">
                    Bronnen: {uniqInts(a?.gebruikteBronNummers).join(", ") || "—"}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {Array.isArray(docent?.lesfasen) && docent.lesfasen.length ? (
          <>
            <SectionTitle>Lesfasen</SectionTitle>
            <ul className="p-ul">
              {docent.lesfasen.map((f: any, i: number) => (
                <li key={i} className="p-avoid-split">
                  <span className="p-bold">{toText(f?.fase) || `Fase ${i + 1}`}</span>
                  {normStr(f?.tijd) ? ` — ${f.tijd}` : ""}
                  {normStr(f?.doel) ? <div>Doel: {f.doel}</div> : null}
                  {normStr(f?.activiteit) ? <div>Activiteit: {f.activiteit}</div> : null}
                  {normStr(f?.werkvorm) ? <div>Werkvorm: {f.werkvorm}</div> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    );
  };

  const renderStep2 = () => {
    if (!leerling2) {
      return (
        <div className="p-page">
          <h1 className="p-h1">Step 2 — Leerling</h1>
          <div className="p-box">
            <div className="p-muted">Step 2 ontbreekt. Genereer Step 2 om het werkblad te printen.</div>
          </div>
        </div>
      );
    }

    const introVal =
      leerling2.antiPresentismeIntro ||
      leerling2.antiPresentisme ||
      leerling2.intro ||
      "";

    const startopdrachtVal =
      leerling2.startopdracht || leerling2.startOpdracht || null;

    const reflectieVal = leerling2.reflectie;
    const reflectieInstructie =
      (typeof reflectieVal?.instructie === "string" && reflectieVal.instructie) ||
      "";

    const reflectieVragen = Array.isArray(reflectieVal?.vragen)
      ? reflectieVal.vragen.map((x: any) => toText(x)).filter(Boolean)
      : Array.isArray(reflectieVal)
        ? reflectieVal.map((x: any) => toText(x)).filter(Boolean)
        : [];

    return (
      <div className="p-page p-pagebreak">
        <h1 className="p-h1">Step 2 — Leerlingwerkblad</h1>

        <div className="p-meta">
          <div className="p-bold">{normStr(concept?.hoofdvraag) ? `Hoofdvraag: ${concept.hoofdvraag}` : ""}</div>
          {metaLine ? <div className="p-muted">{metaLine}</div> : null}
        </div>

        {(introVal || startopdrachtVal) ? (
          <>
            <SectionTitle>Start</SectionTitle>
            {introVal ? <div className="p-box p-avoid-split"><div className="p-prelike">{toText(introVal)}</div></div> : null}
            {startopdrachtVal ? (
              <div className="p-box p-avoid-split">
                <div className="p-bold">Startopdracht</div>
                <div className="p-prelike">{toText(startopdrachtVal?.beschrijving || startopdrachtVal)}</div>
                {Array.isArray(startopdrachtVal?.stappen) && startopdrachtVal.stappen.length ? (
                  <ol className="p-ol">
                    {startopdrachtVal.stappen.map((s: any, i: number) => (
                      <li key={i}>{toText(s)}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        <SectionTitle>Bronvragen</SectionTitle>
        {numbered.length === 0 ? (
          <div className="p-box">
            <div className="p-muted">Geen bronvragen gevonden in Step 2 data.</div>
          </div>
        ) : (
          <div className="p-stack">
            {numbered.map((g, idx) => (
              <div key={`${g.bronNummer}-${idx}`} className="p-box p-avoid-split">
                <div className="p-bold">
                  Bron {g.bronNummer}
                  {g.vragen.length ? (
                    <span className="p-muted"> (vragen {g.start}–{g.end})</span>
                  ) : null}
                </div>

                {g.vragen.length === 0 ? (
                  <div className="p-muted">Geen vragen bij deze bron.</div>
                ) : (
                  <ol className="p-q">
                    {g.vragen.map((q) => (
                      <li key={`${g.bronNummer}-${q.n}`} className="p-qitem">
                        <div className="p-qtext">
                          <span className="p-qnum">{q.n}.</span>
                          <span>{q.text}</span>
                        </div>
                        <WritingLines n={3} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}

        {invultabelVal ? (
          <>
            <SectionTitle>Invultabel</SectionTitle>
            {renderInvulTabelBlank()}
          </>
        ) : null}

        {(reflectieInstructie || reflectieVragen.length) ? (
          <>
            <SectionTitle>Reflectie</SectionTitle>
            {reflectieInstructie ? (
              <div className="p-box p-avoid-split">
                <div className="p-prelike">{toText(reflectieInstructie)}</div>
              </div>
            ) : null}

            {reflectieVragen.length ? (
              <div className="p-box">
                <ol className="p-q">
                  {reflectieVragen.map((r: string, i: number) => (
                    <li key={i} className="p-qitem p-avoid-split">
                      <div className="p-qtext">
                        <span className="p-qnum">{i + 1}.</span>
                        <span>{r}</span>
                      </div>
                      <WritingLines n={3} />
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  };

  const renderStep3 = () => {
    return (
      <div className="p-page p-pagebreak">
        <h1 className="p-h1">Step 3 — Bronnenblad</h1>

        <div className="p-meta">
          <div className="p-bold">{normStr(concept?.hoofdvraag) ? `Hoofdvraag: ${concept.hoofdvraag}` : ""}</div>
          {metaLine ? <div className="p-muted">{metaLine}</div> : null}
        </div>

        {Array.isArray(step3?.data?.bronnenblad?.instructie) ? null : null}
        {normStr(step3?.data?.bronnenblad?.instructie) ? (
          <div className="p-box p-avoid-split">
            <div className="p-prelike">{step3.data.bronnenblad.instructie}</div>
          </div>
        ) : null}

        <div className="p-stack">
          {bronnenlijst.map((b: any) => {
            const isKleio =
              !!b?.isKleio ||
              normStr(b?.provider).toLowerCase().includes("kleio") ||
              normStr(b?.url).toLowerCase().includes("vgnkleio") ||
              normStr(b?.url).toLowerCase().includes("kleio");

            return (
              <div key={`${b.nummer}-${String(b.id)}`} className="p-source p-avoid-split">
                <div className="p-source-head">
                  <div className="p-bold">
                    Bron {b.nummer}
                    {b.titel ? ` — ${b.titel}` : ""}
                  </div>
                  <div className="p-muted">
                    {[b.provider, b.type].filter(Boolean).join(" · ")}
                  </div>
                </div>

                {isKleio && b.url ? (
                  <div className="p-link">
                    Origineel (Kleio): {b.url}
                  </div>
                ) : null}

                {b.imageUrl ? (
                  <div className="p-imgwrap">
                    <img
                      className="p-img"
                      src={proxiedImageSrc(b.imageUrl)}
                      alt={b.titel ? b.titel : `Bron ${b.nummer}`}
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                      }}
                    />
                  </div>
                ) : null}

                {b.tekst ? (
                  <div className="p-prelike">{b.tekst}</div>
                ) : (
                  <div className="p-muted">Geen tekst gevonden bij deze bron.</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    if (!leerling4) {
      return (
        <div className="p-page p-pagebreak">
          <h1 className="p-h1">Step 4 — Antwoordmodel</h1>
          <div className="p-box">
            <div className="p-muted">Step 4 ontbreekt. Genereer Step 4 om antwoorden te printen.</div>
          </div>
        </div>
      );
    }

    const bronvragen = Array.isArray(leerling4?.bronvragen) ? leerling4.bronvragen : [];
    const reflectieAntwoorden = Array.isArray(leerling4?.reflectie?.antwoorden) ? leerling4.reflectie.antwoorden : [];
    const tabelRijen = Array.isArray(leerling4?.samenwerkingstabel?.rijen) ? leerling4.samenwerkingstabel.rijen : [];

    return (
      <div className="p-page p-pagebreak">
        <h1 className="p-h1">Step 4 — Antwoordmodel</h1>

        <div className="p-meta">
          <div className="p-bold">{normStr(concept?.hoofdvraag) ? `Hoofdvraag: ${concept.hoofdvraag}` : ""}</div>
          {metaLine ? <div className="p-muted">{metaLine}</div> : null}
        </div>

        {bronvragen.length ? (
          <>
            <SectionTitle>Bronvragen + voorbeeldantwoorden</SectionTitle>
            <div className="p-stack">
              {bronvragen.map((blok: any, i: number) => (
                <div key={`${blok?.bronNummer}-${String(blok?.bronId ?? i)}`} className="p-box p-avoid-split">
                  <div className="p-bold">Bron {blok?.bronNummer}</div>
                  {Array.isArray(blok?.qa) && blok.qa.length ? (
                    <ol className="p-ol">
                      {blok.qa.map((qa: any) => (
                        <li key={qa?.nummer} className="p-avoid-split">
                          <div className="p-bold">{toText(qa?.nummer)}. {toText(qa?.vraag)}</div>
                          <div className="p-prelike">{toText(qa?.antwoord)}</div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="p-muted">Geen QA gevonden bij deze bron.</div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tabelRijen.length ? (
          <>
            <SectionTitle>Samenwerkingstabel (ingevuld)</SectionTitle>
            <div className="p-tablewrap">
              <table className="p-table">
                <thead>
                  <tr>
                    {["Bron", "Wie spreekt", "Observatie", "Interpretatie", "Dimensie", "Subdimensie"].map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabelRijen.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-cell-label">{toText(r?.bron || `Bron ${idx + 1}`)}</td>
                      <td className="p-cell">{toText(r?.wieSpreekt)}</td>
                      <td className="p-cell">{toText(r?.observatie)}</td>
                      <td className="p-cell">{toText(r?.interpretatie)}</td>
                      <td className="p-cell">{toText(r?.dimensie)}</td>
                      <td className="p-cell">{toText(r?.subdimensie)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {(leerling4?.reflectie?.instructie || reflectieAntwoorden.length) ? (
          <>
            <SectionTitle>Reflectie (met antwoorden)</SectionTitle>
            {leerling4?.reflectie?.instructie ? (
              <div className="p-box p-avoid-split">
                <div className="p-prelike">{toText(leerling4.reflectie.instructie)}</div>
              </div>
            ) : null}

            {reflectieAntwoorden.length ? (
              <div className="p-box">
                <ol className="p-ol">
                  {reflectieAntwoorden.map((a: any) => (
                    <li key={a?.nummer} className="p-avoid-split">
                      {a?.vraag ? <div className="p-bold">{toText(a.nummer)}. {toText(a.vraag)}</div> : null}
                      <div className="p-prelike">{toText(a?.antwoord)}</div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="p-wrap">
      <div className="p-toolbar no-print">
        <div className="p-toolbar-left">
          <div className="p-toolbar-title">Step 5 — Printset</div>
          <div className="p-toolbar-sub">
            {normStr(concept?.hoofdvraag) ? `Hoofdvraag: ${concept.hoofdvraag}` : ""}
            {metaLine ? ` · ${metaLine}` : ""}
          </div>
        </div>

        <div className="p-toolbar-right">
          <label className="p-toggle">
            <input
              type="checkbox"
              checked={opt.step1}
              onChange={(e) => setOpt((s) => ({ ...s, step1: e.target.checked }))}
            />
            Step 1
          </label>
          <label className="p-toggle">
            <input
              type="checkbox"
              checked={opt.step2}
              onChange={(e) => setOpt((s) => ({ ...s, step2: e.target.checked }))}
            />
            Step 2
          </label>
          <label className="p-toggle">
            <input
              type="checkbox"
              checked={opt.step3}
              onChange={(e) => setOpt((s) => ({ ...s, step3: e.target.checked }))}
            />
            Step 3
          </label>
          <label className="p-toggle">
            <input
              type="checkbox"
              checked={opt.step4}
              onChange={(e) => setOpt((s) => ({ ...s, step4: e.target.checked }))}
            />
            Step 4
          </label>

          <button className="p-btn" onClick={handlePrint}>
            Print
          </button>
        </div>
      </div>

      <div ref={printRef} className="p-doc">
        {opt.step1 ? renderStep1() : null}
        {opt.step2 ? renderStep2() : null}
        {opt.step3 ? renderStep3() : null}
        {opt.step4 ? renderStep4() : null}
      </div>
    </div>
  );
}



import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { labFetch } from "../lib/labFetch";
import LabStatus from "../components/LabStatus";

type Deelvraag = {
  id: number | string;
  subdimensie: string;
  vraag: string;
};

function normStr(x: any) {
  return typeof x === "string" ? x.trim() : "";
}

function takeN<T>(arr: T[], n: number) {
  return Array.isArray(arr) ? arr.slice(0, n) : [];
}

export default function LabSourcesByDimensionPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const disabled = status === "loading";

  const state: any = location.state || {};
  const hoofdvraag: string = state?.hoofdvraag || "";
  const seedSource = state?.seedSource || null;
  const instellingen = state?.instellingen || {};

  const [deelvragen, setDeelvragen] = useState<Deelvraag[]>([]);
  const [bijpromptPerDeelvraag, setBijpromptPerDeelvraag] = useState<Record<string, string>>({});

  const [activeDvId, setActiveDvId] = useState<string>("");

  const [sourcesPerDv, setSourcesPerDv] = useState<Record<string, any[]>>({});
  const [removedPerDv, setRemovedPerDv] = useState<Record<string, Set<number>>>({});
  const [selectedSourceIdxPerDv, setSelectedSourceIdxPerDv] = useState<Record<string, number | null>>({});
  const [sourceDetail, setSourceDetail] = useState<any>(null);

  useEffect(() => {
    const incoming = Array.isArray(state?.deelvragen) ? state.deelvragen : [];
    const normalized: Deelvraag[] = incoming
      .map((dv: any, i: number) => ({
        id: dv?.id ?? i + 1,
        subdimensie: normStr(dv?.subdimensie) || "subdimensie",
        vraag: normStr(dv?.vraag) || ""
      }))
      .filter((dv: Deelvraag) => !!dv.vraag);

    setDeelvragen(normalized);
    setActiveDvId(normalized[0]?.id ? String(normalized[0].id) : "");
  }, [state]);

  async function callWithTimeout(p: Promise<any>, ms = 25000) {
    return Promise.race([
      p,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout (mogelijk Gemini)")), ms))
    ]);
  }

  function updateDvText(id: string, next: string) {
    setDeelvragen((prev) => prev.map((dv) => (String(dv.id) === id ? { ...dv, vraag: next } : dv)));
  }

  function deleteDv(id: string) {
    setDeelvragen((prev) => prev.filter((dv) => String(dv.id) !== id));
    setSourcesPerDv((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    setRemovedPerDv((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    setSelectedSourceIdxPerDv((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    if (activeDvId === id) setActiveDvId("");
  }

  async function bijpromptDeelvraag(dv: Deelvraag) {
    const id = String(dv.id);
    const extra = normStr(bijpromptPerDeelvraag[id] || "");
    if (!extra) {
      setErrorMsg("Vul eerst een bijprompt in voor deze deelvraag.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await callWithTimeout(
        labFetch("/api/question-gen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: 3,
            hoofdvraag,
            deelvraag: dv.vraag,
            subdimensie: dv.subdimensie,
            presentisme: instellingen?.presentisme ?? true,
            niveau: instellingen?.taalniveau ?? 2,
            nuance: instellingen?.nuance ?? 2,
            extraPrompt: extra
          })
        })
      );

      const json = await res.json();
      const nieuwe = normStr(json?.result?.deelvraag) || normStr(json?.result?.vraag);
      if (!nieuwe) throw new Error("Geen aangepaste deelvraag ontvangen");

      updateDvText(id, nieuwe);
      setStatus("idle");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  }

  async function zoekBronnenVoorDeelvraag(dv: Deelvraag) {
    const id = String(dv.id);

    setStatus("loading");
    setErrorMsg(null);
    setSourceDetail(null);

    try {
      const res = await callWithTimeout(
        labFetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: [dv.vraag],
            filters: {
              tv: Array.isArray(instellingen?.tijdvakken) && instellingen.tijdvakken.length === 1 ? instellingen.tijdvakken[0] : undefined,
              text: true,
              images: true,
              kleio: true,
              cito: true,
              historiek: true
            }
          })
        }),
        30000
      );

      const json = await res.json();
      const raw = Array.isArray(json?.sources) ? json.sources : [];
      const six = takeN(raw, 6);

      if (!six.length) throw new Error("0 bronnen gevonden (probeer zonder TV-filter of kies precies 1 tijdvak)");

      setSourcesPerDv((prev) => ({ ...prev, [id]: six }));
      setRemovedPerDv((prev) => ({ ...prev, [id]: prev[id] || new Set<number>() }));
      setSelectedSourceIdxPerDv((prev) => ({ ...prev, [id]: null }));
      setActiveDvId(id);

      setStatus("idle");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  }

  function toggleRemove(dvId: string, idx: number) {
    setRemovedPerDv((prev) => {
      const cur = prev[dvId] || new Set<number>();
      const next = new Set(cur);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return { ...prev, [dvId]: next };
    });
  }

  async function openDetail(dvId: string, idx: number) {
    const src = sourcesPerDv[dvId]?.[idx];
    if (!src) return;

    setSelectedSourceIdxPerDv((prev) => ({ ...prev, [dvId]: idx }));
    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await callWithTimeout(
        labFetch("/api/source-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: src.id })
        }),
        20000
      );

      const json = await res.json();
      if (!json?.ok && !json?.source) throw new Error("Kon bron niet laden");
      setSourceDetail(json?.source || json);
      setStatus("idle");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  }

  const activeDv = useMemo(() => deelvragen.find((d) => String(d.id) === activeDvId) || null, [deelvragen, activeDvId]);
  const activeSources = useMemo(() => (activeDvId ? sourcesPerDv[activeDvId] || [] : []), [sourcesPerDv, activeDvId]);
  const activeRemoved = useMemo(() => (activeDvId ? removedPerDv[activeDvId] || new Set<number>() : new Set<number>()), [removedPerDv, activeDvId]);

  function validateBeforeNext() {
    if (!hoofdvraag.trim()) return "Geen hoofdvraag in state (ga terug naar /lab/questions)";
    if (!deelvragen.length) return "Geen deelvragen";
    for (const dv of deelvragen) {
      const id = String(dv.id);
      const six = sourcesPerDv[id] || [];
      if (!six.length) return `Nog geen bronnen gezocht bij: ${dv.subdimensie}`;
      const removed = removedPerDv[id] || new Set<number>();
      const kept = six.filter((_: any, i: number) => !removed.has(i));
      if (!kept.length) return `Je hebt alles weggegooid bij: ${dv.subdimensie}`;
    }
    return null;
  }

  function doorzettenNaarLabProposals() {
    const v = validateBeforeNext();
    if (v) {
      setErrorMsg(v);
      setStatus("error");
      return;
    }

    const bronnenPerDeelvraag = deelvragen.map((dv) => {
      const id = String(dv.id);
      const six = sourcesPerDv[id] || [];
      const removed = removedPerDv[id] || new Set<number>();
      const kept = six
        .filter((_: any, i: number) => !removed.has(i))
        .map((s: any, i: number) => ({ ...s, _labIndex: i }));

      return { deelvraagId: id, deelvraag: dv, bronnen: kept };
    });

    const payload = {
      fromLab: true,
      stap: "koppelen-bronnen",
      hoofdvraag,
      deelvragen,
      bronnenPerDeelvraag,
      instellingen,
      seedSource
    };

    navigate("/lab/proposals", { state: payload });
  }

  return (
    <div className="lesgo-generator-page">
      <div className="lesgo-generator-layout" style={{ gridTemplateColumns: "360px minmax(0, 1fr)" }}>
        <aside className="lesgo-sidebar">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h1 className="lesgo-title" style={{ margin: 0 }}>Deelvragen verfijnen</h1>
              <div style={{ fontSize: 12, opacity: 0.55 }}>LAB</div>
            </div>

            <LabStatus state={status} />
            {errorMsg && <div className="lesgo-error" style={{ marginTop: 8 }}>{errorMsg}</div>}
          </div>

          <div className="lesgo-panel">
            <h2>Hoofdvraag</h2>
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>{hoofdvraag || "(geen)"}</div>
          </div>

          <div className="lesgo-panel">
            <h2>Deelvragen</h2>
            <div className="lesgo-hint">Klik een deelvraag om bronnen te beheren.</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deelvragen.map((dv) => {
                const id = String(dv.id);
                const active = id === activeDvId;
                const haveSources = (sourcesPerDv[id] || []).length;
                return (
                  <button
                    key={id}
                    className="lesgo-button"
                    disabled={disabled}
                    type="button"
                    onClick={() => setActiveDvId(id)}
                    style={{
                      justifyContent: "flex-start",
                      borderRadius: 14,
                      padding: "0.6rem 0.8rem",
                      background: active ? "#dbeafe" : "white",
                      borderColor: active ? "#2563eb" : "#d1d5db",
                      color: "#111827"
                    }}
                  >
                    <div style={{ width: "100%" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.8 }}>{dv.subdimensie}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.35 }}>{dv.vraag}</div>
                      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                        {haveSources ? `6 bronnen geladen` : "Nog geen bronnen"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lesgo-actions" style={{ marginTop: 12 }}>
              <button className="lesgo-button primary" disabled={disabled} onClick={doorzettenNaarLabProposals} type="button">
                Verder: naar LAB-voorstellen
              </button>
            </div>
          </div>
        </aside>

        <main className="lesgo-main">
          <div style={{ display: "grid", gridTemplateColumns: "360px 420px minmax(0, 1fr)", gap: 14 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "white" }}>
              <h3 style={{ marginTop: 0 }}>Verfijn deelvraag</h3>

              {!activeDv && <div style={{ opacity: 0.7 }}>Selecteer links een deelvraag.</div>}

              {activeDv && (
                <>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>{activeDv.subdimensie}</div>

                  <textarea
                    disabled={disabled}
                    value={activeDv.vraag}
                    onChange={(e) => updateDvText(String(activeDv.id), e.target.value)}
                    rows={5}
                    style={{ width: "100%", marginTop: 8, borderRadius: 12, border: "1px solid #d1d5db", padding: "0.6rem 0.7rem" }}
                  />

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                      className="lesgo-button"
                      disabled={disabled}
                      type="button"
                      onClick={() => zoekBronnenVoorDeelvraag(activeDv)}
                    >
                      Zoek 6 bronnen
                    </button>

                    <button
                      className="lesgo-button"
                      disabled={disabled}
                      type="button"
                      onClick={() => deleteDv(String(activeDv.id))}
                    >
                      Verwijder deelvraag
                    </button>
                  </div>

                  <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Bijprompt (per deelvraag)</div>
                    <textarea
                      disabled={disabled}
                      value={bijpromptPerDeelvraag[String(activeDv.id)] || ""}
                      onChange={(e) => setBijpromptPerDeelvraag((p) => ({ ...p, [String(activeDv.id)]: e.target.value }))}
                      rows={3}
                      style={{ width: "100%", borderRadius: 12, border: "1px solid #d1d5db", padding: "0.6rem 0.7rem" }}
                      placeholder="Bijv. ‘maak hem concreter voor 3 mavo’ of ‘focus op propaganda’"
                    />
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button className="lesgo-button" disabled={disabled} type="button" onClick={() => bijpromptDeelvraag(activeDv)}>
                        Pas aan (Gemini)
                      </button>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                      Let op: hiervoor moet backend step=3 ondersteunen.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "white" }}>
              <h3 style={{ marginTop: 0 }}>Bronnen (6) – middelste kolom</h3>

              {!activeDv && <div style={{ opacity: 0.7 }}>Selecteer een deelvraag.</div>}

              {activeDv && activeSources.length === 0 && (
                <div style={{ opacity: 0.7 }}>
                  Nog geen bronnen. Klik links op <strong>Zoek 6 bronnen</strong>.
                </div>
              )}

              {activeDv && activeSources.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeSources.map((s: any, idx: number) => {
                    const removed = activeRemoved.has(idx);
                    const relevant = idx < 3; // demo: 3 geel, 3 wit
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          borderRadius: 14,
                          padding: 10,
                          border: "1px solid #e5e7eb",
                          background: removed ? "#f3f4f6" : relevant ? "#ffe066" : "white",
                          opacity: removed ? 0.55 : 1
                        }}
                      >
                        <button
                          className="lesgo-button"
                          type="button"
                          disabled={disabled}
                          onClick={() => openDetail(String(activeDv.id), idx)}
                          style={{ padding: "0.25rem 0.7rem", fontSize: 12 }}
                        >
                          Bekijk
                        </button>

                        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => !disabled && toggleRemove(String(activeDv.id), idx)}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title || "(zonder titel)"}</div>
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                            {s.provider ? `${s.provider}` : ""}{s.type ? ` · ${s.type}` : ""}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                            Klik hier om {removed ? "terug te zetten" : "weg te gooien"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "white" }}>
              <h3 style={{ marginTop: 0 }}>Bron bekijken – derde kolom</h3>

              {!sourceDetail && <div style={{ opacity: 0.7 }}>Klik bij een bron op <strong>Bekijk</strong>.</div>}

              {sourceDetail && (
                <div style={{ lineHeight: 1.55 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{sourceDetail.title || "(zonder titel)"}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                    {sourceDetail.provider ? `${sourceDetail.provider}` : ""}{sourceDetail.type ? ` · ${sourceDetail.type}` : ""}
                  </div>

                  {sourceDetail.imageUrl && (
                    <div style={{ marginTop: 12 }}>
                      <img src={sourceDetail.imageUrl} style={{ maxWidth: "100%", borderRadius: 12 }} />
                    </div>
                  )}

                  {sourceDetail.fullText && (
                    <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
                      {sourceDetail.fullText}
                    </div>
                  )}

                  {!sourceDetail.fullText && sourceDetail.description && (
                    <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
                      {sourceDetail.description}
                    </div>
                  )}

                  {sourceDetail.url && (
                    <div style={{ marginTop: 12, fontSize: 12 }}>
                      <a href={sourceDetail.url} target="_blank" rel="noreferrer">
                        Open bron
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


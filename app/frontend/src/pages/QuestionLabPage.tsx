import React, { useMemo, useState } from "react";

type VraagType =
  | "verklarend"
  | "vergelijkend"
  | "oorzaak-gevolg"
  | "continuiteit-verandering"
  | "perspectief"
  | "standpunt"
  | "chronologisch"
  | "probleem-oplossing";

type HoofdvraagSuggestie = { id: number; vraag: string };

type DeelvraagItem = { id: number; subdimensie: string; vraag: string };

type Source = {
  provider?: string;
  type?: string;
  title?: string;
  url?: string | null;
  description?: string;
  fullText?: string;
  imageUrl?: string | null;
};

type DimKey = "politiek" | "sociaal" | "cultureel" | "individueel";

const DIMENSIES: Array<{ key: DimKey; label: string; apiMatchHint: string }> = [
  { key: "politiek", label: "politiek (macht/bestuur)", apiMatchHint: "politiek" },
  { key: "sociaal", label: "sociaal-economisch (geld/werk/groepen)", apiMatchHint: "sociaal" },
  { key: "cultureel", label: "cultureel-mentaal (ideeën/propaganda/beelden)", apiMatchHint: "cultureel" },
  { key: "individueel", label: "individueel (keuzes/motieven/ervaringen)", apiMatchHint: "individueel" },
];

function asString(x: any): string {
  return typeof x === "string" ? x : x == null ? "" : String(x);
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function uniq(arr: string[]) {
  return [...new Set(arr.filter(Boolean))];
}

function normalizeBegrippen(input: string): string[] {
  return uniq(
    input
      .split(/[,\n;]/g)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function tvLabel(tv: string) {
  return `TV${tv}`;
}

function sourceKey(s: Source) {
  const u = asString(s?.url);
  if (u) return u;
  return `${asString(s?.provider)}|${asString(s?.type)}|${asString(s?.title)}`;
}

export default function QuestionLabPage() {
  const [vraagType, setVraagType] = useState<VraagType>("verklarend");
  const [richting, setRichting] = useState("Waarom stemden in 1933 miljoenen Duitsers voor een tiran als Hitler?");
  const [presentisme, setPresentisme] = useState(true);

  const [begrippenInput, setBegrippenInput] = useState(
    "Hitler, NSDAP, Weimarrepubliek, economische crisis, propaganda, geweld, noodverordeningen"
  );
  const begrippen = useMemo(() => normalizeBegrippen(begrippenInput), [begrippenInput]);

  const [begrippenSelected, setBegrippenSelected] = useState<Record<string, boolean>>(() => ({}));

  const [tvSelected, setTvSelected] = useState<string[]>(["9"]);
  const [ka, setKa] = useState("KA42");

  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [bijpromptHoofd, setBijpromptHoofd] = useState("");
  const [hoofdvraagSuggesties, setHoofdvraagSuggesties] = useState<HoofdvraagSuggestie[]>([]);
  const [selectedHoofdvraagId, setSelectedHoofdvraagId] = useState<number | null>(null);
  const selectedHoofdvraag = useMemo(() => {
    const hv = hoofdvraagSuggesties.find((x) => x.id === selectedHoofdvraagId);
    return hv ? hv.vraag : "";
  }, [hoofdvraagSuggesties, selectedHoofdvraagId]);

  const [acceptedHoofdvraag, setAcceptedHoofdvraag] = useState("");

  const [deelvragenByDim, setDeelvragenByDim] = useState<Record<DimKey, string[]>>({
    politiek: [],
    sociaal: [],
    cultureel: [],
    individueel: [],
  });

  const [selectedDeelvraagByDim, setSelectedDeelvraagByDim] = useState<Record<DimKey, string | null>>({
    politiek: null,
    sociaal: null,
    cultureel: null,
    individueel: null,
  });

  const [bijpromptByDim, setBijpromptByDim] = useState<Record<DimKey, string>>({
    politiek: "",
    sociaal: "",
    cultureel: "",
    individueel: "",
  });

  const [sourcesByDim, setSourcesByDim] = useState<Record<DimKey, Source[]>>({
    politiek: [],
    sociaal: [],
    cultureel: [],
    individueel: [],
  });

  const [selectedSourceByDim, setSelectedSourceByDim] = useState<Record<DimKey, Record<string, boolean>>>({
    politiek: {},
    sociaal: {},
    cultureel: {},
    individueel: {},
  });

  function toggleTv(tv: string) {
    setTvSelected((prev) => {
      const s = new Set(prev);
      if (s.has(tv)) s.delete(tv);
      else s.add(tv);
      return [...s].sort((a, b) => Number(a) - Number(b));
    });
  }

  function toggleBegripChip(b: string) {
    setBegrippenSelected((prev) => ({ ...prev, [b]: !prev[b] }));
  }

  const selectedBegrippen = useMemo(() => {
    const active = Object.entries(begrippenSelected)
      .filter(([, v]) => !!v)
      .map(([k]) => k);
    return active.length ? active : begrippen;
  }, [begrippenSelected, begrippen]);

  async function postJson(path: string, body: any) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const t = await r.text();
    if (!r.ok) {
      const j = safeJsonParse(t);
      const msg = j?.error || j?.message || t || `HTTP ${r.status}`;
      throw new Error(msg);
    }
    return safeJsonParse(t) ?? {};
  }

  function coerceHoofdvragen(payload: any): HoofdvraagSuggestie[] {
    const hv = payload?.hoofdvraagSuggesties || payload?.data?.hoofdvraagSuggesties || payload?.result?.hoofdvraagSuggesties || [];
    if (!Array.isArray(hv)) return [];
    return hv
      .map((x: any, idx: number) => {
        const id = Number(x?.id ?? idx + 1);
        const vraag = asString(x?.vraag || x?.text || x?.hoofdvraag);
        if (!vraag) return null;
        return { id, vraag };
      })
      .filter(Boolean) as HoofdvraagSuggestie[];
  }

  function coerceDeelvragen(payload: any): DeelvraagItem[] {
    const dv = payload?.deelvragen || payload?.data?.deelvragen || payload?.result?.deelvragen || [];
    if (!Array.isArray(dv)) return [];
    return dv
      .map((x: any, idx: number) => {
        const id = Number(x?.id ?? idx + 1);
        const subdimensie = asString(x?.subdimensie || x?.subdimension || "");
        const vraag = asString(x?.vraag || x?.deelvraag || x?.question || x?.text || "");
        if (!vraag) return null;
        return { id, subdimensie, vraag };
      })
      .filter(Boolean) as DeelvraagItem[];
  }

  async function handleGenHoofdvragen(isRegen: boolean) {
    setErrorMsg("");
    setIsBusy(true);

    try {
      const payload = await postJson("/api/question-gen", {
        vraagType,
        richting,
        presentisme,
        level: "havo",
        nuance: 3,
        tv: tvSelected,
        ka,
        begrippen: selectedBegrippen,
        prikkelText: "",
        bijprompt: isRegen ? bijpromptHoofd : "",
      });

      const hv = coerceHoofdvragen(payload);

      setHoofdvraagSuggesties(hv);
      setSelectedHoofdvraagId(hv.length ? hv[0].id : null);
      setAcceptedHoofdvraag("");

      setDeelvragenByDim({ politiek: [], sociaal: [], cultureel: [], individueel: [] });
      setSelectedDeelvraagByDim({ politiek: null, sociaal: null, cultureel: null, individueel: null });
      setSourcesByDim({ politiek: [], sociaal: [], cultureel: [], individueel: [] });
      setSelectedSourceByDim({ politiek: {}, sociaal: {}, cultureel: {}, individueel: {} });
    } catch (e: any) {
      setErrorMsg(e?.message ? String(e.message) : "Onbekende fout");
    } finally {
      setIsBusy(false);
    }
  }

  function handleAcceptHoofdvraag() {
    if (!selectedHoofdvraag) return;
    setAcceptedHoofdvraag(selectedHoofdvraag);
  }

  function findBestDeelvraagForDim(items: DeelvraagItem[], dim: DimKey) {
    const hint = DIMENSIES.find((d) => d.key === dim)?.apiMatchHint || "";
    const normalized = hint.toLowerCase();
    const exact = items.find((x) => asString(x.subdimensie).toLowerCase().includes(normalized));
    return exact || items[0] || null;
  }

  async function handleGenDeelvraag(dim: DimKey, isRegen: boolean) {
    if (!acceptedHoofdvraag) return;

    setErrorMsg("");
    setIsBusy(true);

    try {
      const payload = await postJson("/api/question-gen", {
        vraagType,
        richting: acceptedHoofdvraag,
        presentisme,
        level: "havo",
        nuance: 3,
        tv: tvSelected,
        ka,
        begrippen: selectedBegrippen,
        prikkelText: "",
        bijprompt: isRegen ? bijpromptByDim[dim] : "",
        focusSubdimensie: DIMENSIES.find((d) => d.key === dim)?.label || "",
      });

      const dvAll = coerceDeelvragen(payload);
      const best = findBestDeelvraagForDim(dvAll, dim);

      if (!best?.vraag) throw new Error("Geen deelvraag ontvangen");

      setDeelvragenByDim((prev) => {
        const next = isRegen ? [best.vraag] : uniq([best.vraag, ...(prev[dim] || [])]);
        return { ...prev, [dim]: next };
      });

      setSelectedDeelvraagByDim((prev) => ({ ...prev, [dim]: best.vraag }));
      setSourcesByDim((prev) => ({ ...prev, [dim]: [] }));
      setSelectedSourceByDim((prev) => ({ ...prev, [dim]: {} }));
    } catch (e: any) {
      setErrorMsg(e?.message ? String(e.message) : "Onbekende fout");
    } finally {
      setIsBusy(false);
    }
  }

  function removeDeelvraagChip(dim: DimKey, vraag: string) {
    setDeelvragenByDim((prev) => {
      const nextArr = (prev[dim] || []).filter((x) => x !== vraag);
      return { ...prev, [dim]: nextArr };
    });
    setSelectedDeelvraagByDim((prev) => {
      const cur = prev[dim];
      if (cur === vraag) return { ...prev, [dim]: null };
      return prev;
    });
    setSourcesByDim((prev) => ({ ...prev, [dim]: [] }));
    setSelectedSourceByDim((prev) => ({ ...prev, [dim]: {} }));
  }

  function canMatchAllDims() {
    return DIMENSIES.every((d) => !!selectedDeelvraagByDim[d.key]);
  }

  async function handleMatchBronnenAllDims() {
    if (!canMatchAllDims()) return;

    setErrorMsg("");
    setIsBusy(true);

    try {
      for (const d of DIMENSIES) {
        const dim = d.key;
        const q0 = selectedDeelvraagByDim[dim];
        if (!q0) continue;

        const q = selectedBegrippen.length ? `${q0} ${selectedBegrippen.join(" ")}` : q0;

        const payload = await postJson("/api/search", {
          query: [q],
          filters: {
            tv: tvSelected.length ? tvSelected[0] : "",
            ka,
            text: true,
            images: true,
            cito: true,
            kleio: true,
            historiek: false,
          },
          cacheFirst: true,
          cacheMin: 8,
          cacheLimit: 18,
        });

        const sources: Source[] = Array.isArray(payload?.sources) ? payload.sources : [];
        setSourcesByDim((prev) => ({ ...prev, [dim]: sources }));
        setSelectedSourceByDim((prev) => ({ ...prev, [dim]: prev[dim] || {} }));
      }
    } catch (e: any) {
      setErrorMsg(e?.message ? String(e.message) : "Onbekende fout");
    } finally {
      setIsBusy(false);
    }
  }

  function toggleSelectSource(dim: DimKey, s: Source) {
    const k = sourceKey(s);
    setSelectedSourceByDim((prev) => {
      const cur = prev[dim] || {};
      const next = { ...cur, [k]: !cur[k] };
      return { ...prev, [dim]: next };
    });
  }

  function selectedSourceCount(dim: DimKey) {
    const m = selectedSourceByDim[dim] || {};
    return Object.values(m).filter(Boolean).length;
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <h1 style={{ margin: "8px 0 12px" }}>QuestionLab (QL03) — Hoofdvraagchips → Deelvraagchips → Match bronnen</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Type hoofdvraag</span>
              <select value={vraagType} onChange={(e) => setVraagType(e.target.value as VraagType)}>
                <option value="verklarend">verklarend</option>
                <option value="vergelijkend">vergelijkend</option>
                <option value="oorzaak-gevolg">oorzaak-gevolg</option>
                <option value="continuiteit-verandering">continuiteit-verandering</option>
                <option value="perspectief">perspectief</option>
                <option value="standpunt">standpunt</option>
                <option value="chronologisch">chronologisch</option>
                <option value="probleem-oplossing">probleem-oplossing</option>
              </select>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={presentisme} onChange={(e) => setPresentisme(e.target.checked)} />
              <span>Presentisme (impliciet in hoofdvraag)</span>
            </label>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Heb je al een hoofdvraag voor je les of waar denk je aan?</div>
            <textarea
              value={richting}
              onChange={(e) => setRichting(e.target.value)}
              rows={3}
              style={{ width: "100%", borderRadius: 10, border: "1px solid #ccc", padding: 10 }}
              placeholder="Bijv. Waarom stemden in 1933 miljoenen Duitsers voor een tiran als Hitler?"
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Welke historische begrippen vind je belangrijk?</div>
            <textarea
              value={begrippenInput}
              onChange={(e) => setBegrippenInput(e.target.value)}
              rows={3}
              style={{ width: "100%", borderRadius: 10, border: "1px solid #ccc", padding: 10 }}
              placeholder="Bijv. Hitler, NSDAP, Weimarrepubliek..."
            />

            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
              Begrippen (klik chips om te selecteren):{" "}
              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {begrippen.map((b) => {
                  const active = !!begrippenSelected[b];
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBegripChip(b)}
                      style={{
                        borderRadius: 999,
                        padding: "6px 10px",
                        border: active ? "1px solid #111" : "1px solid #ddd",
                        background: active ? "#111" : "#fff",
                        color: active ? "#fff" : "#111",
                        cursor: "pointer",
                      }}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                Actief: {selectedBegrippen.length ? selectedBegrippen.join(", ") : "—"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Tijdvakken (chips)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Array.from({ length: 10 }).map((_, i) => {
              const tv = String(i + 1);
              const active = tvSelected.includes(tv);
              return (
                <button
                  key={tv}
                  onClick={() => toggleTv(tv)}
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    border: active ? "1px solid #111" : "1px solid #ddd",
                    background: active ? "#111" : "#fff",
                    color: active ? "#fff" : "#111",
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  {tvLabel(tv)}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>KA</span>
              <input
                value={ka}
                onChange={(e) => setKa(e.target.value)}
                style={{ borderRadius: 10, border: "1px solid #ccc", padding: "6px 10px", width: 110 }}
              />
            </label>

            <button
              type="button"
              onClick={() => handleGenHoofdvragen(false)}
              disabled={isBusy}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Genereer 3 hoofdvragen
            </button>
          </div>

          {errorMsg ? <div style={{ marginTop: 10, color: "#b00020", whiteSpace: "pre-wrap" }}>{errorMsg}</div> : null}

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Backend endpoints: <code>/api/question-gen</code> en <code>/api/search</code>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Stap 1 — Hoofdvraagchips</div>

        {hoofdvraagSuggesties.length ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {hoofdvraagSuggesties.map((h) => {
                const active = h.id === selectedHoofdvraagId;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHoofdvraagId(h.id)}
                    style={{
                      borderRadius: 999,
                      padding: "8px 12px",
                      border: active ? "1px solid #111" : "1px solid #ddd",
                      background: active ? "#111" : "#fff",
                      color: active ? "#fff" : "#111",
                      cursor: "pointer",
                      textAlign: "left",
                      maxWidth: 1000,
                    }}
                    title="Klik om te selecteren"
                  >
                    {h.vraag}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Bijprompt (regen hoofdvragen)</div>
              <textarea
                value={bijpromptHoofd}
                onChange={(e) => setBijpromptHoofd(e.target.value)}
                rows={2}
                style={{ width: "100%", borderRadius: 10, border: "1px solid #ccc", padding: 10 }}
                placeholder="Bijv. Maak het concreter voor HAVO 4, meer richting propaganda en crisis..."
              />
              <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleGenHoofdvragen(true)}
                  disabled={isBusy}
                  style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #111", background: "#fff", cursor: "pointer" }}
                >
                  Regen hoofdvragen
                </button>
                <button
                  type="button"
                  onClick={handleAcceptHoofdvraag}
                  disabled={isBusy || !selectedHoofdvraag}
                  style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" }}
                >
                  Gebruik deze hoofdvraag
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              Geselecteerd: <span style={{ fontWeight: 600 }}>{selectedHoofdvraag || "—"}</span>
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.75 }}>Nog geen hoofdvragen. Klik “Genereer 3 hoofdvragen”.</div>
        )}
      </div>

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Stap 2 — Deelvragen per subdimensie (chips)</div>

        {!acceptedHoofdvraag ? (
          <div style={{ opacity: 0.75 }}>Kies eerst een hoofdvraag en klik “Gebruik deze hoofdvraag”.</div>
        ) : (
          <>
            <div style={{ marginBottom: 10, opacity: 0.9 }}>
              Hoofdvraag in gebruik: <span style={{ fontWeight: 700 }}>{acceptedHoofdvraag}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {DIMENSIES.map((d) => {
                const dim = d.key;
                const chips = deelvragenByDim[dim] || [];
                const selected = selectedDeelvraagByDim[dim];

                return (
                  <div key={dim} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{d.label}</div>

                    {chips.length ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {chips.map((q) => {
                          const active = q === selected;
                          return (
                            <div key={q} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => setSelectedDeelvraagByDim((prev) => ({ ...prev, [dim]: q }))}
                                style={{
                                  borderRadius: 999,
                                  padding: "8px 12px",
                                  border: active ? "1px solid #111" : "1px solid #ddd",
                                  background: active ? "#111" : "#fff",
                                  color: active ? "#fff" : "#111",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                title="Klik om te selecteren"
                              >
                                {q}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeDeelvraagChip(dim, q)}
                                style={{
                                  borderRadius: 999,
                                  padding: "6px 10px",
                                  border: "1px solid #ddd",
                                  background: "#fff",
                                  cursor: "pointer",
                                }}
                                title="Verwijder"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.75, fontSize: 12 }}>Nog geen deelvragen in deze subdimensie.</div>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Bijprompt (regen deelvraag)</div>
                      <textarea
                        value={bijpromptByDim[dim]}
                        onChange={(e) => setBijpromptByDim((prev) => ({ ...prev, [dim]: e.target.value }))}
                        rows={2}
                        style={{ width: "100%", borderRadius: 10, border: "1px solid #ccc", padding: 10 }}
                        placeholder="Bijv. Focus op rol van SA/geweld, of op werkloosheid..."
                      />
                      <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleGenDeelvraag(dim, false)}
                          disabled={isBusy}
                          style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #111", background: "#fff", cursor: "pointer" }}
                        >
                          Genereer deelvraag
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenDeelvraag(dim, true)}
                          disabled={isBusy}
                          style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #111", background: "#fff", cursor: "pointer" }}
                        >
                          Regen deelvraag
                        </button>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                        Geselecteerd: <span style={{ fontWeight: 600 }}>{selected || "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleMatchBronnenAllDims}
                disabled={isBusy || !canMatchAllDims()}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #111",
                  background: canMatchAllDims() ? "#111" : "#eee",
                  color: canMatchAllDims() ? "#fff" : "#666",
                  cursor: canMatchAllDims() ? "pointer" : "not-allowed",
                }}
              >
                Match met bronnen
              </button>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Voor matchen: selecteer per subdimensie 1 deelvraag-chip.
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <h2 style={{ margin: "8px 0 10px" }}>Stap 3 — Bronnen per subdimensie (selecteerbaar)</h2>

        {!acceptedHoofdvraag ? (
          <div style={{ opacity: 0.75 }}>Nog niet actief. Eerst hoofdvraag kiezen + deelvragen selecteren.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            {DIMENSIES.map((d) => {
              const dim = d.key;
              const sources = sourcesByDim[dim] || [];
              const selN = selectedSourceCount(dim);
              const q = selectedDeelvraagByDim[dim];

              return (
                <div key={dim} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{d.label}</div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                        Deelvraag: <span style={{ fontWeight: 600 }}>{q || "—"}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, alignSelf: "center" }}>Geselecteerde bronnen: {selN}</div>
                  </div>

                  {sources.length ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Resultaten ({sources.length})</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                        {sources.map((s, idx) => {
                          const k = sourceKey(s);
                          const checked = !!(selectedSourceByDim[dim] && selectedSourceByDim[dim][k]);

                          return (
                            <label
                              key={`${k}-${idx}`}
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                                border: "1px solid #eee",
                                borderRadius: 10,
                                padding: 10,
                              }}
                            >
                              <input type="checkbox" checked={checked} onChange={() => toggleSelectSource(dim, s)} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>
                                  {asString(s.provider) || "?"} · {asString(s.type) || "?"} · {asString(s.title) || "(zonder titel)"}
                                </div>
                                {s.url ? (
                                  <div style={{ fontSize: 12, marginTop: 3 }}>
                                    <a href={s.url} target="_blank" rel="noreferrer">
                                      {s.url}
                                    </a>
                                  </div>
                                ) : null}
                                {s.description ? (
                                  <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85, whiteSpace: "pre-wrap" }}>{s.description}</div>
                                ) : null}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Nog geen bronnen opgehaald voor deze subdimensie.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 12, fontSize: 12, opacity: 0.8 }}>
        QL03: hoofdvraagchips + bijprompt regen + deelvraagchips per subdimensie + selecteren/verwijderen + Match met bronnen + selectie per dim in state.
      </div>
    </div>
  );
}


import React, { useEffect, useMemo, useRef, useState } from "react";
import { tvKaOptions } from "../../data/tvKaPresets";

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
  score?: number;
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

function tvLabelLong(tv: string) {
  const n = String(tv || "").trim();
  return n ? `Tijdvak ${n}` : "";
}

function sourceKey(s: Source) {
  const u = asString(s?.url);
  if (u) return u;
  return `${asString(s?.provider)}|${asString(s?.type)}|${asString(s?.title)}`;
}

function dimColor(dim: DimKey) {
  if (dim === "politiek") return "#e7f0ff";
  if (dim === "sociaal") return "#fff6d6";
  if (dim === "cultureel") return "#ffe8d6";
  return "#efeaff";
}

function dimAccent(dim: DimKey) {
  if (dim === "politiek") return "#2b6cb0";
  if (dim === "sociaal") return "#b7791f";
  if (dim === "cultureel") return "#c05621";
  return "#6b46c1";
}

function labelShort(s: string) {
  const x = String(s || "").toLowerCase();
  if (x.includes("politiek")) return "Politiek";
  if (x.includes("sociaal")) return "Eco";
  if (x.includes("cultureel")) return "Cultuur";
  if (x.includes("individueel")) return "Individueel";
  return s;
}

export default function QuestionLabPage() {
  const [vraagType, setVraagType] = useState<VraagType>("verklarend");
  const [richting, setRichting] = useState("");
  const [presentisme, setPresentisme] = useState(true);

  const [begrippenInput, setBegrippenInput] = useState("");
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

  const [activeDim, setActiveDim] = useState<DimKey>("politiek");
  const [activeSourceKey, setActiveSourceKey] = useState<string | null>(null);
  const [showMoreByDim, setShowMoreByDim] = useState<Record<DimKey, boolean>>({
    politiek: false,
    sociaal: false,
    cultureel: false,
    individueel: false,
  });

  const [chipSuggesties, setChipSuggesties] = useState<string[]>([]);
  const [chipsBusy, setChipsBusy] = useState(false);
  const [chipsErr, setChipsErr] = useState("");
  const chipsAbortRef = useRef<AbortController | null>(null);
  const chipsTimerRef = useRef<number | null>(null);

  function toggleTv(tv: string) {
    setTvSelected((prev) => {
      const s = new Set(prev);
      if (s.has(tv)) s.delete(tv);
      else s.add(tv);
      return [...s].sort((a, b) => Number(a) - Number(b));
    });
  }

  function toggleBegripChip(b: string) {
    const key = String(b || "").trim();
    if (!key) return;
    setBegrippenSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const selectedBegrippen = useMemo(() => {
    const active = Object.entries(begrippenSelected)
      .filter(([, v]) => !!v)
      .map(([k]) => k);
    return active.length ? active : begrippen;
  }, [begrippenSelected, begrippen]);

  const kaOptionsForSelectedTvs = useMemo(() => {
    const tvNums = new Set((tvSelected || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 10));
    const list = tvKaOptions
      .filter((o) => tvNums.size === 0 || tvNums.has(o.tv))
      .map((o) => ({
        tv: o.tv,
        tvLabel: o.tvLabel,
        value: `KA${o.ka}`,
        label: o.kaLabel,
      }));
    list.sort((a, b) => (a.tv !== b.tv ? a.tv - b.tv : a.value.localeCompare(b.value, "nl")));
    return list;
  }, [tvSelected]);

  function ensureKaIsValidForSelection(nextTvSelected: string[]) {
    const tvNums = new Set((nextTvSelected || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 10));
    if (!tvNums.size) return;
    const exists = tvKaOptions.some((o) => tvNums.has(o.tv) && `KA${o.ka}` === ka);
    if (!exists) {
      const first = tvKaOptions.find((o) => tvNums.has(o.tv));
      if (first) setKa(`KA${first.ka}`);
    }
  }

  async function postJson(path: string, body: any, signal?: AbortSignal) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const t = await r.text();
    if (!r.ok) {
      const j = safeJsonParse(t);
      const msg = j?.error || j?.message || t || `HTTP ${r.status}`;
      throw new Error(msg);
    }
    return safeJsonParse(t) ?? {};
  }

  useEffect(() => {
    const baseKeywords = normalizeBegrippen(begrippenInput);
    const tv0 = tvSelected && tvSelected.length ? tvSelected[0] : "";
    const tvL = tvLabelLong(tv0);

    if (!baseKeywords.length) {
      setChipSuggesties([]);
      setChipsErr("");
      setChipsBusy(false);
      return;
    }

    const text = `${richting || ""}\n${begrippenInput || ""}`.trim();
    if (!text || text.length < 2) {
      setChipSuggesties([]);
      setChipsErr("");
      setChipsBusy(false);
      return;
    }

    if (chipsTimerRef.current) {
      window.clearTimeout(chipsTimerRef.current);
      chipsTimerRef.current = null;
    }
    if (chipsAbortRef.current) {
      chipsAbortRef.current.abort();
      chipsAbortRef.current = null;
    }

    setChipsErr("");
    setChipsBusy(true);

    chipsTimerRef.current = window.setTimeout(async () => {
      const ac = new AbortController();
      chipsAbortRef.current = ac;

      try {
        const payload = await postJson(
          "/api/chips",
          {
            tvLabel: tvL || "Tijdvak 9",
            kaLabels: ka ? [ka] : [],
            baseKeywords,
            text,
          },
          ac.signal
        );

        const expanded: string[] = Array.isArray(payload?.expanded) ? payload.expanded : [];
        const raw = expanded.map((s) => String(s || "").trim()).filter(Boolean);

        const drop = new Set<string>();
        if (tvL) drop.add(tvL);
        if (ka) drop.add(ka);
        for (const b of baseKeywords) drop.add(b);

        const cleaned = uniq(raw.filter((x) => !drop.has(x) && x !== "Tijdvak" && !/^TV\d+$/i.test(x)));

        setChipSuggesties(cleaned);
        setChipsErr("");
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setChipsErr(e?.message ? String(e.message) : "Chips: onbekende fout");
        setChipSuggesties([]);
      } finally {
        setChipsBusy(false);
      }
    }, 450);

    return () => {
      if (chipsTimerRef.current) {
        window.clearTimeout(chipsTimerRef.current);
        chipsTimerRef.current = null;
      }
      if (chipsAbortRef.current) {
        chipsAbortRef.current.abort();
        chipsAbortRef.current = null;
      }
    };
  }, [richting, begrippenInput, tvSelected, ka]);

  function coerceHoofdvragen(payload: any): HoofdvraagSuggestie[] {
    const q = payload?.questions || payload?.data?.questions || payload?.result?.questions || null;
    if (Array.isArray(q)) {
      return q
        .map((s: any, idx: number) => {
          const vraag = asString(s);
          if (!vraag) return null;
          return { id: idx + 1, vraag };
        })
        .filter(Boolean) as HoofdvraagSuggestie[];
    }

    const hv =
      payload?.hoofdvraagSuggesties ||
      payload?.data?.hoofdvraagSuggesties ||
      payload?.result?.hoofdvraagSuggesties ||
      [];
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
    const q = payload?.questions || payload?.data?.questions || payload?.result?.questions || null;
    if (Array.isArray(q)) {
      return q
        .map((s: any, idx: number) => {
          const vraag = asString(s);
          if (!vraag) return null;
          return { id: idx + 1, subdimensie: "", vraag };
        })
        .filter(Boolean) as DeelvraagItem[];
    }

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

      setActiveDim("politiek");
      setActiveSourceKey(null);
      setShowMoreByDim({ politiek: false, sociaal: false, cultureel: false, individueel: false });
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
      const candidates = uniq(dvAll.map((x) => asString(x?.vraag)).filter(Boolean)).slice(0, 3);

      if (!candidates.length) throw new Error("Geen deelvragen ontvangen");

      setDeelvragenByDim((prev) => {
        const cur = prev[dim] || [];
        const nextArr = isRegen ? candidates : uniq([...candidates, ...cur]);
        return { ...prev, [dim]: nextArr };
      });

      setSelectedDeelvraagByDim((prev) => {
        const curSel = prev[dim];
        const willBe = isRegen ? candidates : uniq([...(deelvragenByDim[dim] || []), ...candidates]);
        if (curSel && willBe.includes(curSel)) return prev;
        return { ...prev, [dim]: candidates[0] || curSel || null };
      });

      setSourcesByDim((prev) => ({ ...prev, [dim]: [] }));
      setSelectedSourceByDim((prev) => ({ ...prev, [dim]: {} }));

      setActiveDim(dim);
      setActiveSourceKey(null);
      setShowMoreByDim((prev) => ({ ...prev, [dim]: false }));
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
    if (activeDim === dim) setActiveSourceKey(null);
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
        setShowMoreByDim((prev) => ({ ...prev, [dim]: false }));
      }

      setActiveDim("politiek");
      setActiveSourceKey(null);
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

  function getSourceByKey(dim: DimKey, key: string | null) {
    if (!key) return null;
    const list = sourcesByDim[dim] || [];
    return list.find((s) => sourceKey(s) === key) || null;
  }

  function getRankedSources(dim: DimKey) {
    const list = sourcesByDim[dim] || [];
    const sorted = [...list].sort((a, b) => {
      const sa = typeof a.score === "number" ? a.score : -Infinity;
      const sb = typeof b.score === "number" ? b.score : -Infinity;
      if (sb !== sa) return sb - sa;
      return 0;
    });
    return sorted;
  }

  const activeSourcesAll = useMemo(() => getRankedSources(activeDim), [activeDim, sourcesByDim]);
  const activeSourcesTop6 = useMemo(() => activeSourcesAll.slice(0, 6), [activeSourcesAll]);
  const activeSourcesRest = useMemo(() => activeSourcesAll.slice(6), [activeSourcesAll]);
  const activePicked = useMemo(() => getSourceByKey(activeDim, activeSourceKey), [activeDim, activeSourceKey, sourcesByDim]);

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <h1 style={{ margin: "8px 0 12px" }}>QuestionLab (QL03) — Hoofdvraagchips → Deelvraagchips → Match bronnen</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 16, padding: 12 }}>
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
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Heb je al een hoofdvraag voor je les of waar denk je aan?</div>
            <textarea
              value={richting}
              onChange={(e) => setRichting(e.target.value)}
              rows={3}
              style={{ width: "100%", borderRadius: 12, border: "1px solid #ccc", padding: 10 }}
              placeholder="Typ hier je idee voor de hoofdvraag..."
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Welke historische begrippen vind je belangrijk?</div>
            <textarea
              value={begrippenInput}
              onChange={(e) => setBegrippenInput(e.target.value)}
              rows={3}
              style={{ width: "100%", borderRadius: 12, border: "1px solid #ccc", padding: 10 }}
              placeholder="Bijv. Hitler, NSDAP, Weimarrepubliek..."
            />

            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
              Begrippen (klik chips om te selecteren):
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

              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>Suggesties (uit /api/chips)</div>
                  {chipsBusy ? <div style={{ fontSize: 12, opacity: 0.75 }}>laden…</div> : null}
                  {chipsErr ? <div style={{ fontSize: 12, color: "#b00020" }}>{chipsErr}</div> : null}
                </div>

                {chipSuggesties.length ? (
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {chipSuggesties.map((s) => {
                      const active = !!begrippenSelected[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleBegripChip(s)}
                          style={{
                            borderRadius: 999,
                            padding: "6px 10px",
                            border: active ? "1px solid #111" : "1px solid #ddd",
                            background: active ? "#111" : "#fff",
                            color: active ? "#fff" : "#111",
                            cursor: "pointer",
                          }}
                          title="Klik om te (de)selecteren"
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {normalizeBegrippen(begrippenInput).length ? (chipsBusy ? "Suggesties ophalen…" : "Geen suggesties gevonden.") : "Typ eerst minstens 1 begrip."}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 8, opacity: 0.85 }}>Actief: {selectedBegrippen.length ? selectedBegrippen.join(", ") : "—"}</div>
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 16, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Tijdvakken (chips)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Array.from({ length: 10 }).map((_, i) => {
              const tv = String(i + 1);
              const active = tvSelected.includes(tv);
              return (
                <button
                  key={tv}
                  onClick={() => {
                    setTvSelected((prev) => {
                      const s = new Set(prev);
                      if (s.has(tv)) s.delete(tv);
                      else s.add(tv);
                      const next = [...s].sort((a, b) => Number(a) - Number(b));
                      ensureKaIsValidForSelection(next);
                      return next;
                    });
                  }}
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
              <span style={{ fontWeight: 700 }}>KA</span>

              <select
                value={ka}
                onChange={(e) => setKa(e.target.value)}
                style={{ borderRadius: 12, border: "1px solid #ccc", padding: "6px 10px", minWidth: 520, maxWidth: 760 }}
              >
                {(() => {
                  const groups = new Map<string, Array<{ value: string; label: string }>>();
                  for (const o of kaOptionsForSelectedTvs) {
                    const key = o.tvLabel || `Tijdvak ${o.tv}`;
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push({ value: o.value, label: o.label });
                  }
                  const entries = Array.from(groups.entries());
                  return entries.map(([tvL, opts]) => (
                    <optgroup key={tvL} label={tvL}>
                      {opts.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </select>
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
            Backend: <code>/api/question-gen</code> · <code>/api/search</code> · <code>/api/chips</code>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 16, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Stap 1 — Hoofdvraagchips</div>

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
                      maxWidth: 1100,
                    }}
                    title="Klik om te selecteren"
                  >
                    {h.vraag}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Bijprompt (regen hoofdvragen)</div>
              <textarea
                value={bijpromptHoofd}
                onChange={(e) => setBijpromptHoofd(e.target.value)}
                rows={2}
                style={{ width: "100%", borderRadius: 12, border: "1px solid #ccc", padding: 10 }}
                placeholder="Bijv. Maak het concreter voor HAVO 4..."
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
              Geselecteerd: <span style={{ fontWeight: 700 }}>{selectedHoofdvraag || "—"}</span>
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.75 }}>Nog geen hoofdvragen. Klik “Genereer 3 hoofdvragen”.</div>
        )}
      </div>

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 16, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Stap 2 — Deelvragen per subdimensie (chips)</div>

        {!acceptedHoofdvraag ? (
          <div style={{ opacity: 0.75 }}>Kies eerst een hoofdvraag en klik “Gebruik deze hoofdvraag”.</div>
        ) : (
          <>
            <div style={{ marginBottom: 10, opacity: 0.9 }}>
              Hoofdvraag in gebruik: <span style={{ fontWeight: 800 }}>{acceptedHoofdvraag}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {DIMENSIES.map((d) => {
                const dim = d.key;
                const chips = deelvragenByDim[dim] || [];
                const selected = selectedDeelvraagByDim[dim];

                return (
                  <div key={dim} style={{ border: "1px solid #eee", borderRadius: 16, padding: 12 }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>{d.label}</div>

                    {chips.length ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {chips.map((q) => {
                          const active = q === selected;
                          return (
                            <div key={`${dim}:${q}`} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeelvraagByDim((prev) => ({ ...prev, [dim]: q }));
                                }}
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
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Bijprompt (regen deelvragen)</div>
                      <textarea
                        value={bijpromptByDim[dim]}
                        onChange={(e) => setBijpromptByDim((prev) => ({ ...prev, [dim]: e.target.value }))}
                        rows={2}
                        style={{ width: "100%", borderRadius: 12, border: "1px solid #ccc", padding: 10 }}
                        placeholder="Bijv. Focus op rol van SA/geweld..."
                      />
                      <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleGenDeelvraag(dim, false)}
                          disabled={isBusy}
                          style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #111", background: "#fff", cursor: "pointer" }}
                        >
                          Genereer 3 deelvragen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenDeelvraag(dim, true)}
                          disabled={isBusy}
                          style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #111", background: "#fff", cursor: "pointer" }}
                        >
                          Regen (vervang 3)
                        </button>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                        Geselecteerd: <span style={{ fontWeight: 700 }}>{selected || "—"}</span>
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
              <div style={{ fontSize: 12, opacity: 0.85 }}>Voor matchen: selecteer per subdimensie 1 deelvraag-chip.</div>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 16, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Stap 3 — Matchen in 3 kolommen (klik deelvraag → preview bronnen)</div>

        {!acceptedHoofdvraag ? (
          <div style={{ opacity: 0.75 }}>Nog niet actief. Eerst hoofdvraag kiezen + deelvragen selecteren + matchen.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 360px", gap: 12, alignItems: "start" }}>
            <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Deelvragen (categorieën)</div>
              <div style={{ display: "grid", gap: 10 }}>
                {DIMENSIES.map((d) => {
                  const dim = d.key;
                  const q = selectedDeelvraagByDim[dim];
                  const count = (sourcesByDim[dim] || []).length;
                  const selectedN = selectedSourceCount(dim);
                  const isActive = dim === activeDim;

                  return (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => {
                        setActiveDim(dim);
                        setActiveSourceKey(null);
                      }}
                      style={{
                        textAlign: "left",
                        borderRadius: 14,
                        border: isActive ? `2px solid ${dimAccent(dim)}` : "1px solid #e6e6e6",
                        background: dimColor(dim),
                        padding: 12,
                        cursor: "pointer",
                      }}
                      title="Klik om bronnen te previewen"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900, color: dimAccent(dim) }}>{labelShort(d.label)}</div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>{count ? `${count} gevonden` : "—"} · {selectedN} gekozen</div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, lineHeight: 1.25 }}>
                        {q ? q : <span style={{ opacity: 0.7 }}>Geen deelvraag geselecteerd</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                Tip: de bovenste <b>4</b> bronnen markeren we als “meest relevant” (geel). Daarna nog <b>2</b> als “extra” (wit).
              </div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Preview bronnen — {labelShort(DIMENSIES.find((d) => d.key === activeDim)?.label || activeDim)}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                    Deelvraag: <span style={{ fontWeight: 700 }}>{selectedDeelvraagByDim[activeDim] || "—"}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Gevonden: {(sourcesByDim[activeDim] || []).length}</div>
              </div>

              {(sourcesByDim[activeDim] || []).length === 0 ? (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Nog geen bronnen. Klik “Match met bronnen”.</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {activeSourcesTop6.map((s, idx) => {
                    const k = sourceKey(s);
                    const checked = !!(selectedSourceByDim[activeDim] && selectedSourceByDim[activeDim][k]);
                    const isPrimary = idx < 4;
                    const isFocused = activeSourceKey === k;

                    return (
                      <div
                        key={`${k}-${idx}`}
                        style={{
                          borderRadius: 14,
                          border: isFocused ? `2px solid ${dimAccent(activeDim)}` : "1px solid #e9e9e9",
                          background: isPrimary ? "#fff7cc" : "#fff",
                          padding: 10,
                        }}
                      >
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSelectSource(activeDim, s)} style={{ marginTop: 3 }} />

                          <button
                            type="button"
                            onClick={() => setActiveSourceKey(k)}
                            style={{ flex: 1, textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                            title="Klik voor detail rechts"
                          >
                            <div style={{ fontWeight: 800, lineHeight: 1.2 }}>{asString(s.title) || "(zonder titel)"}</div>
                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                              {asString(s.provider) || "?"} · {asString(s.type) || "?"}
                            </div>

                            {s.description ? (
                              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, whiteSpace: "pre-wrap" }}>
                                {asString(s.description).slice(0, 220)}
                                {asString(s.description).length > 220 ? "…" : ""}
                              </div>
                            ) : null}
                          </button>

                          {s.imageUrl ? (
                            <img
                              src={s.imageUrl}
                              alt=""
                              style={{
                                width: 96,
                                height: 72,
                                objectFit: "cover",
                                borderRadius: 10,
                                border: "1px solid #eee",
                                flex: "0 0 auto",
                              }}
                            />
                          ) : null}
                        </div>

                        {s.url ? (
                          <div style={{ marginTop: 8, fontSize: 12 }}>
                            <a href={s.url} target="_blank" rel="noreferrer">
                              open bron
                            </a>
                          </div>
                        ) : null}

                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>{isPrimary ? "meest relevant" : "extra"}</div>
                      </div>
                    );
                  })}

                  {activeSourcesRest.length ? (
                    <div style={{ marginTop: 2 }}>
                      <button
                        type="button"
                        onClick={() => setShowMoreByDim((prev) => ({ ...prev, [activeDim]: !prev[activeDim] }))}
                        style={{ borderRadius: 12, padding: "8px 12px", border: "1px solid #111", background: "#fff", cursor: "pointer" }}
                      >
                        {showMoreByDim[activeDim] ? "Verberg overige bronnen" : `Toon overige bronnen (${activeSourcesRest.length})`}
                      </button>

                      {showMoreByDim[activeDim] ? (
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          {activeSourcesRest.map((s, idx) => {
                            const k = sourceKey(s);
                            const checked = !!(selectedSourceByDim[activeDim] && selectedSourceByDim[activeDim][k]);
                            const isFocused = activeSourceKey === k;

                            return (
                              <div
                                key={`${k}-rest-${idx}`}
                                style={{
                                  borderRadius: 14,
                                  border: isFocused ? `2px solid ${dimAccent(activeDim)}` : "1px solid #e9e9e9",
                                  background: "#fff",
                                  padding: 10,
                                }}
                              >
                                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleSelectSource(activeDim, s)} style={{ marginTop: 3 }} />

                                  <button
                                    type="button"
                                    onClick={() => setActiveSourceKey(k)}
                                    style={{ flex: 1, textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                                    title="Klik voor detail rechts"
                                  >
                                    <div style={{ fontWeight: 800, lineHeight: 1.2 }}>{asString(s.title) || "(zonder titel)"}</div>
                                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                                      {asString(s.provider) || "?"} · {asString(s.type) || "?"}
                                    </div>
                                    {s.description ? (
                                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, whiteSpace: "pre-wrap" }}>
                                        {asString(s.description).slice(0, 160)}
                                        {asString(s.description).length > 160 ? "…" : ""}
                                      </div>
                                    ) : null}
                                  </button>

                                  {s.imageUrl ? (
                                    <img
                                      src={s.imageUrl}
                                      alt=""
                                      style={{
                                        width: 96,
                                        height: 72,
                                        objectFit: "cover",
                                        borderRadius: 10,
                                        border: "1px solid #eee",
                                        flex: "0 0 auto",
                                      }}
                                    />
                                  ) : null}
                                </div>

                                {s.url ? (
                                  <div style={{ marginTop: 8, fontSize: 12 }}>
                                    <a href={s.url} target="_blank" rel="noreferrer">
                                      open bron
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Detail / selectie</div>

              <div style={{ display: "grid", gap: 10 }}>
                {DIMENSIES.map((d) => {
                  const dim = d.key;
                  const n = selectedSourceCount(dim);
                  return (
                    <div key={dim} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
                      <div style={{ fontWeight: 800, color: dimAccent(dim) }}>{labelShort(d.label)}</div>
                      <div style={{ opacity: 0.85 }}>{n} gekozen</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                {activePicked ? (
                  <>
                    <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{asString(activePicked.title) || "(zonder titel)"}</div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      {asString(activePicked.provider) || "?"} · {asString(activePicked.type) || "?"}
                    </div>

                    {activePicked.imageUrl ? (
                      <img
                        src={activePicked.imageUrl}
                        alt=""
                        style={{
                          width: "100%",
                          maxHeight: 220,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid #eee",
                          marginTop: 10,
                        }}
                      />
                    ) : null}

                    {activePicked.url ? (
                      <div style={{ marginTop: 10, fontSize: 12 }}>
                        <a href={activePicked.url} target="_blank" rel="noreferrer">
                          open bron
                        </a>
                      </div>
                    ) : null}

                    {activePicked.description ? (
                      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
                        {asString(activePicked.description)}
                      </div>
                    ) : null}

                    {activePicked.fullText ? (
                      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
                        {asString(activePicked.fullText).slice(0, 900)}
                        {asString(activePicked.fullText).length > 900 ? "…" : ""}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Klik in de middelste kolom op een bron om hier de preview te zien.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 12, fontSize: 12, opacity: 0.8 }}>
        QL03: hoofdvraagchips + bijprompt regen + deelvraagchips per subdimensie + Match met bronnen + 3-koloms match UI met top-4 (geel) + next-2 (wit) + preview met image.
      </div>
    </div>
  );
}


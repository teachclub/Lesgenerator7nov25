import React, { useCallback, useEffect, useMemo, useState } from "react";
import A06_Chips from "../components/A06.Chips";
import A21_TvKaSelect from "../components/A21.TvKaSelect";
import A14_Filters from "../components/A14.Filters";
import A15_RatioPicker from "../components/A15.RatioPicker";
import A20_ExportActions from "../components/A20.ExportActions";
import A18_SelectionPanel from "../components/A18.SelectionPanel";
import A19_GenerateButton from "../components/A19.GenerateButton";
import A22_ChipsetQuickPick from "../components/A22.ChipsetQuickPick";
import A23_MatchBadges from "../components/A23.MatchBadges";
import A24_ParamsView from "../components/A24.ParamsView";
import { addToSelection, clearSelection, removeFromSelection, useSelection } from "../state/selection.store";
import { searchPreset, type SearchPresetRequest, type PresetItem as ApiPresetItem } from "../api/a13.searchPreset";

type PresetItem = {
  id?: string;
  type: "text" | "image";
  title?: string;
  provider?: string;
  url?: string;
  thumb?: string;
  raw?: any;
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export default function PresetZoekerPage() {
  const [query, setQuery] = useState("");
  const [tv, setTv] = useState("");
  const [ka, setKa] = useState("");
  const [onlyText, setOnlyText] = useState(false);
  const [onlySpotprent, setOnlySpotprent] = useState(false);
  const [ratio, setRatio] = useState("1:3");
  const [max, setMax] = useState(6);

  const [chips, setChips] = useState<string[]>([]);
  const [preset, setPreset] = useState<PresetItem[]>([]);
  const [chipsUsed, setChipsUsed] = useState<any[] | null>(null);
  const [paramsSent, setParamsSent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [genResult, setGenResult] = useState<any>(null);

  const selection = useSelection();
  const filters = useMemo(() => ({ onlyText, onlySpotprent }), [onlyText, onlySpotprent]);

  const fetchChips = useCallback(async (q: string, t: string, k: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/chips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, tv: t, ka: k }),
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.chips)) {
        setChips(data.chips);
      } else {
        setChips([]);
      }
    } catch {
      setChips([]);
    }
  }, []);

  const doSearchPreset = useCallback(async (q: string) => {
    setLoading(true);
    setErrorMsg("");
    setChipsUsed(null);
    setParamsSent(null);
    try {
      const body: SearchPresetRequest = {
        query: q,
        limit: max,
        ratio,
        filters,
        tv,
        ka,
      };
      const data = await searchPreset(body);
      if (data?.ok && Array.isArray(data.preset)) {
        const mapped: PresetItem[] = (data.preset as ApiPresetItem[]).map((it) => ({
          id: it.id,
          type: it.type,
          title: it.title,
          provider: it.provider,
          url: it.url,
          thumb: it.thumb,
          raw: it.raw,
        }));
        setPreset(mapped);
        setChipsUsed(Array.isArray(data.chipsUsed) ? data.chipsUsed : null);
        setParamsSent(data.paramsSent ?? null);
      } else {
        setPreset([]);
        if (data?.error) setErrorMsg(String(data.error));
      }
    } catch {
      setPreset([]);
      setErrorMsg("search_failed");
    } finally {
      setLoading(false);
    }
  }, [filters, ka, max, ratio, tv]);

  useEffect(() => {
    const onChip = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail || "";
      const v = String(detail || "").trim();
      if (!v) return;
      setQuery(v);
      doSearchPreset(v);
      fetchChips(v, tv, ka);
    };
    window.addEventListener("chips:click", onChip as EventListener);
    return () => window.removeEventListener("chips:click", onChip as EventListener);
  }, [doSearchPreset, fetchChips, ka, tv]);

  useEffect(() => {
    fetchChips(query, tv, ka);
  }, [fetchChips, query, tv, ka]);

  const addItem = (it: PresetItem) => {
    addToSelection({
      id: it.id,
      type: it.type,
      title: it.title,
      provider: it.provider,
      url: it.url,
      thumb: it.thumb,
    });
  };

  const handleChipsetResult = (payload: {
    ok: boolean;
    items?: Array<{ id?: string; type?: "text" | "image" | string; title?: string; provider?: string; url?: string; thumb?: string; raw?: unknown; }>;
    error?: string;
    paramsSent?: any;
  }) => {
    if (!payload?.ok) {
      setPreset([]);
      setErrorMsg(String(payload?.error || "search_failed"));
      setParamsSent(payload?.paramsSent ?? null);
      return;
    }
    const mapped: PresetItem[] = (payload.items || []).map((it) => ({
      id: it.id,
      type:
        it.type === "text" || it.type === "image"
          ? (it.type as "text" | "image")
          : String(it.type || "").toLowerCase() === "text"
          ? "text"
          : "image",
      title: it.title,
      provider: it.provider,
      url: it.url,
      thumb: it.thumb,
      raw: it.raw,
    }));
    setPreset(mapped);
    setChipsUsed(null);
    setParamsSent(payload?.paramsSent ?? null);
    setErrorMsg("");
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Preset-zoeker</h1>
        <p className="text-sm opacity-80">Zoek in Europeana en stel snel een mix van tekst/beeld samen.</p>
      </header>

      <section className="space-y-4">
        <div className="grid gap-4">
          <A21_TvKaSelect
            tv={tv}
            ka={ka}
            onChange={({ tv: ntv, ka: nka }) => {
              setTv(ntv);
              setKa(nka);
              fetchChips(query, ntv, nka);
            }}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <A14_Filters
              onlyText={onlyText}
              onlySpotprent={onlySpotprent}
              onChange={({ onlyText: ot, onlySpotprent: os }) => {
                setOnlyText(ot);
                setOnlySpotprent(os);
              }}
            />
            <A15_RatioPicker
              ratio={ratio}
              max={max}
              onChange={({ ratio: r, max: m }) => {
                setRatio(r);
                setMax(m);
              }}
            />
          </div>

          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoekterm (bijv. Rembrandt, VOC, spotprent)"
              className="flex-1 border rounded-xl p-2"
            />
            <button
              type="button"
              onClick={() => doSearchPreset(query)}
              className="px-4 py-2 rounded-xl border font-medium"
              disabled={loading || !query.trim()}
              title="Zoek preset"
            >
              {loading ? "Zoeken..." : "Zoek preset"}
            </button>
          </div>

          <A22_ChipsetQuickPick onResult={handleChipsetResult} />
          <A06_Chips chips={chips} />
        </div>
      </section>

      {errorMsg && (
        <div className="border rounded-xl p-3 text-sm">
          Fout: {errorMsg}
        </div>
      )}

      {chipsUsed && (
        <section className="space-y-2">
          <div className="text-sm font-semibold">Gebruikte chips</div>
          <pre className="border rounded-xl p-3 text-xs overflow-auto max-h-48">
            {JSON.stringify(chipsUsed, null, 2)}
          </pre>
        </section>
      )}

      {/* Europeana params (query + qf[]) */}
      {paramsSent && (
        <A24_ParamsView params={paramsSent} />
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Resultaten</h2>
          <A20_ExportActions data={preset} filename={`preset-${(query || "zoek").replace(/\s+/g,"_")}.json`} />
        </div>

        {preset.length === 0 && !loading && (
          <p className="opacity-70 text-sm">Nog geen resultaten.</p>
        )}
        <ul className="grid md:grid-cols-2 gap-3">
          {preset.map((it, idx) => (
            <li key={it.id || `${it.type}-${idx}`} className="border rounded-xl p-3">
              <div className="text-xs uppercase opacity-60">{it.type}</div>
              {it.title && <div className="font-medium">{it.title}</div>}
              {it.provider && <div className="text-sm opacity-70">{it.provider}</div>}
              {it.url && (
                <a href={it.url} target="_blank" rel="noreferrer" className="text-sm underline">
                  Open bron
                </a>
              )}
              {it.thumb && (
                <div className="mt-2">
                  <img src={it.thumb} alt={it.title || "thumb"} className="rounded-lg max-h-40 object-cover" />
                </div>
              )}

              <A23_MatchBadges raw={it.raw} type={it.type} />

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => addItem(it)}
                  className="px-3 py-1.5 border rounded-xl text-sm"
                  title="Voeg toe aan selectie"
                >
                  Voeg toe
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Selectie</h2>
          <div className="flex gap-2">
            <A20_ExportActions data={selection} filename={`selectie-${(query || "zoek").replace(/\s+/g,"_")}.json`} />
            <button
              type="button"
              onClick={() => clearSelection()}
              className="px-3 py-2 border rounded-xl text-sm"
              title="Leeg selectie"
            >
              Leeg selectie
            </button>
          </div>
        </div>

        <A18_SelectionPanel
          selected={selection}
          onRemove={(idx) => removeFromSelection(idx)}
          onClear={() => clearSelection()}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Genereren</h2>
          <A19_GenerateButton
            selection={selection}
            query={query}
            tv={tv}
            ka={ka}
            onResult={(payload) => setGenResult(payload)}
          />
        </div>

        {genResult ? (
          <div className="space-y-2">
            <A20_ExportActions data={genResult} filename={`lesson-${(query || "onderwerp").replace(/\s+/g,"_")}.json`} />
            <pre className="border rounded-xl p-3 text-xs overflow-auto max-h-80">
              {JSON.stringify(genResult, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="opacity-70 text-sm">Nog niets gegenereerd.</p>
        )}
      </section>
    </div>
  );
}


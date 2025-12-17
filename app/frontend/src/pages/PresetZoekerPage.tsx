import { useEffect, useRef, useState } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import { useQueryStore } from "../state/query.store";
import { useSelectionStore } from "../state/selection.store";
import type { Source } from "../types/source";

import { A21TvKaSelect } from "../components/A21.TvKaSelect";
import { SelectionPanel } from "../components/A18.SelectionPanel";

import lessieLogo from "../assets/lessie2000II.png";

interface SearchFilters {
  images: boolean;
  text: boolean;
  kleio: boolean;
  cito: boolean;
  historiek: boolean;
  tv?: string;
  ka?: string;
}

interface SearchPresetResponse {
  ok?: boolean;
  error?: string;
  presets?: {
    id: string;
    label: string;
    terms?: string[];
  }[];
  terms?: string[];
}

const API_BASE = "/api";
const INTRO_COLLAPSE_KEY = "lessie:introCollapsed";

const INTRO_MD = `Lessie 2000 helpt leerlingen hun bril van nu af te zetten en het verleden te begrijpen vanuit de wereld van toen. Lessie zoekt bewust bronnen uit verschillende invalshoeken, zodat leerlingen in groepjes leren contextualiseren, afwegen en hun antwoorden met bronnen onderbouwen. Zo ontstaat discussie en reflectie — en kun jij als docent het gesprek begeleiden op basis van wat leerlingen in de bronnen vinden.

Lessie maakt alles wat je nodig hebt voor jouw les: een docentinstructie, leerlingbladen, een bronnenblad en een antwoordmodel.

---

## Zo werkt het

1. Zoeken – verzamel een rijke set bronnen (liefst 40+ voor de meest diverse selectie).
2. Krijg 3 lesvoorstellen – Lessie maakt 3 lesvoorstellen rondom een hoofdvraag die aansluit bij je leerlingen (met een vleugje presentisme).
3. Selecteren – verwijder of bewaar bronnen. Refinement – pas taalniveau of focus aan.
4. Genereren – Lessie genereert een docentinstructie → leerlingenbladen → bronnenblad → antwoordmodel.

---

## Meer uitleg

Wil je achtergrond bij historisch redeneren en ‘het vreemde verleden’? Bekijk Tim Huijgens aanpak (pdf):
https://expertisecentrum-geschiedenis.nl/wp-content/uploads/VreemdeVerleden.pdf
`;

const PresetZoekerPage: FC = () => {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useQueryStore();
  const { sources, setSources, clearSelection } = useSelectionStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDetailSource, setSelectedDetailSource] = useState<Source | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    images: true,
    text: true,
    kleio: true,
    cito: true,
    historiek: true,
  });

  const [lastUsedTerms, setLastUsedTerms] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [introCollapsed, setIntroCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(INTRO_COLLAPSE_KEY);
      if (v === "1") setIntroCollapsed(true);
    } catch {}
  }, []);

  const setCollapsedPersist = (collapsed: boolean) => {
    setIntroCollapsed(collapsed);
    try {
      localStorage.setItem(INTRO_COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {}
  };

  const handleTvKaSelect = (selection: { tv?: string; ka?: string; kaTitel?: string }) => {
    const kaRaw = selection.ka ? String(selection.ka).trim() : "";
    const kaCanon = kaRaw ? `KA${kaRaw.replace(/^KA/i, "")}` : undefined;

    setFilters((prev) => ({ ...prev, tv: selection.tv, ka: kaCanon }));
    if (kaCanon) setSearchQuery(kaCanon);
  };

  const insertOperator = (op: string) => {
    const newQuery = `${searchQuery} ${op} `;
    setSearchQuery(newQuery);
    searchInputRef.current?.focus();
  };

  const handleSearch = async () => {
    const hasUserQuery = typeof searchQuery === "string" && searchQuery.trim().length > 0;
    const hasTvOrKa = !!(filters.tv || filters.ka);

    if (!hasUserQuery && !hasTvOrKa) {
      setError("Vul een zoekwoord in of kies een tijdvak/KA.");
      return;
    }

    setLoading(true);
    setError("");
    clearSelection();
    setSelectedDetailSource(null);

    try {
      let terms: string[] = [];

      const presetBody: any = {};
      if (hasUserQuery) presetBody.query = searchQuery!.trim();
      if (filters.tv) presetBody.tv = filters.tv;
      if (filters.ka) presetBody.ka = filters.ka;

      try {
        const presetRes = await fetch(`${API_BASE}/search-preset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(presetBody),
        });

        if (presetRes.ok) {
          const presetData: SearchPresetResponse = await presetRes.json();

          if (presetData.ok && Array.isArray(presetData.presets)) {
            terms = presetData.presets
              .flatMap((p) => p.terms || [])
              .map((t) => String(t).trim())
              .filter((t) => t.length > 0);
          }

          if (terms.length === 0 && Array.isArray(presetData.terms)) {
            terms = presetData.terms.map((t) => String(t).trim()).filter((t) => t.length > 0);
          }
        } else {
          console.warn("[PresetZoeker] search-preset niet bruikbaar:", presetRes.status);
        }
      } catch (presetErr) {
        console.warn("[PresetZoeker] search-preset faalde, fallback", presetErr);
      }

      if (terms.length === 0) {
        if (hasUserQuery) terms = [searchQuery!.trim()];
        else if (filters.ka) terms = [filters.ka];
      }

      if (terms.length === 0) {
        setError("Geen geldige zoektermen gevonden. Pas je zoekopdracht of KA/tijdvak aan.");
        setLastUsedTerms([]);
        setLoading(false);
        return;
      }

      setLastUsedTerms(terms);

      const searchRes = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: terms,
          filters: filters,
        }),
      });

      if (!searchRes.ok) throw new Error(`search fout: ${searchRes.status}`);

      const searchData = await searchRes.json();
      setSources(searchData.sources || []);
    } catch (err: unknown) {
      console.error("[PresetZoeker] fout bij zoeken", err);
      setError("Er ging iets mis bij het zoeken. Controleer of /api/search beschikbaar is.");
      setLastUsedTerms([]);
    } finally {
      setLoading(false);
    }
  };

  const getDetailImageUrl = (source: Source) => {
    if (!source.imageUrl) return undefined;
    const url = source.imageUrl;

    if (url.includes("profile/picture")) return undefined;

    const isCito =
      source.provider === "Cito" || (typeof source.id === "string" && source.id.startsWith("cito"));
    const isKleio = source.provider === "Kleio" || url.includes("kleio") || url.includes("vgn");

    if (isCito || isKleio) return `${API_BASE}/image-proxy?url=${encodeURIComponent(url)}`;
    return url;
  };

  const handleSelectSource = async (s: Source) => {
    setSelectedDetailSource(s);

    const provider = String((s as any).provider || "");
    const url = (s as any).url ? String((s as any).url) : "";
    if (provider !== "Kleio" || !url.includes("vgnkleio.nl/bronnen/")) return;

    setDetailLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/source-detail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await resp.json().catch(() => ({} as any));

      if (resp.ok && j && j.ok && typeof j.fullText === "string" && j.fullText.trim().length > 0) {
        setSelectedDetailSource((prev) => {
          if (!prev || (prev as any).id !== (s as any).id) return prev;
          return { ...(prev as any), fullText: j.fullText, title: j.title || (prev as any).title } as any;
        });
      }
    } catch (e) {
      console.warn("[PresetZoeker] source-detail faalde", e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGoToProposals = () => {
    const limitedSources = (sources || []).slice(0, 40);

    navigate("/proposals", {
      state: {
        tvKa: { tv: filters.tv || undefined, ka: filters.ka || undefined },
        conceptHint: searchQuery || "",
        sources: limitedSources,
      },
    });
  };

  const canMakeProposals = !loading && (sources?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden flex flex-col">
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={lessieLogo} alt="Lessie 2000" className="h-28 w-auto select-none" draggable={false} />
          <span className="sr-only">Lessie 2000</span>
        </div>
        <div />
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 shrink-0">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">{introCollapsed ? "Wie is Lessie? verborgen" : "Wie is Lessie?"}</div>
            <button
              onClick={() => setCollapsedPersist(!introCollapsed)}
              className="text-sm font-bold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              {introCollapsed ? "Toon uitleg" : "Klap dicht"}
            </button>
          </div>

          {!introCollapsed && (
            <div className="px-6 pb-5">
              <div className="prose prose-sm max-w-none text-gray-800">
                <ReactMarkdown
                  components={{
                    h2: (props) => <h2 className="text-base font-bold mt-5 mb-2 leading-snug" {...props} />,
                    h3: (props) => <h3 className="text-sm font-bold mt-4 mb-2 leading-snug" {...props} />,
                    strong: (props) => <strong className="font-bold" {...props} />,
                    ol: (props) => <ol className="list-decimal list-outside pl-5 space-y-2" {...props} />,
                    ul: (props) => <ul className="list-disc list-outside pl-5 space-y-2" {...props} />,
                  }}
                >
                  {INTRO_MD}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          <div className="col-span-3 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tijdvak en KA</label>
              <div className="text-xs text-gray-600 mb-3">
                Kies eerst een tijdvak/KA. Daarna kun je de zoekopdracht verfijnen met extra woorden.
              </div>
              <A21TvKaSelect onSelect={handleTvKaSelect} />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Zoekopdracht</label>
              <div className="text-xs text-gray-600 mb-2">Optioneel: verfijn met woorden of operators (AND/OR/NOT).</div>

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Bijv. Luther AND aflaten"
                className="w-full p-2 border border-gray-300 rounded text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />

              <div className="flex gap-2 mb-3">
                {["AND", "OR", "NOT"].map((op) => (
                  <button
                    key={op}
                    onClick={() => insertOperator(op)}
                    className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
                  >
                    {op}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className={`w-full font-bold py-3 rounded text-sm transition-all flex items-center justify-center gap-2 ${
                  loading ? "bg-gray-100 text-gray-500 cursor-wait" : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span> Lessie speurt...
                  </>
                ) : (
                  "🚀 Start Zoeken"
                )}
              </button>

              <button
                onClick={handleGoToProposals}
                disabled={!canMakeProposals}
                className={`w-full mt-3 font-bold py-3 rounded text-sm transition-all flex items-center justify-center gap-2 ${
                  canMakeProposals
                    ? "bg-black text-white hover:scale-[1.01] active:scale-[0.99]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                title={canMakeProposals ? "Maak lesvoorstellen op basis van je gevonden bronnen" : "Zoek eerst bronnen en wacht tot zoeken klaar is"}
              >
                Maak Lesvoorstellen ({sources.length}) →
              </button>

              {!canMakeProposals && (
                <div className="text-xs text-gray-500 mt-2">Zoek eerst bronnen en wacht tot het zoeken klaar is.</div>
              )}
            </div>

            <div className="bg-white p-3 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 space-y-1">
              <div className="font-bold mb-1">Debug zoektermen</div>
              <div>
                <span className="font-semibold">TV:</span> {filters.tv ?? <span className="text-gray-400">–</span>}
              </div>
              <div>
                <span className="font-semibold">KA:</span> {filters.ka ?? <span className="text-gray-400">–</span>}
              </div>
              <div>
                <span className="font-semibold">Query:</span> {searchQuery ? searchQuery : <span className="text-gray-400">–</span>}
              </div>
              <div className="mt-1">
                <span className="font-semibold">Terms → /api/search:</span>
                {lastUsedTerms.length === 0 ? (
                  <span className="text-gray-400"> nog niets uitgevoerd</span>
                ) : (
                  <ul className="list-disc list-inside">
                    {lastUsedTerms.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-1">
                <span className="font-semibold">Providers:</span>{" "}
                {[
                  filters.kleio ? "Kleio" : null,
                  filters.cito ? "Cito" : null,
                  filters.historiek ? "Historiek" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || <span className="text-gray-400">–</span>}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type Bron</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filters.images}
                      onChange={(e) => setFilters({ ...filters, images: e.target.checked })}
                    />
                    Afbeeldingen
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filters.text}
                      onChange={(e) => setFilters({ ...filters, text: e.target.checked })}
                    />
                    Tekstbronnen
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Herkomst</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filters.kleio}
                      onChange={(e) => setFilters({ ...filters, kleio: e.target.checked })}
                    />
                    Kleio
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filters.cito}
                      onChange={(e) => setFilters({ ...filters, cito: e.target.checked })}
                    />
                    Cito
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filters.historiek}
                      onChange={(e) => setFilters({ ...filters, historiek: e.target.checked })}
                    />
                    Historiek
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-4 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-700">Resultaten</h2>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{sources.length}</span>
            </div>
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
                <span className="text-4xl mb-2">📡</span>
                <p>Zoeken in Kleio, Cito &amp; Historiek...</p>
              </div>
            ) : (
              <SelectionPanel onSelectSource={(s: any) => handleSelectSource(s)} selectedId={selectedDetailSource?.id} />
            )}
          </div>

          <div className="col-span-5 bg-white overflow-y-auto p-8">
            {selectedDetailSource ? (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="mb-6 border-b pb-4">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1 block">
                    {selectedDetailSource.type} • {selectedDetailSource.provider}
                    {detailLoading ? " • laden…" : ""}
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{selectedDetailSource.title}</h1>
                </div>

                {getDetailImageUrl(selectedDetailSource) && (
                  <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img
                      src={getDetailImageUrl(selectedDetailSource)}
                      alt=""
                      className="w-full max-h-[400px] object-contain bg-gray-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>
                    {selectedDetailSource.fullText ||
                      selectedDetailSource.content ||
                      selectedDetailSource.description ||
                      "Geen tekst beschikbaar."}
                  </ReactMarkdown>
                </div>

                {(selectedDetailSource as any).url && (
                  <div className="mt-8 pt-4 border-t">
                    <a
                      href={(selectedDetailSource as any).url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline"
                    >
                      Bekijk originele bron ↗
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <span className="text-6xl mb-4">👈</span>
                <p className="text-lg font-medium">Selecteer een bron om details te bekijken</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PresetZoekerPage;


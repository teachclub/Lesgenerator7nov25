import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryStore } from "../state/query.store";
import { useSelectionStore, Source } from "../state/selection.store";
import { A21TvKaSelect } from "../components/A21.TvKaSelect";
import { SelectionPanel } from "../components/A18.SelectionPanel";
import ReactMarkdown from "react-markdown";

interface SearchFilters {
  images: boolean;
  text: boolean;
  kleio: boolean;
  cito: boolean;
  tv?: string;
  ka?: string;
}

// Gebruik de Vite-proxy i.p.v. hard-coded host
const API_BASE = "/api";

export const PresetZoekerPage: React.FC = () => {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useQueryStore();
  const { sources, setSources, clearSelection } = useSelectionStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDetailSource, setSelectedDetailSource] =
    useState<Source | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    images: true,
    text: true,
    kleio: true,
    cito: true,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleTvKaSelect = (selection: {
    tv?: string;
    ka?: string;
    kaTitel?: string;
  }) => {
    setFilters((prev) => ({ ...prev, tv: selection.tv, ka: selection.ka }));
    if (selection.ka) setSearchQuery(`KA${selection.ka}`);
  };

  const insertOperator = (op: string) => {
    const newQuery = `${searchQuery} ${op} `;
    setSearchQuery(newQuery);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleSearch = async () => {
    if (!searchQuery) return;

    setLoading(true);
    setError("");
    clearSelection();
    setSelectedDetailSource(null);

    try {
      // 1) Probeer optioneel de preset-service
      let terms: string[] = [searchQuery];

      try {
        const presetRes = await fetch(`${API_BASE}/search-preset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        });

        if (presetRes.ok) {
          const presetData = await presetRes.json();
          const candidate = presetData.terms;

          if (Array.isArray(candidate) && candidate.length > 0) {
            terms = candidate.map((t) => String(t));
          }
        } else {
          // 404 / 500 etc.: gewoon loggen en doorgaan met originele query
          console.warn(
            "[PresetZoeker] search-preset niet bruikbaar:",
            presetRes.status
          );
        }
      } catch (presetErr) {
        console.warn(
          "[PresetZoeker] search-preset faalde, fallback naar originele query",
          presetErr
        );
      }

      // 2) Altijd zoeken via /api/search, met of zonder presets
      const searchRes = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: terms,
          filters: filters,
        }),
      });

      if (!searchRes.ok) {
        throw new Error(`search fout: ${searchRes.status}`);
      }

      const searchData = await searchRes.json();
      // searchData.sources bevat hier al Kleio + Cito (afhankelijk van filters)
      setSources(searchData.sources || []);
    } catch (err: unknown) {
      console.error("[PresetZoeker] fout bij zoeken", err);
      setError(
        "Er ging iets mis bij het zoeken. Controleer of de backend draait en of /api/search beschikbaar is."
      );
    } finally {
      setLoading(false);
    }
  };

  const getDetailImageUrl = (source: Source) => {
    if (!source.imageUrl) return undefined;
    const url = source.imageUrl;

    if (url.includes("profile/picture")) return undefined;

    const isCito =
      source.provider === "Cito" ||
      (typeof source.id === "string" && source.id.startsWith("cito"));
    const isKleio =
      source.provider === "Kleio" ||
      url.includes("kleio") ||
      url.includes("vgn");

    if (isCito || isKleio) {
      return `${API_BASE}/image-proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
  };

  const handleGoToProposals = () => {
    // Combineer alle huidige bronnen (Kleio + Cito) en beperk tot max. 40
    const limitedSources = (sources || []).slice(0, 40);

    navigate("/proposals", {
      state: {
        tv: filters.tv || null,
        ka: filters.ka || null,
        // Gebruik de huidige zoekopdracht als didactische hint
        conceptHint: searchQuery || "",
        // Deze array wordt in ProposalsPage doorgestuurd naar /api/proposals-v2
        sources: limitedSources,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden flex flex-col">
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦁</span>
          <h1 className="text-lg font-bold tracking-tight">
            Kleio Lesgenerator <span className="text-indigo-600">V2</span>
          </h1>
        </div>
        {sources.length > 0 && (
          <button
            onClick={handleGoToProposals}
            className="bg-black text-white text-sm font-bold px-4 py-2 rounded-lg shadow hover:scale-105 transition-transform"
          >
            Maak Lesvoorstellen ({sources.length}) →
          </button>
        )}
      </header>

      <main className="flex-1 grid grid-cols-12 h-full overflow-hidden">
        <div className="col-span-3 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              Zoekopdracht
            </label>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bijv. KA49..."
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
              disabled={loading || !searchQuery}
              className={`w-full font-bold py-3 rounded text-sm transition-all flex items-center justify-center gap-2 ${
                loading
                  ? "bg-gray-100 text-gray-500 cursor-wait"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span> Grabbelton...
                </>
              ) : (
                "🚀 Start Zoeken"
              )}
            </button>
          </div>

          <A21TvKaSelect onSelect={handleTvKaSelect} />

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Type Bron
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filters.images}
                    onChange={(e) =>
                      setFilters({ ...filters, images: e.target.checked })
                    }
                  />
                  Afbeeldingen
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filters.text}
                    onChange={(e) =>
                      setFilters({ ...filters, text: e.target.checked })
                    }
                  />
                  Tekstbronnen
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Herkomst
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filters.kleio}
                    onChange={(e) =>
                      setFilters({ ...filters, kleio: e.target.checked })
                    }
                  />
                  Kleio
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filters.cito}
                    onChange={(e) =>
                      setFilters({ ...filters, cito: e.target.checked })
                    }
                  />
                  Cito
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-700">Resultaten</h2>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
              {sources.length}
            </span>
          </div>
          {error && (
            <div className="text-red-500 text-sm mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
              <span className="text-4xl mb-2">📡</span>
              <p>Zoeken in Kleio &amp; Cito...</p>
            </div>
          ) : (
            <SelectionPanel
              onSelectSource={(s) => setSelectedDetailSource(s)}
              selectedId={selectedDetailSource?.id}
            />
          )}
        </div>

        <div className="col-span-5 bg-white overflow-y-auto p-8">
          {selectedDetailSource ? (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="mb-6 border-b pb-4">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1 block">
                  {selectedDetailSource.type} • {selectedDetailSource.provider}
                </span>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {selectedDetailSource.title}
                </h1>
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

              {selectedDetailSource.url && (
                <div className="mt-8 pt-4 border-t">
                  <a
                    href={selectedDetailSource.url}
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
              <p className="text-lg font-medium">
                Selecteer een bron om details te bekijken
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};


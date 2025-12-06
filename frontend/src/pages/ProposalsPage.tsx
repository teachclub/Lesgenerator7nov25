import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelectionStore, Source } from "../state/selection.store";

const API_BASE = "http://127.0.0.1:8081/api";

type ProposalDeelvraag = {
  vraag: string;
  dimensie: string;
  subdimensie: string;
};

type ProposalLeeropbrengst = {
  id?: string;
  beschrijving: string;
  deelvraagIndex: number | null;
};

type ProposalConcept = {
  id: string;
  title: string;
  hook: string;
  hoofdvraag: string;
  deelvragen?: ProposalDeelvraag[];
  leeropbrengsten?: ProposalLeeropbrengst[];
  contextLabel?: string;
  targetAudience?: string;
  masterSignature?: string;
  tv?: string;
  ka?: string;
  primarySourceIds?: Array<string | number>;
};

type LessonProposal = {
  id: string;
  concept: ProposalConcept;
  sourceIds: Array<string | number>;
  primarySourceIds?: Array<string | number>;
};

type ProposalsMeta = {
  countAll?: number;
  countProposals?: number;
  masterSignature?: string;
  from?: string;
};

type ProposalsResponse = {
  allSources?: Source[];
  proposals?: LessonProposal[];
  meta?: ProposalsMeta;
};

export const ProposalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sources } = useSelectionStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [allSources, setAllSources] = useState<Source[]>([]);
  const [proposals, setProposals] = useState<LessonProposal[]>([]);
  const [meta, setMeta] = useState<ProposalsMeta | undefined>(undefined);

  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null
  );
  const [selectedSourceId, setSelectedSourceId] = useState<
    string | number | null
  >(null);

  // Map van id → bron (zowel uit allSources als uit globale store, fallback)
  const sourceMap = useMemo(() => {
    const map = new Map<string, Source>();
    const add = (s: Source) => {
      if (!s) return;
      const key = String(s.id);
      if (!map.has(key)) {
        map.set(key, s);
      }
    };

    (allSources || []).forEach(add);
    (sources || []).forEach(add);

    return map;
  }, [allSources, sources]);

  const selectedProposal = useMemo(
    () => proposals.find((p) => p.id === selectedProposalId) || null,
    [proposals, selectedProposalId]
  );

  const selectedSource: Source | null = useMemo(() => {
    if (!selectedSourceId) return null;
    const key = String(selectedSourceId);
    return sourceMap.get(key) || null;
  }, [selectedSourceId, sourceMap]);

  const getDetailImageUrl = (source: Source | null | undefined) => {
    if (!source || !source.imageUrl) return undefined;
    const url = source.imageUrl;

    if (url.includes("profile/picture")) return undefined;

    const isCito =
      source.provider === "Cito" ||
      String(source.id).toLowerCase().startsWith("cito");
    const isKleio =
      source.provider === "Kleio" ||
      url.includes("kleio") ||
      url.includes("vgn");

    if (isCito || isKleio) {
      return `${API_BASE}/image-proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
  };

  // Proposals ophalen bij eerste load
  useEffect(() => {
    const fetchProposals = async () => {
      if (!sources || sources.length === 0) {
        setError(
          "Er zijn geen bronnen uit de zoekpagina meegestuurd. Ga terug naar de zoekpagina en voer eerst een zoekactie uit."
        );
        return;
      }

      setLoading(true);
      setError("");
      setSelectedProposalId(null);
      setSelectedSourceId(null);

      try {
        const res = await fetch(`${API_BASE}/proposals-v2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // tv, ka eventueel later toevoegen uit een store
            sources,
          }),
        });

        if (!res.ok) {
          throw new Error(`proposals-v2 fout: ${res.status}`);
        }

        const data = (await res.json()) as ProposalsResponse;

        const all = data.allSources || [];
        let props = data.proposals || [];

        // Beperk aantal bronnen per voorstel tot max. 15 + sync primarySourceIds
        props = props.map((p, idx) => {
          const sourceIdsTrimmed = (p.sourceIds || []).slice(0, 15);
          const sourceIdSet = new Set(sourceIdsTrimmed.map((id) => String(id)));
          const primaryFiltered = (p.primarySourceIds || []).filter((id) =>
            sourceIdSet.has(String(id))
          );
          return {
            id: p.id || `p${idx + 1}`,
            concept: p.concept,
            sourceIds: sourceIdsTrimmed,
            primarySourceIds: primaryFiltered,
          };
        });

        setAllSources(all);
        setProposals(props);
        setMeta(data.meta);
        if (props.length > 0) {
          setSelectedProposalId(props[0].id);
          const firstSourceId = props[0].sourceIds[0];
          if (firstSourceId != null) {
            setSelectedSourceId(firstSourceId);
          }
        }
      } catch (err: any) {
        console.error("[ProposalsPage] fout bij ophalen proposals", err);
        setError(
          "Er ging iets mis bij het ophalen van lesvoorstellen. Controleer of de backend draait."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [sources]);

  const handleRemoveSource = (proposalId: string, sourceId: string | number) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== proposalId) return p;
        const sourceIds = (p.sourceIds || []).filter(
          (id) => String(id) !== String(sourceId)
        );
        const primarySourceIds = (p.primarySourceIds || []).filter(
          (id) => String(id) !== String(sourceId)
        );
        return { ...p, sourceIds, primarySourceIds };
      })
    );

    if (String(selectedSourceId) === String(sourceId)) {
      setSelectedSourceId(null);
    }
  };

  const handleSelectSource = (sourceId: string | number) => {
    setSelectedSourceId(sourceId);
  };

  const handleUseProposal = (proposal: LessonProposal) => {
    // Filter globale bronnen op basis van proposal.sourceIds
    const idSet = new Set((proposal.sourceIds || []).map((id) => String(id)));
    const filteredSources = (sources || []).filter((s) =>
      idSet.has(String(s.id))
    );

    navigate("/lesson", {
      state: {
        concept: proposal.concept,
        sources: filteredSources,
      },
    });
  };

  const masterSig = meta?.masterSignature || "–";
  const sourceCountGemini = meta?.countAll ?? allSources.length;
  const globalSourceCount = sources.length;
  const fromLabel = meta?.from || "onbekend";

  // Voor de middenkolom: primary ⭐ eerst, daarna de rest
  const sortedSourceIdsForSelected = useMemo(() => {
    if (!selectedProposal) return [];
    const primarySet = new Set(
      (selectedProposal.primarySourceIds || []).map((id) => String(id))
    );
    const ids = [...(selectedProposal.sourceIds || [])];
    ids.sort((a, b) => {
      const aPrimary = primarySet.has(String(a));
      const bPrimary = primarySet.has(String(b));
      if (aPrimary === bPrimary) return 0;
      return aPrimary ? -1 : 1; // primary bovenaan
    });
    return ids;
  }, [selectedProposal]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦁</span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Lesvoorstellen <span className="text-indigo-600">LesGO v2</span>
            </h1>
            <p className="text-xs text-gray-500">
              gegenereerd op basis van je Kleio/Cito-bronnen (v6-keten)
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-gray-500">
          <div>
            keten-signature: <span className="font-mono">{masterSig}</span>{" "}
            <span className="text-[10px] text-gray-400">
              (verwacht: v6MP6dec)
            </span>
          </div>
          <div>
            bron: <span className="font-mono">{fromLabel}</span>
          </div>
          <div className="mt-1 text-[11px]">
            debug → sources→Gemini:{" "}
            <span className="font-mono">{sourceCountGemini}</span> (global
            store: <span className="font-mono">{globalSourceCount}</span>)
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 grid grid-cols-12 h-full overflow-hidden">
        {/* LINKERKANT – proposals-lijst */}
        <section className="col-span-4 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
              Lesvoorstellen
            </h2>
            <button
              onClick={() => navigate(-1)}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              ← Terug naar zoeken
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded mb-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
              <span className="text-4xl mb-2">🧠</span>
              <p className="text-sm text-center">
                LesGO is lesvoorstellen aan het bedenken op basis van je
                bronnen...
              </p>
            </div>
          ) : proposals.length === 0 ? (
            <p className="text-xs text-gray-500">
              Nog geen lesvoorstellen beschikbaar. Ga terug naar de zoekpagina
              en voer een zoekactie uit.
            </p>
          ) : (
            <div className="space-y-3">
              {proposals.map((p, index) => {
                const isActive = p.id === selectedProposalId;
                const concept = p.concept || ({} as ProposalConcept);
                const count = p.sourceIds?.length || 0;
                const primaryCount = p.primarySourceIds?.length || 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProposalId(p.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="font-bold text-sm text-gray-900">
                        {concept.title || `Lesvoorstel ${index + 1}`}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-mono">
                        {count} bronnen{primaryCount ? ` • ${primaryCount} ⭐` : ""}
                      </span>
                    </div>
                    {concept.contextLabel && (
                      <p className="text-[11px] text-gray-500 mb-1">
                        {concept.contextLabel}
                      </p>
                    )}
                    {concept.hook && (
                      <p className="text-xs text-gray-700 mb-1 italic">
                        {concept.hook}
                      </p>
                    )}
                    {concept.hoofdvraag && (
                      <p className="text-xs text-gray-800">
                        <span className="font-semibold">Hoofdvraag: </span>
                        {concept.hoofdvraag}
                      </p>
                    )}
                    {concept.leeropbrengsten &&
                      concept.leeropbrengsten.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {concept.leeropbrengsten.slice(0, 3).map((lo, idx2) => (
                            <li
                              key={lo.id || idx2}
                              className="text-[11px] text-gray-600 flex gap-1"
                            >
                              <span className="mt-[2px]">•</span>
                              <span>{lo.beschrijving}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-[10px] text-gray-500">
                        Doelgroep: {concept.targetAudience || "Havo/Vwo"}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600">
                        Details & bronnen →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* MIDDEN – aanbevolen bronnen per voorstel */}
        <section className="col-span-4 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-2">
            Aanbevolen bronnen bij dit voorstel
          </h2>

          {!selectedProposal ? (
            <p className="text-xs text-gray-500">
              Selecteer links een lesvoorstel om de bijbehorende bronnen te
              bekijken.
            </p>
          ) : sortedSourceIdsForSelected.length === 0 ? (
            <p className="text-xs text-gray-500">
              Dit voorstel heeft op dit moment geen geselecteerde bronnen meer.
              Kies een ander voorstel of ga terug naar de zoekpagina.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedSourceIdsForSelected.map((id) => {
                const src = sourceMap.get(String(id)) || null;
                const isPrimary = (selectedProposal.primarySourceIds || []).some(
                  (pid) => String(pid) === String(id)
                );

                const typeLabel = src?.type || "";
                const isText =
                  (src?.type || "").toString().toUpperCase() === "TEXT";
                const thumbUrl = !isText ? getDetailImageUrl(src) : undefined;

                const title =
                  src?.title || src?.description || src?.content || `Bron ${id}`;
                const provider = src?.provider || "Onbekend";

                const baseCardClasses =
                  "border rounded-lg p-2 flex items-start gap-2 hover:border-indigo-200";
                const primaryClasses = isPrimary
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-white border-gray-200";

                return (
                  <div
                    key={String(id)}
                    className={`${baseCardClasses} ${primaryClasses}`}
                  >
                    {/* Thumbnail links – beeldbronnen krijgen afbeelding, TEXT bronnen een T-vierkant */}
                    <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                      {isText ? (
                        <span className="text-lg font-bold text-gray-500">T</span>
                      ) : thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : null}
                    </div>

                    {/* Tekstblok + meta */}
                    <button
                      onClick={() => handleSelectSource(id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        {isPrimary && (
                          <span
                            className="text-[11px]"
                            title="Kernbron (topbron bij deze hoofdvraag)"
                          >
                            ⭐
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-gray-500">
                          #{String(id)}
                        </span>
                        {typeLabel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {typeLabel}
                          </span>
                        )}
                        {provider && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                            {provider}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-gray-900 line-clamp-2">
                        {title}
                      </div>
                      {src?.description && (
                        <div className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
                          {src.description}
                        </div>
                      )}
                    </button>

                    {/* Verwijderknop */}
                    <button
                      onClick={() => handleRemoveSource(selectedProposal.id, id)}
                      className="text-gray-400 hover:text-red-500 text-xs px-1"
                      title="Verwijder deze bron uit dit voorstel"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RECHTS – detailpreview + knop 'Gebruik dit voorstel' */}
        <section className="col-span-4 bg-white overflow-y-auto p-6 flex flex-col">
          {!selectedProposal ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
              <span className="text-6xl mb-3">👈</span>
              <p className="text-sm text-center max-w-xs">
                Kies links een lesvoorstel om bronnen te verkennen en er één te
                gebruiken als basis voor je les.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 border-b border-gray-100 pb-3">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  {selectedProposal.concept.title}
                </h2>
                <p className="text-xs text-gray-500 mb-1">
                  Hoofdvraag:{" "}
                  <span className="italic">
                    {selectedProposal.concept.hoofdvraag}
                  </span>
                </p>
                {selectedProposal.concept.contextLabel && (
                  <p className="text-[11px] text-gray-500">
                    Context: {selectedProposal.concept.contextLabel}
                  </p>
                )}
              </div>

              <div className="flex-1 mb-4 overflow-y-auto">
                {!selectedSource ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300">
                    <span className="text-5xl mb-2">👆</span>
                    <p className="text-sm text-center max-w-xs">
                      Klik in het midden op een bron om een voorbeeld te zien
                      (afbeelding + tekst).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-[11px] text-indigo-600 font-bold uppercase tracking-wide mb-1">
                        {selectedSource.type} • {selectedSource.provider}
                      </div>
                      <h3 className="text-base font-bold text-gray-900">
                        {selectedSource.title ||
                          selectedSource.description ||
                          "Bron zonder titel"}
                      </h3>
                    </div>

                    {(() => {
                      const isText =
                        (selectedSource.type || "")
                          .toString()
                          .toUpperCase() === "TEXT";
                      const url = !isText
                        ? getDetailImageUrl(selectedSource)
                        : undefined;
                      if (!url) return null;
                      return (
                        <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                          <img
                            src={url}
                            alt=""
                            className="w-full max-h-[320px] object-contain bg-gray-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      );
                    })()}

                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedSource.fullText ||
                        selectedSource.content ||
                        selectedSource.description ||
                        "Geen tekst beschikbaar voor deze bron."}
                    </div>

                    {selectedSource.url && (
                      <div className="pt-2 border-t border-gray-100">
                        <a
                          href={selectedSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                        >
                          Bekijk originele bron ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <div className="text-[11px] text-gray-500">
                  Dit voorstel gebruikt momenteel{" "}
                    <span className="font-mono">
                      {selectedProposal.sourceIds.length}
                    </span>{" "}
                  bronnen.
                </div>
                <button
                  onClick={() => handleUseProposal(selectedProposal)}
                  disabled={selectedProposal.sourceIds.length === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform ${
                    selectedProposal.sourceIds.length === 0
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-black text-white hover:scale-105"
                  }`}
                >
                  Gebruik dit lesvoorstel →
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default ProposalsPage;


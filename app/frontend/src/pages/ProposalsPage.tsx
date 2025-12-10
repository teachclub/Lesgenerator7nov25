import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelectionStore, Source } from "../state/selection.store";

// Gebruik de Vite-proxy i.p.v. hard-coded host
const API_BASE = "/api";

type Deelvraag = {
  vraag: string;
  dimensie?: string;
  subdimensie?: string;
};

type Leeropbrengst = {
  id?: string;
  beschrijving: string;
  deelvraagIndex: number | null;
};

type ProposalConcept = {
  id: string;
  title: string;
  hook?: string;
  hoofdvraag: string;
  deelvragen?: Deelvraag[];
  leeropbrengsten?: Leeropbrengst[];
  contextLabel?: string;
  targetAudience?: string;
  masterSignature: string;
  tv?: string;
  ka?: string;
};

type Proposal = {
  id: string;
  concept: ProposalConcept;
  sourceIds: Array<string | number>;
  primarySourceIds?: Array<string | number>;
};

type ProposalsResponse = {
  allSources: Source[];
  proposals: Proposal[];
  meta: {
    countAll: number;
    countProposals: number;
    masterSignature: string;
    from: "gemini" | "dummy-fallback";
    error?: string;
  };
};

type ProposalsLocationState = {
  tv?: string | null;
  ka?: string | null;
  conceptHint?: string;
  sources?: Source[];
};

const ProposalsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as ProposalsLocationState;

  // Global store – zelfde als in de zoekpagina
  const { sources: globalSources } = useSelectionStore();

  // Bronnen die we daadwerkelijk richting backend sturen:
  // voorkeur: global store; fallback: state uit navigate()
  const effectiveSources: Source[] =
    (globalSources && globalSources.length > 0
      ? globalSources
      : navState.sources) || [];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allSources, setAllSources] = useState<Source[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [meta, setMeta] = useState<ProposalsResponse["meta"] | null>(null);

  const [selectedProposalId, setSelectedProposalId] =
    useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<
    string | number | null
  >(null);

  // Bronnen die je voor een bepaald voorstel "weggooit"
  // key = proposalId, value = Set van verborgen bron-ids (als string)
  const [hiddenByProposal, setHiddenByProposal] = useState<
    Record<string, Set<string>>
  >({});

  const proposalsListRef = useRef<HTMLDivElement | null>(null);

  // Proposals ophalen bij eerste mount
  useEffect(() => {
    const run = async () => {
      if (!effectiveSources || effectiveSources.length === 0) {
        setError(
          "Geen bronnen gevonden om lesvoorstellen mee te maken. Ga eerst terug en doe een zoekopdracht."
        );
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/proposals-v2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tv: navState.tv ?? null,
            ka: navState.ka ?? null,
            conceptHint: navState.conceptHint ?? "",
            sources: effectiveSources,
          }),
        });

        if (!res.ok) {
          throw new Error(`Proposals API fout: ${res.status}`);
        }

        const data: ProposalsResponse = await res.json();

        setAllSources(data.allSources || []);
        setProposals(data.proposals || []);
        setMeta(data.meta || null);

        if (data.proposals && data.proposals.length > 0) {
          setSelectedProposalId(data.proposals[0].id);
        }
      } catch (err: any) {
        console.error("[ProposalsPage] fout bij ophalen proposals", err);
        setError(
          "Er ging iets mis bij het maken van lesvoorstellen. Controleer de backend-log voor details."
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [effectiveSources, navState.tv, navState.ka, navState.conceptHint]);

  const handleSelectProposal = (id: string) => {
    setSelectedProposalId(id);
    setSelectedSourceId(null);
    if (proposalsListRef.current) {
      proposalsListRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const selectedProposal = useMemo(
    () => proposals.find((p) => p.id === selectedProposalId) || null,
    [proposals, selectedProposalId]
  );

  // Geselecteerde voorstel altijd bovenaan tonen
  const orderedProposals: Proposal[] = useMemo(() => {
    if (!selectedProposalId) return proposals;
    const selected = proposals.find((p) => p.id === selectedProposalId);
    if (!selected) return proposals;
    const rest = proposals.filter((p) => p.id !== selectedProposalId);
    return [selected, ...rest];
  }, [proposals, selectedProposalId]);

  // Helpers voor "weggooien" van bronnen
  const isHiddenForSelectedProposal = (sourceId: string | number): boolean => {
    if (!selectedProposalId) return false;
    const set = hiddenByProposal[selectedProposalId];
    if (!set) return false;
    return set.has(String(sourceId));
  };

  const hideSourceForSelectedProposal = (sourceId: string | number) => {
    if (!selectedProposalId) return;
    setHiddenByProposal((prev) => {
      const currentSet = prev[selectedProposalId]
        ? new Set(prev[selectedProposalId])
        : new Set<string>();
      currentSet.add(String(sourceId));
      return {
        ...prev,
        [selectedProposalId]: currentSet,
      };
    });
    if (String(selectedSourceId) === String(sourceId)) {
      setSelectedSourceId(null);
    }
  };

  // Bronnen van de geselecteerde proposal (nog zonder weggegooide filter)
  const selectedProposalSources: Source[] = useMemo(() => {
    if (!selectedProposal) return [];

    const setIds = new Set(
      (selectedProposal.sourceIds || []).map((id) => String(id))
    );

    return allSources.filter((s) => setIds.has(String(s.id)));
  }, [selectedProposal, allSources]);

  // Primary eerst, dan de rest – max 15 tonen – minus weggegooide bronnen
  const sortedRecommendationSources: Source[] = useMemo(() => {
    if (!selectedProposal) return [];

    const primaryIds = new Set(
      (selectedProposal.primarySourceIds || []).map((id) => String(id))
    );

    const hiddenSet = selectedProposalId
      ? hiddenByProposal[selectedProposalId] || new Set<string>()
      : new Set<string>();

    const primary: Source[] = [];
    const rest: Source[] = [];

    for (const src of selectedProposalSources) {
      if (hiddenSet.has(String(src.id))) continue;
      if (primaryIds.has(String(src.id))) {
        primary.push(src);
      } else {
        rest.push(src);
      }
    }

    const combined = [...primary, ...rest];
    return combined.slice(0, 15);
  }, [selectedProposal, selectedProposalSources, hiddenByProposal, selectedProposalId]);

  // Geselecteerde bron-detail
  const selectedSource: Source | null = useMemo(() => {
    if (!selectedSourceId) return null;
    return (
      allSources.find((s) => String(s.id) === String(selectedSourceId)) || null
    );
  }, [selectedSourceId, allSources]);

  // IMAGE-URL voor kaarten en detail
  const getImageUrl = (source: Source) => {
    if (!source.imageUrl) return undefined;
    if (source.type === "TEXT") return undefined;

    const url = source.imageUrl;
    if (url.includes("profile/picture")) return undefined;

    const isCito =
      source.provider === "Cito" || String(source.id).startsWith("cito");
    const isKleio =
      source.provider === "Kleio" ||
      (url && (url.includes("kleio") || url.includes("vgn")));

    if (isCito || isKleio) {
      return `${API_BASE}/image-proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
  };

  /**
   * Gebruik dit lesvoorstel → naar /lesson
   * Belangrijk v7.1-regel:
   * Alles wat de gebruiker "weggooit" bij dit voorstel gaat NIET mee naar step1/2/3/4.
   */
  const handleUseProposal = (proposal: Proposal) => {
    // Welke bronnen zijn expliciet weggegooid voor dit proposal?
    const hiddenSet = hiddenByProposal[proposal.id] || new Set<string>();

    // Filter de sourceIds van dit proposal op basis van hiddenSet
    const visibleSourceIds = proposal.sourceIds.filter(
      (id) => !hiddenSet.has(String(id))
    );
    const visibleIdSet = new Set(visibleSourceIds.map((id) => String(id)));

    // Pak alleen de bronnen die bij dit voorstel horen én niet zijn weggegooid
    const proposalSources = allSources.filter((s) =>
      visibleIdSet.has(String(s.id))
    );

    navigate("/lesson", {
      state: {
        concept: proposal.concept,
        sources: proposalSources,
        tvKa: {
          tv: navState.tv ? Number(navState.tv) : null,
          tvLabel: proposal.concept.tv,
          ka: navState.ka ?? null,
          kaLabel: proposal.concept.ka,
        },
        meta: {
          from: "proposals",
          masterSignature: meta?.masterSignature,
          chainSignature: meta?.masterSignature,
        },
      },
    });
  };

  const renderLeeropbrengsten = (los?: Leeropbrengst[]) => {
    if (!los || los.length === 0) return null;
    return (
      <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
        {los.map((lo) => (
          <li key={lo.id || lo.beschrijving.slice(0, 30)}>
            {lo.beschrijving}
          </li>
        ))}
      </ul>
    );
  };

  const proposalsSourceCount = selectedProposalSources.length;
  const globalSourceCount = effectiveSources.length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦁</span>
          <div>
            <h1 className="font-bold tracking-tight">
              Lesvoorstellen{" "}
              <span className="text-indigo-600">Lessie / LesGO v2</span>
            </h1>
            <p className="text-xs text-gray-500">
              gegenereerd op basis van je Kleio/Cito-bronnen (v7-keten,
              masterprompt v7.1)
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-gray-500">
          <div>
            keten-signature:{" "}
            <span className="font-mono font-semibold">
              {meta?.masterSignature || "n.v.t."}
            </span>
          </div>
          <div>
            bron:{" "}
            <span className="font-semibold">
              {meta?.from === "dummy-fallback" ? "dummy-fallback" : "gemini"}
            </span>
          </div>
          <div className="text-[11px] mt-1">
            debug → sources→Gemini:{" "}
            <span className="font-mono">{proposalsSourceCount || 0}</span> (effective
            sources: <span className="font-mono">{globalSourceCount}</span>)
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Linkerkolom – proposals */}
        <section className="col-span-4 border-r border-gray-200 bg-white overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Lesvoorstellen
            </h2>
            <button
              onClick={() => navigate(-1)}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              ← Terug naar zoeken
            </button>
          </div>

          {loading && (
            <div className="text-sm text-gray-500">
              Lesvoorstellen worden gemaakt…
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              <strong>Fout:</strong> {error}
            </div>
          )}

          {!loading && !error && orderedProposals.length === 0 && (
            <div className="text-sm text-gray-500">
              Geen lesvoorstellen ontvangen van de backend.
            </div>
          )}

          <div className="space-y-3 mt-2" ref={proposalsListRef}>
            {orderedProposals.map((p) => {
              const isSelected = p.id === selectedProposalId;
              const concept = p.concept;
              const los = concept.leeropbrengsten || [];

              return (
                <div
                  key={p.id}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-indigo-500 shadow-md bg-indigo-50/60"
                      : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                  }`}
                  onClick={() => handleSelectProposal(p.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-sm">
                        {concept.title || "Lesvoorstel"}
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {concept.contextLabel || ""}
                      </p>
                    </div>
                    <div className="text-[11px] text-gray-500 text-right">
                      <div>
                        {p.sourceIds.length} bronnen •{" "}
                        {(p.primarySourceIds || []).length} ⭐
                      </div>
                    </div>
                  </div>

                  {concept.hook && (
                    <p className="mt-2 text-xs italic text-gray-700">
                      {concept.hook}
                    </p>
                  )}

                  {concept.hoofdvraag && (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold text-gray-600 uppercase">
                        Hoofdvraag
                      </p>
                      <p className="text-sm text-gray-800">
                        {concept.hoofdvraag}
                      </p>
                    </div>
                  )}

                  {renderLeeropbrengsten(los)}

                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-[11px] text-gray-500">
                      Doelgroep: {concept.targetAudience || "Havo/vwo bovenbouw"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseProposal(p);
                      }}
                      className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      Gebruik dit lesvoorstel →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Middenkolom – aanbevolen bronnen */}
        <section className="col-span-4 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Aanbevolen bronnen bij dit voorstel
          </h2>

          {selectedProposal && sortedRecommendationSources.length === 0 && (
            <p className="text-sm text-gray-500">
              Geen bronnen gevonden voor dit voorstel.
            </p>
          )}

          <div className="space-y-3">
            {sortedRecommendationSources.map((src) => {
              const isPrimary = (selectedProposal?.primarySourceIds || []).some(
                (id) => String(id) === String(src.id)
              );
              const imgUrl = getImageUrl(src);

              return (
                <div
                  key={src.id}
                  className={`border rounded-lg p-2 flex gap-2 items-stretch cursor-pointer transition-all ${
                    isPrimary
                      ? "bg-yellow-50 border-yellow-300"
                      : "bg-white border-gray-200 hover:border-indigo-200"
                  }`}
                  onClick={() => setSelectedSourceId(src.id)}
                >
                  <div className="w-16 h-16 rounded-md overflow-hidden flex items-center justify-center bg-gray-100 border border-gray-200 shrink-0">
                    {src.type === "TEXT" || !imgUrl ? (
                      <span className="text-xl font-bold text-gray-400">T</span>
                    ) : (
                      <img
                        src={imgUrl}
                        alt={src.title || ""}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        {isPrimary && (
                          <span className="text-yellow-500" title="Kernbron">
                            ⭐
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-gray-500">
                          #{src.id}
                        </span>
                        {src.type && (
                          <span className="uppercase font-semibold">
                            {src.type}
                          </span>
                        )}
                        {src.provider && (
                          <span className="text-indigo-600 font-semibold">
                            {src.provider}
                          </span>
                        )}
                      </div>
                      <button
                        className="text-[11px] text-gray-400 hover:text-red-500"
                        title="Bron weggooien uit deze selectie"
                        onClick={(e) => {
                          e.stopPropagation();
                          hideSourceForSelectedProposal(src.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {src.title || "Zonder titel"}
                    </p>
                    <p className="text-[11px] text-gray-600 line-clamp-2">
                      {src.snippet ||
                        src.description ||
                        src.fullText?.slice(0, 120) ||
                        "Geen korte beschrijving beschikbaar."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Rechterkolom – bron-detail */}
        <section className="col-span-4 bg-white overflow-y-auto p-6">
          {!selectedSource ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <span className="text-6xl mb-3">👈</span>
              <p className="text-sm font-medium">
                Klik op een bron in de middelste kolom voor details
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="mb-4 border-b pb-3">
                <div className="text-[11px] text-gray-500 flex gap-2 items-center mb-1">
                  {selectedSource.type && (
                    <span className="uppercase font-semibold">
                      {selectedSource.type}
                    </span>
                  )}
                  {selectedSource.provider && (
                    <span className="text-indigo-600 font-semibold">
                      {selectedSource.provider}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-gray-400">
                    #{selectedSource.id}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedSource.title || "Zonder titel"}
                </h2>
              </div>

              {getImageUrl(selectedSource) && (
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img
                    src={getImageUrl(selectedSource)}
                    alt={selectedSource.title || ""}
                    className="w-full max-h-[420px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="prose prose-sm max-w-none text-gray-800">
                <p>
                  {selectedSource.fullText ||
                    selectedSource.content ||
                    selectedSource.description ||
                    selectedSource.snippet ||
                    "Geen toelichting beschikbaar."}
                </p>
              </div>

              {selectedSource.url && (
                <div className="mt-6 pt-4 border-t">
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline text-sm"
                  >
                    Bekijk originele bron ↗
                  </a>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ProposalsPage;


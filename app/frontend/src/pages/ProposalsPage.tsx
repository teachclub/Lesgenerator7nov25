import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ==== Types ====

type TvKaInfo = {
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
};

type RawSource = {
  id: string | number;
  provider?: string;
  type?: string;
  title?: string;
  description?: string;
  fullText?: string;
  content?: string;
  url?: string | null;
  imageUrl?: string | null;
};

type LessonProposal = {
  id: string;
  hoofdvraag: string;
  hook: string;
  context: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
  lesopbrengst?: string;
  bronIds: Array<string | number>;
  primarySourceIds: Array<string | number>;
  complexityLevel: number;
  nuanceLevel: number;
};

type ProposalsResponsePayload = {
  step?: string;
  data?: {
    proposals?: any[];
    allSources?: RawSource[];
    meta?: {
      coreSourceIds?: Array<string | number>;
      tv?: string;
      ka?: string;
    };
  };
  error?: string;
};

// ==== Helpers ====

function isImageSource(source: RawSource): boolean {
  if (!source) return false;
  if (source.imageUrl) return true;
  const t = (source.type || "").toLowerCase();
  return t.includes("image") || t === "foto" || t === "afbeelding";
}

/**
 * Bepaalt de daadwerkelijke img-src:
 * - Eerst imageUrl (zoals uit presearch / Kleio-proxy)
 * - Anders, als het een image-type is en er is een url: via /api/image-proxy
 */
function getImageSrc(source: RawSource): string | null {
  if (!source) return null;

  if (source.imageUrl) {
    return source.imageUrl;
  }

  const t = (source.type || "").toLowerCase();
  const isImgType =
    t.includes("image") || t === "foto" || t === "afbeelding";

  if (isImgType && source.url) {
    const encoded = encodeURIComponent(source.url);
    return `/api/image-proxy?url=${encoded}`;
  }

  return null;
}

function makePreviewText(source: RawSource): string {
  const text =
    source.description ||
    source.fullText ||
    source.content ||
    source.title ||
    "";
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (trimmed.length <= 160) return trimmed;
  return trimmed.slice(0, 157) + "...";
}

// Alles uit raw.concept.* halen, met fallback op raw.* en default tv/ka
function normalizeProposal(raw: any, defaultTvKa: TvKaInfo): LessonProposal {
  const concept = raw.concept || {};

  const tv = concept.tv || raw.tv || defaultTvKa.tv || "";
  const tvLabel = concept.tvLabel || raw.tvLabel || defaultTvKa.tvLabel || "";
  const ka = concept.ka || raw.ka || defaultTvKa.ka || "";
  const kaLabel = concept.kaLabel || raw.kaLabel || defaultTvKa.kaLabel || "";

  const hoofdvraag: string =
    concept.hoofdvraag ||
    concept.hoofdVraag ||
    raw.hoofdvraag ||
    raw.hoofdVraag ||
    raw.hoofd_vraag ||
    "";

  const hook: string = concept.hook || raw.hook || "";
  const context: string = concept.context || raw.context || "";

  const lesopbrengst: string =
    concept.lesopbrengst ||
    concept.lesOpbrengst ||
    concept.lesdoel ||
    concept.lesdoelen ||
    raw.lesopbrengst ||
    raw.lesOpbrengst ||
    raw.lesdoel ||
    raw.lesdoelen ||
    "";

  // BronIds: oude namen + nieuwe schema (sourceIds)
  const bronIds: Array<string | number> = Array.isArray(raw.bronIds)
    ? raw.bronIds
    : Array.isArray(raw.bronnenIds)
    ? raw.bronnenIds
    : Array.isArray(raw.sourceIds)
    ? raw.sourceIds
    : Array.isArray(concept.bronIds)
    ? concept.bronIds
    : [];

  // Kernbronnen: nieuwe schema primarySourceIds
  const primarySourceIds: Array<string | number> = Array.isArray(
    raw.primarySourceIds
  )
    ? raw.primarySourceIds
    : [];

  return {
    id:
      raw.id ||
      "proposal-" +
        Math.random()
          .toString(36)
          .slice(2, 10),
    hoofdvraag,
    hook,
    context,
    tv,
    tvLabel,
    ka,
    kaLabel,
    lesopbrengst,
    bronIds,
    primarySourceIds,
    complexityLevel: 3,
    nuanceLevel: 3,
  };
}

// ==== Component ====

const ProposalsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as {
    sources?: RawSource[];
    tvKa?: TvKaInfo;
  };

  const initialSources: RawSource[] = state.sources || [];
  const initialTvKa: TvKaInfo = state.tvKa || {};

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasRequested, setHasRequested] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [proposals, setProposals] = useState<LessonProposal[]>([]);
  const [allSources, setAllSources] = useState<RawSource[]>(initialSources);

  const [activeSourceIds, setActiveSourceIds] = useState<
    Set<string | number>
  >(() => new Set(initialSources.map((s) => s.id)));

  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null
  );
  const [selectedSourceId, setSelectedSourceId] = useState<
    string | number | null
  >(null);

  const MAX_SOURCES_PER_PROPOSAL = 15;

  // ==== Data ophalen van backend (/api/proposals-v2) ====
  useEffect(() => {
    if (hasRequested) return;
    if (!initialSources || initialSources.length === 0) return;

    const run = async () => {
      try {
        setHasRequested(true);
        setIsLoading(true);
        setError(null);

        const resp = await fetch("/api/proposals-v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tvKa: initialTvKa,
            sources: initialSources,
          }),
        });

        const raw = (await resp.json()) as ProposalsResponsePayload;

        if (!resp.ok || raw.error) {
          throw new Error(
            raw.error ||
              `Backend-fout bij proposals-v2 (status ${resp.status})`
          );
        }

        const payload = raw.data || (raw as any);

        const backendSources: RawSource[] = Array.isArray(payload.allSources)
          ? payload.allSources
          : initialSources;

        const proposalsRaw: any[] = Array.isArray(payload.proposals)
          ? payload.proposals
          : [];

        if (proposalsRaw.length === 0) {
          throw new Error("Backend gaf geen lesvoorstellen terug.");
        }

        const normalizedProposals = proposalsRaw.map((p) =>
          normalizeProposal(p, initialTvKa)
        );

        setProposals(normalizedProposals);
        setAllSources(backendSources);

        const initialActive = new Set<string | number>(
          backendSources.map((s) => s.id)
        );
        setActiveSourceIds(initialActive);

        if (normalizedProposals[0]) {
          setSelectedProposalId(normalizedProposals[0].id);
        }
      } catch (err: any) {
        console.error("[ProposalsPage] fout:", err);
        setError(
          err.message || "Onbekende fout bij het laden van voorstellen."
        );
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [hasRequested, initialSources, initialTvKa]);

  // ==== Derived state ====

  const selectedProposal: LessonProposal | null = useMemo(() => {
    if (!selectedProposalId || proposals.length === 0) return null;
    return (
      proposals.find((p) => p.id === selectedProposalId) || proposals[0] || null
    );
  }, [proposals, selectedProposalId]);

  // Geselecteerd voorstel bovenaan
  const sortedProposals: LessonProposal[] = useMemo(() => {
    if (!selectedProposal) return proposals;
    const rest = proposals.filter((p) => p.id !== selectedProposal.id);
    return [selectedProposal, ...rest];
  }, [proposals, selectedProposal]);

  // Bepaal set met kernbronnen:
  // - primair: primarySourceIds uit backend
  // - fallback: eerste helft van bronIds (oude gedrag)
  const coreIdsForSelected: Set<string> = useMemo(() => {
    if (!selectedProposal) return new Set();

    const primary = selectedProposal.primarySourceIds || [];
    if (primary.length > 0) {
      return new Set(primary.map((id) => String(id)));
    }

    const ids = selectedProposal.bronIds || [];
    if (ids.length === 0) return new Set();

    const coreCount = Math.min(
      Math.max(3, Math.floor(MAX_SOURCES_PER_PROPOSAL / 2)),
      ids.length
    );
    const coreSlice = ids.slice(0, coreCount).map((id) => String(id));
    return new Set(coreSlice);
  }, [selectedProposal]);

  const selectedProposalSources: RawSource[] = useMemo(() => {
    if (!selectedProposal) return [];

    const relevantIds =
      selectedProposal.bronIds && selectedProposal.bronIds.length > 0
        ? new Set(selectedProposal.bronIds.map((id: any) => String(id)))
        : null;

    const filtered = allSources.filter((s) => {
      if (!activeSourceIds.has(s.id)) return false;
      if (relevantIds) return relevantIds.has(String(s.id));
      return true;
    });

    const limited = filtered.slice(0, MAX_SOURCES_PER_PROPOSAL);

    const core: RawSource[] = [];
    const nonCore: RawSource[] = [];

    for (const s of limited) {
      if (coreIdsForSelected.has(String(s.id))) core.push(s);
      else nonCore.push(s);
    }

    return [...core, ...nonCore];
  }, [selectedProposal, allSources, activeSourceIds, coreIdsForSelected]);

  const selectedSource: RawSource | null = useMemo(() => {
    if (!selectedSourceId) return null;
    return (
      allSources.find((s) => String(s.id) === String(selectedSourceId)) || null
    );
  }, [selectedSourceId, allSources]);

  // ==== Handlers ====

  const handleSelectProposal = (id: string) => {
    setSelectedProposalId(id);
    setSelectedSourceId(null);
  };

  const handleToggleSource = (sourceId: string | number) => {
    setActiveSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });

    if (selectedSourceId === sourceId) {
      setSelectedSourceId(null);
    }
  };

  const handleUseProposal = (proposal: LessonProposal) => {
    const relevantIds =
      proposal.bronIds && proposal.bronIds.length > 0
        ? new Set(proposal.bronIds.map((id: any) => String(id)))
        : null;

    const selectedSources = allSources.filter((s) => {
      if (!activeSourceIds.has(s.id)) return false;
      if (relevantIds) return relevantIds.has(String(s.id));
      return true;
    });

    const limitedSources = selectedSources.slice(0, MAX_SOURCES_PER_PROPOSAL);

    const concept = {
      hoofdvraag: proposal.hoofdvraag,
      hook: proposal.hook,
      context: proposal.context,
      tv: proposal.tv,
      tvLabel: proposal.tvLabel,
      ka: proposal.ka,
      kaLabel: proposal.kaLabel,
      lesopbrengst: proposal.lesopbrengst,
      complexityLevel: proposal.complexityLevel,
      nuanceLevel: proposal.nuanceLevel,
    };

    navigate("/lesson", {
      state: {
        tvKa: initialTvKa,
        concept,
        sources: limitedSources,
      },
    });
  };

  const handleRefineProposal = async (proposalId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;

    try {
      setError(null);

      const body = {
        tvKa: {
          tv: proposal.tv || initialTvKa.tv,
          tvLabel: proposal.tvLabel || initialTvKa.tvLabel,
          ka: proposal.ka || initialTvKa.ka,
          kaLabel: proposal.kaLabel || initialTvKa.kaLabel,
        },
        originalConcept: {
          hoofdvraag: proposal.hoofdvraag,
          hook: proposal.hook,
          context: proposal.context,
          tv: proposal.tv || initialTvKa.tv,
          tvLabel: proposal.tvLabel || initialTvKa.tvLabel,
          ka: proposal.ka || initialTvKa.ka,
          kaLabel: proposal.kaLabel || initialTvKa.kaLabel,
          lesopbrengst: proposal.lesopbrengst || "",
        },
        complexityLevel: proposal.complexityLevel,
        nuanceLevel: proposal.nuanceLevel,
      };

      const resp = await fetch("/api/generate-lesson-v2/refine-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (resp.status === 404) {
        console.warn(
          "[ProposalsPage] refine-concept route (nog) niet beschikbaar (404)"
        );
        setError(
          "AI-verfijning van hoofdvraag/toon is nog niet aangesloten op de backend. " +
            "De schuifjes en 'Pas aan met AI'-knop gaan werken zodra die route is gebouwd."
        );
        return;
      }

      const data = await resp.json();

      if (!resp.ok || data.error) {
        throw new Error(
          data.error ||
            `Backend-fout bij refine-concept (status ${resp.status})`
        );
      }

      const payload = data.data || data;
      const concept = payload.concept || payload;

      setProposals((prev) =>
        prev.map((p) => {
          if (p.id !== proposalId) return p;
          return {
            ...p,
            hoofdvraag: concept.hoofdvraag || p.hoofdvraag,
            hook: concept.hook || p.hook,
            context: concept.context || p.context,
            tv: concept.tv || p.tv,
            tvLabel: concept.tvLabel || p.tvLabel,
            ka: concept.ka || p.ka,
            kaLabel: concept.kaLabel || p.kaLabel,
            lesopbrengst: concept.lesopbrengst || p.lesopbrengst,
          };
        })
      );
    } catch (err: any) {
      console.error("[ProposalsPage] refine-fout:", err);
      setError(
        err.message || "Er ging iets mis bij het verfijnen van de hoofdvraag."
      );
    }
  };

  const handleChangeComplexity = (proposalId: string, value: number) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId ? { ...p, complexityLevel: value } : p
      )
    );
  };

  const handleChangeNuance = (proposalId: string, value: number) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId ? { ...p, nuanceLevel: value } : p
      )
    );
  };

  // ==== Render ====

  if (!initialSources || initialSources.length === 0) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <h1>Lesvoorstellen</h1>
        <p>Er zijn geen bronnen doorgegeven vanuit de zoekstap.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Lesvoorstellen</h1>
      <p style={{ marginBottom: "1rem", maxWidth: "900px" }}>
        Kies één lesvoorstel, stel eventueel taalniveau en nuance bij en
        genereer daarna het lesmateriaal. In de middelste kolom zie je de
        bronnen bij het gekozen voorstel. De geel gemarkeerde bronnen met ster
        worden als meest richtinggevend gezien.
      </p>

      {error && (
        <div
          style={{
            marginBottom: "0.75rem",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            backgroundColor: "#ffe6e6",
            border: "1px solid #ffb3b3",
            color: "#660000",
          }}
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{ marginBottom: "0.75rem" }}>
          Lesvoorstellen laden…
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.2fr) minmax(0, 1.3fr) minmax(0, 1.2fr)",
          gap: "1rem",
        }}
      >
        {/* Kolom 1 – Lesvoorstellen */}
        <div>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            1. Kies een lesvoorstel
          </h2>

          {sortedProposals.map((proposal) => {
            const isSelected = selectedProposal?.id === proposal.id;
            const cardBg = isSelected ? "#e6f0ff" : "#f7f7f7";
            const cardBorder = isSelected ? "#5b8def" : "#dddddd";

            return (
              <div
                key={proposal.id}
                onClick={() => handleSelectProposal(proposal.id)}
                style={{
                  marginBottom: "0.75rem",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: `1px solid ${cardBorder}`,
                  backgroundColor: cardBg,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "0.5rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <strong style={{ fontSize: "0.95rem" }}>
                    {proposal.hoofdvraag || "Hoofdvraag ontbreekt"}
                  </strong>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "999px",
                        backgroundColor: "#5b8def",
                        color: "white",
                      }}
                    >
                      Geselecteerd
                    </span>
                  )}
                </div>

                {proposal.hook && (
                  <p
                    style={{
                      fontSize: "0.85rem",
                      marginBottom: "0.25rem",
                      fontStyle: "italic",
                    }}
                  >
                    Hook: {proposal.hook}
                  </p>
                )}

                {proposal.context && (
                  <p
                    style={{
                      fontSize: "0.85rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Context: {proposal.context}
                  </p>
                )}

                {proposal.lesopbrengst && (
                  <p
                    style={{
                      fontSize: "0.85rem",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <strong>Lesopbrengst:</strong> {proposal.lesopbrengst}
                  </p>
                )}

                {/* Refinement-instellingen (alleen schuifjes) */}
                <div
                  style={{
                    marginTop: "0.5rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr)",
                      gap: "0.4rem",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "0.8rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.15rem",
                      }}
                    >
                      Taal/complexiteit (1 = eenvoudiger, 5 = abstracter)
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={proposal.complexityLevel}
                        onChange={(e) =>
                          handleChangeComplexity(
                            proposal.id,
                            Number(e.target.value)
                          )
                        }
                      />
                      <span style={{ fontSize: "0.75rem" }}>
                        Huidig: {proposal.complexityLevel}
                      </span>
                    </label>

                    <label
                      style={{
                        fontSize: "0.8rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.15rem",
                      }}
                    >
                      Nuance (1 = stelliger, 5 = genuanceerder)
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={proposal.nuanceLevel}
                        onChange={(e) =>
                          handleChangeNuance(
                            proposal.id,
                            Number(e.target.value)
                          )
                        }
                      />
                      <span style={{ fontSize: "0.75rem" }}>
                        Huidig: {proposal.nuanceLevel}
                      </span>
                    </label>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.4rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRefineProposal(proposal.id)}
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.35rem 0.6rem",
                        borderRadius: "999px",
                        border: "1px solid #5b8def",
                        backgroundColor: "#edf3ff",
                        color: "#21427a",
                        cursor: "pointer",
                      }}
                    >
                      Pas aan met AI
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUseProposal(proposal)}
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.35rem 0.6rem",
                        borderRadius: "999px",
                        border: "none",
                        backgroundColor: "#2563eb",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Gebruik dit lesvoorstel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kolom 2 – Bronnen bij geselecteerd voorstel */}
        <div>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            2. Bronnen bij het gekozen voorstel
          </h2>

          {!selectedProposal && (
            <p style={{ fontSize: "0.85rem" }}>
              Kies eerst een lesvoorstel in de eerste kolom.
            </p>
          )}

          {selectedProposal && selectedProposalSources.length === 0 && (
            <p style={{ fontSize: "0.85rem" }}>
              Er zijn geen actieve bronnen meer voor dit voorstel. Zet eventueel
              bronnen weer "aan" of kies een ander voorstel.
            </p>
          )}

          {selectedProposal &&
            selectedProposalSources.map((s) => {
              const isCore = coreIdsForSelected.has(String(s.id));
              const isActive = activeSourceIds.has(s.id);
              const preview = makePreviewText(s);
              const imgSrc = getImageSrc(s);

              const bg = !isActive
                ? "#f3f3f3"
                : isCore
                ? "#fff8d5"
                : "#ffffff";
              const border = isCore ? "#f0c96b" : "#dddddd";

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSourceId(s.id)}
                  style={{
                    marginBottom: "0.5rem",
                    padding: "0.6rem",
                    borderRadius: "0.65rem",
                    border: `1px solid ${border}`,
                    backgroundColor: bg,
                    opacity: isActive ? 1 : 0.6,
                    cursor: "pointer",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(0,0,0,0.06)",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={s.title || "bronafbeelding"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        }}
                      >
                        T
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.4rem",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            marginBottom: "0.15rem",
                            wordBreak: "break-word",
                          }}
                        >
                          {s.title || `Bron ${String(s.id)}`}
                        </div>

                        {s.provider && (
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "#555555",
                              marginBottom: "0.15rem",
                            }}
                          >
                            {s.provider}
                          </div>
                        )}

                        {preview && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#333333",
                              wordBreak: "break-word",
                            }}
                          >
                            {preview}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.2rem",
                          alignItems: "flex-end",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isCore && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#b38700",
                            }}
                          >
                            ★
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleSource(s.id)}
                          title={
                            isActive
                              ? "Bron uitsluiten uit de les"
                              : "Bron weer toevoegen aan de les"
                          }
                          style={{
                            border: "none",
                            background: "transparent",
                            color: isActive ? "#b00020" : "#4caf50",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          {isActive ? "✕" : "⤴"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Kolom 3 – Bron-detail */}
        <div>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            3. Detailweergave bron
          </h2>

          {!selectedSource && (
            <p style={{ fontSize: "0.85rem" }}>
              Klik in de middelste kolom op een bron om hier de uitgebreide
              weergave te zien (zoals in de presearch).
            </p>
          )}

          {selectedSource && (
            <div
              style={{
                borderRadius: "0.75rem",
                border: "1px solid #dddddd",
                padding: "0.75rem",
                backgroundColor: "#fafafa",
              }}
            >
              {(() => {
                const imgSrc = getImageSrc(selectedSource);
                if (!imgSrc) return null;
                return (
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      borderRadius: "0.75rem",
                      overflow: "hidden",
                      border: "1px solid rgba(0,0,0,0.06)",
                      maxHeight: "220px",
                    }}
                  >
                    <img
                      src={imgSrc}
                      alt={selectedSource.title || "bronafbeelding"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                );
              })()}

              <h3
                style={{
                  fontSize: "0.95rem",
                  marginBottom: "0.25rem",
                  wordBreak: "break-word",
                }}
              >
                {selectedSource.title || `Bron ${String(selectedSource.id)}`}
              </h3>

              {selectedSource.provider && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#555",
                    marginBottom: "0.25rem",
                  }}
                >
                  {selectedSource.provider}
                </div>
              )}

              <div
                style={{
                  fontSize: "0.85rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {selectedSource.fullText ||
                  selectedSource.content ||
                  selectedSource.description ||
                  "Geen extra tekst beschikbaar voor deze bron."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalsPage;


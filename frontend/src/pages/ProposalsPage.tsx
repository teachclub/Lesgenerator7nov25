import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelectionStore, Source as StoreSource } from "../state/selection.store";

type Source = StoreSource;

type Deelvraag = {
  vraag: string;
  dimensie: string;
  subdimensie: string;
};

type Leeropbrengst = {
  id?: string;
  beschrijving: string;
  deelvraagIndex: number | null;
};

type ProposalConcept = {
  id: string;
  title: string;
  hook: string;
  hoofdvraag: string;
  deelvragen?: Deelvraag[];
  leeropbrengsten?: Leeropbrengst[];
  contextLabel?: string;
  targetAudience?: string;
  masterSignature?: string;
  tv?: string;
  ka?: string;
  primarySourceIds?: (string | number)[];
};

type LessonProposal = {
  id: string;
  concept: ProposalConcept;
  sourceIds: (string | number)[];
  primarySourceIds: (string | number)[];
};

type ProposalsMeta = {
  countAll?: number;
  countProposals?: number;
  masterSignature?: string;
  from?: "gemini" | "dummy-fallback" | string;
  isDummy?: boolean;
  error?: string;
};

type ProposalsResponse = {
  allSources?: Source[];
  proposals?: LessonProposal[];
  meta?: ProposalsMeta;
};

type LocationState = {
  tv?: string | number | null;
  ka?: string | number | null;
  conceptHint?: string;
  sources?: Source[];
  results?: Source[];
  allSources?: Source[];
  [key: string]: any;
};

const API_BASE_URL = "http://127.0.0.1:8081/api";

const ProposalsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as LocationState;

  // 🔹 Fallback: haal bronnen uit de globale selectie-store als state leeg is
  const globalSources = useSelectionStore((s) => s.sources || []);

  const [data, setData] = useState<ProposalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDummyWarning, setShowDummyWarning] = useState(true);

  const tv = state.tv ?? null;
  const ka = state.ka ?? null;
  const conceptHint = state.conceptHint ?? "";

  // 🔹 Bepaal welke bronnen we daadwerkelijk naar de backend sturen
  const initialSources: Source[] = useMemo(() => {
    // 1) Alles wat expliciet via navigate(...) is meegegeven
    if (Array.isArray(state.sources) && state.sources.length > 0) {
      return state.sources;
    }
    if (Array.isArray(state.results) && state.results.length > 0) {
      return state.results;
    }
    if (Array.isArray(state.allSources) && state.allSources.length > 0) {
      return state.allSources;
    }

    // 2) Fallback: gebruik de globale store (PresetZoekerPage → useSelectionStore)
    if (Array.isArray(globalSources) && globalSources.length > 0) {
      return globalSources;
    }

    return [];
  }, [state, globalSources]);

  const limitedSources = useMemo(
    () => initialSources.slice(0, 40),
    [initialSources]
  );

  const apiBody = useMemo(
    () => ({
      tv,
      ka,
      conceptHint,
      sources: limitedSources,
    }),
    [tv, ka, conceptHint, limitedSources]
  );

  useEffect(() => {
    async function fetchProposals() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/proposals-v2`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiBody),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `Server antwoordde met status ${res.status}: ${text.slice(0, 300)}`
          );
        }

        const json = (await res.json()) as ProposalsResponse;
        setData(json);
      } catch (err: any) {
        console.error("[ProposalsPage] ERROR", err);
        setError(
          err?.message || "Onbekende fout bij het ophalen van lesvoorstellen."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchProposals();
  }, [apiBody]);

  const handleChooseProposal = (proposal: LessonProposal) => {
    if (!data || !data.allSources) return;

    const sourceIds = proposal.sourceIds || [];
    const selectedSources = data.allSources.filter((s) =>
      sourceIds.includes(s.id)
    );

    navigate("/lesson", {
      state: {
        concept: proposal.concept,
        sources: selectedSources,
      },
    });
  };

  const meta = data?.meta;
  const isDummy = !!meta?.isDummy;
  const noInitialSources = initialSources.length === 0;

  return (
    <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "8px" }}>Lesvoorstellen (LesGO v2)</h1>

      {meta?.masterSignature && (
        <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "4px" }}>
          keten-signature: <strong>{meta.masterSignature}</strong> (verwacht:
          v6MP6dec)
        </div>
      )}

      <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "8px" }}>
        debug – tv: {String(tv ?? "∅")} | ka: {String(ka ?? "∅")} |{" "}
        sources→Gemini: {limitedSources.length} (global store:{" "}
        {globalSources.length})
      </div>

      {meta?.from && (
        <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "12px" }}>
          bron: <strong>{meta.from}</strong>
          {meta.from === "dummy-fallback" && " (Gemini niet bereikt, dummy actief)"}
        </div>
      )}

      {noInitialSources && (
        <div
          style={{
            backgroundColor: "#fff8e1",
            border: "1px solid #ffcc80",
            padding: "10px",
            marginBottom: "12px",
            borderRadius: "6px",
            fontSize: "13px",
          }}
        >
          Let op: er zijn geen bronnen gevonden in router-state én niet in de
          globale selectie-store. Gemini maakt nu lesvoorstellen op basis van
          tijdvak/kenmerkend aspect en eventuele hint, maar niet op basis van
          concrete Kleio/Cito-bronnen.
        </div>
      )}

      {isDummy && showDummyWarning && (
        <div
          style={{
            backgroundColor: "#ffecec",
            border: "1px solid #ff9999",
            padding: "12px",
            marginBottom: "16px",
            borderRadius: "6px",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Let op: dummy-lesvoorstellen
          </div>
          <div style={{ fontSize: "14px", marginBottom: "8px" }}>
            Deze lesvoorstellen komen uit de <strong>dummy-fallback</strong>{" "}
            omdat Gemini geen geldig antwoord gaf. Gebruik deze inhoud niet als
            definitieve les, maar alleen om de keten / UI te testen.
          </div>
          {meta?.error && (
            <div
              style={{ fontSize: "12px", opacity: 0.8, marginBottom: "8px" }}
            >
              Technische foutmelding: {meta.error}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowDummyWarning(false)}
            style={{
              fontSize: "12px",
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid #999",
              background: "white",
              cursor: "pointer",
            }}
          >
            Verberg melding
          </button>
        </div>
      )}

      {loading && <p>Lesvoorstellen worden gegenereerd...</p>}

      {error && (
        <div
          style={{
            backgroundColor: "#ffecec",
            border: "1px solid #ff9999",
            padding: "12px",
            borderRadius: "6px",
            marginTop: "8px",
          }}
        >
          <strong>Fout:</strong> {error}
        </div>
      )}

      {!loading && !error && data && data.proposals && data.proposals.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
            marginTop: "12px",
          }}
        >
          {data.proposals.map((proposal) => {
            const concept = proposal.concept || {};
            const deelvragen = concept.deelvragen || [];
            const leeropbrengsten = concept.leeropbrengsten || [];
            const primaryIds = proposal.primarySourceIds || [];
            const allSources = data.allSources || [];

            const selectedSources = allSources.filter((s) =>
              (proposal.sourceIds || []).includes(s.id)
            );

            return (
              <div
                key={proposal.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "220px",
                }}
              >
                <div style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.7,
                      marginBottom: "4px",
                    }}
                  >
                    concept-id: {concept.id} | sig:{" "}
                    {concept.masterSignature || "–"}
                  </div>
                  <h2
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "18px",
                    }}
                  >
                    {concept.title || "Zonder titel"}
                  </h2>
                  {concept.contextLabel && (
                    <div
                      style={{
                        fontSize: "12px",
                        opacity: 0.8,
                        marginBottom: "4px",
                      }}
                    >
                      {concept.contextLabel}
                    </div>
                  )}
                  {concept.hook && (
                    <div
                      style={{
                        fontSize: "13px",
                        fontStyle: "italic",
                        marginBottom: "6px",
                      }}
                    >
                      {concept.hook}
                    </div>
                  )}
                  {concept.hoofdvraag && (
                    <div
                      style={{
                        fontSize: "13px",
                        marginBottom: "6px",
                      }}
                    >
                      <strong>Hoofdvraag:</strong> {concept.hoofdvraag}
                    </div>
                  )}
                </div>

                {deelvragen.length > 0 && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "bold" }}>
                      Deelvragen
                    </div>
                    <ul
                      style={{ paddingLeft: "18px", margin: "4px 0" }}
                    >
                      {deelvragen.map((dv, idx) => (
                        <li
                          key={idx}
                          style={{
                            fontSize: "12px",
                            marginBottom: "2px",
                          }}
                        >
                          <span style={{ display: "block" }}>
                            {dv.vraag}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              opacity: 0.7,
                            }}
                          >
                            ({dv.dimensie} – {dv.subdimensie})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {leeropbrengsten.length > 0 && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "bold" }}>
                      Leeropbrengsten (preview voor docent)
                    </div>
                    <ul
                      style={{ paddingLeft: "18px", margin: "4px 0" }}
                    >
                      {leeropbrengsten.map((lo) => (
                        <li
                          key={lo.id || lo.beschrijving}
                          style={{ fontSize: "12px" }}
                        >
                          {lo.beschrijving}
                          {typeof lo.deelvraagIndex === "number" && (
                            <span
                              style={{
                                fontSize: "11px",
                                opacity: 0.7,
                              }}
                            >
                              {" "}
                              (koppeling met deelvraag{" "}
                              {lo.deelvraagIndex + 1})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ marginTop: "auto" }}>
                  {selectedSources.length > 0 && (
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        Geselecteerde bronnen (
                        {selectedSources.length})
                      </div>
                      <ul
                        style={{
                          paddingLeft: "18px",
                          margin: "4px 0",
                          maxHeight: "120px",
                          overflowY: "auto",
                        }}
                      >
                        {selectedSources.map((src) => {
                          const isPrimary = primaryIds.includes(src.id);
                          return (
                            <li
                              key={src.id}
                              style={{
                                fontSize: "12px",
                                marginBottom: "2px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {isPrimary && <span>⭐</span>}
                              <span>
                                {src.title ||
                                  src.snippet ||
                                  `Bron ${src.id}`}
                                {src.provider && (
                                  <span style={{ opacity: 0.7 }}>
                                    {" "}
                                    – {src.provider}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleChooseProposal(proposal)}
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      borderRadius: "6px",
                      border: "1px solid #0077cc",
                      backgroundColor: "#0088ff",
                      color: "white",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Kies deze les
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading &&
        !error &&
        data &&
        (!data.proposals || data.proposals.length === 0) && (
          <p>Geen lesvoorstellen gevonden.</p>
        )}

      {meta?.masterSignature && (
        <div
          style={{
            position: "fixed",
            right: "8px",
            bottom: "8px",
            fontSize: "11px",
            padding: "4px 8px",
            background: "rgba(0,0,0,0.6)",
            color: "white",
            borderRadius: "4px",
          }}
        >
          proposals-sig: {meta.masterSignature}
          {isDummy ? " (dummy)" : " (gemini)"}
        </div>
      )}
    </div>
  );
};

export default ProposalsPage;


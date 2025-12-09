import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LessonConcept = {
  hoofdvraag?: string;
  hook?: string;
  context?: string;
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
};

type Source = {
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

type TvKa = {
  tv?: string;
  tvLabel?: string;
  ka?: string;
  kaLabel?: string;
};

type Step1DocentLesfase = {
  fase: string;
  tijd: string;
  doel: string;
  activiteit: string;
  werkvorm: string;
};

type Step1DocentBronkoppeling = {
  deelvraag: string;
  bronnen: number[];
};

type Step1Docent = {
  wat: string;
  hoe: string;
  waarom: string;
  deelvragen: string[];
  bronverwijzingenPerDeelvraag: Step1DocentBronkoppeling[];
  lesfasen: Step1DocentLesfase[];
};

type Step1Response = {
  step: "step1";
  data: {
    chainSignature: string;
    docent: Step1Docent;
  };
};

type Step2BronNummering = {
  nummer: number;
  id: string;
  label: string;
  provider: string;
  type: string;
  url: string | null;
};

type Step2Bronnenblad = {
  instructie: string;
  bronNummering: Step2BronNummering[];
};

type Step2SamenwerkingMeerkeuze = {
  wieSpreektOpties: string[];
  dimensieOpties: string[];
  subdimensieOpties: string[];
};

type Step2Samenwerkingstabel = {
  instructie: string;
  kolommen: string[];
  rijen: string[];
  meerkeuze: Step2SamenwerkingMeerkeuze;
};

type Step2Startopdracht = {
  beschrijving: string;
  stappen: string[];
};

type Step2Reflectie = {
  instructie: string;
  vragen: string[];
};

type Step2BronVraagUnit = {
  type: string;
  vraag: string;
};

type Step2BronVragenPerBron = {
  bronNummer: number;
  vragen: Step2BronVraagUnit[];
};

type Step2Leerling = {
  antiPresentismeIntro: string;
  startopdracht: Step2Startopdracht;
  bronnenblad: Step2Bronnenblad;
  samenwerkingstabel: Step2Samenwerkingstabel;
  bronvragen?: Step2BronVragenPerBron[];
  reflectie: Step2Reflectie;
};

type Step2Response = {
  step: "step2";
  data: {
    chainSignature: string;
    leerling: Step2Leerling;
  };
};

type LocationState = {
  concept?: LessonConcept;
  sources?: Source[];
  tvKa?: TvKa;
};

type TabKey = "docent" | "leerling" | "debug";

const LessonPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as LocationState;

  const concept = state.concept;
  const sources = state.sources || [];
  const tvKa = state.tvKa || {
    tv: concept?.tv,
    tvLabel: concept?.tvLabel,
    ka: concept?.ka,
    kaLabel: concept?.kaLabel,
  };

  const [activeTab, setActiveTab] = useState<TabKey>("docent");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step1Docent, setStep1Docent] = useState<Step1Docent | null>(null);
  const [step1ChainSignature, setStep1ChainSignature] = useState<string | null>(
    null
  );

  const [step2Leerling, setStep2Leerling] = useState<Step2Leerling | null>(
    null
  );
  const [step2ChainSignature, setStep2ChainSignature] = useState<string | null>(
    null
  );
  const [step2DebugJson, setStep2DebugJson] = useState<any | null>(null);

  useEffect(() => {
    if (!concept || sources.length === 0) {
      return;
    }

    const body = {
      concept,
      sources,
      tvKa,
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [res1, res2] = await Promise.all([
          fetch("/api/generate-lesson-v2/step1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
          fetch("/api/generate-lesson-v2/step2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        ]);

        if (!res1.ok) {
          const err1 = await res1.json().catch(() => null);
          throw new Error(
            err1?.error ||
              `Fout bij step1: HTTP ${res1.status} ${res1.statusText}`
          );
        }

        if (!res2.ok) {
          const err2 = await res2.json().catch(() => null);
          throw new Error(
            err2?.error ||
              `Fout bij step2: HTTP ${res2.status} ${res2.statusText}`
          );
        }

        const json1 = (await res1.json()) as Step1Response;
        const json2 = (await res2.json()) as Step2Response;

        if (json1?.data?.docent) {
          setStep1Docent(json1.data.docent);
          setStep1ChainSignature(json1.data.chainSignature);
        } else {
          setStep1Docent(null);
        }

        if (json2?.data?.leerling) {
          setStep2Leerling(json2.data.leerling);
          setStep2ChainSignature(json2.data.chainSignature);
          setStep2DebugJson(json2);
        } else {
          setStep2Leerling(null);
          setStep2DebugJson(json2);
        }
      } catch (e: any) {
        setError(e?.message || "Er ging iets mis bij het ophalen van de les.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [concept, sources, tvKa]);

  if (!concept) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <h1>Geen lesconcept gevonden</h1>
        <p>
          Er is geen concept meegegeven aan deze pagina. Ga terug naar de
          lesvoorstellen en kies een concept opnieuw.
        </p>
        <button onClick={() => navigate(-1)}>Terug</button>
      </div>
    );
  }

  const renderHeader = () => {
    return (
      <div
        style={{
          padding: "1.5rem",
          borderBottom: "1px solid #ddd",
          marginBottom: "1rem",
        }}
      >
        <button onClick={() => navigate(-1)} style={{ marginBottom: "0.75rem" }}>
          ← Terug
        </button>
        <h1 style={{ marginBottom: "0.5rem" }}>
          Hoofdvraag: {concept.hoofdvraag}
        </h1>
        {concept.hook && (
          <p style={{ fontStyle: "italic", marginBottom: "0.25rem" }}>
            Hook: {concept.hook}
          </p>
        )}
        {concept.context && (
          <p style={{ marginBottom: "0.25rem" }}>Context: {concept.context}</p>
        )}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {tvKa?.tvLabel && (
            <span
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "999px",
                border: "1px solid #ccc",
                fontSize: "0.85rem",
              }}
            >
              {tvKa.tvLabel}
            </span>
          )}
          {tvKa?.kaLabel && (
            <span
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "999px",
                border: "1px solid #ccc",
                fontSize: "0.85rem",
              }}
            >
              {tvKa.kaLabel}
            </span>
          )}
          {step1ChainSignature && (
            <span
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "999px",
                border: "1px solid #ccc",
                fontSize: "0.8rem",
                opacity: 0.7,
              }}
            >
              chain: {step1ChainSignature}
            </span>
          )}
          {step2ChainSignature && (
            <span
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "999px",
                border: "1px solid #ccc",
                fontSize: "0.8rem",
                opacity: 0.7,
              }}
            >
              step2: {step2ChainSignature}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderTabs = () => {
    const tabs: { key: TabKey; label: string }[] = [
      { key: "docent", label: "Step 1 – Docent" },
      { key: "leerling", label: "Step 2 – Leerling" },
      { key: "debug", label: "Debug STEP 2 JSON" },
    ];

    return (
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid #ddd",
          padding: "0 1.5rem",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              border: "none",
              borderBottom:
                activeTab === tab.key ? "2px solid #000" : "2px solid transparent",
              background: "transparent",
              padding: "0.75rem 0.5rem",
              cursor: "pointer",
              fontWeight: activeTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderDocentTab = () => {
    if (loading && !step1Docent) {
      return (
        <div style={{ padding: "1.5rem" }}>Bezig met genereren van Step 1…</div>
      );
    }

    if (error && !step1Docent) {
      return (
        <div style={{ padding: "1.5rem", color: "darkred" }}>
          Fout bij laden van Step 1: {error}
        </div>
      );
    }

    if (!step1Docent) {
      return (
        <div style={{ padding: "1.5rem" }}>
          Nog geen docentmateriaal ontvangen voor Step 1.
        </div>
      );
    }

    const d = step1Docent;

    return (
      <div style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
        <section>
          <h2>WAT</h2>
          <p>{d.wat}</p>
        </section>

        <section>
          <h2>HOE</h2>
          <p>{d.hoe}</p>
        </section>

        <section>
          <h2>WAAROM</h2>
          <p>{d.waarom}</p>
        </section>

        <section>
          <h2>Deelvragen (docent)</h2>
          <ol>
            {Array.isArray(d.deelvragen) &&
              d.deelvragen.map((dv, idx) => (
                <li key={idx} style={{ marginBottom: "0.25rem" }}>
                  {dv}
                </li>
              ))}
          </ol>
        </section>

        <section>
          <h2>Bronverwijzingen per deelvraag</h2>
          {Array.isArray(d.bronverwijzingenPerDeelvraag) &&
          d.bronverwijzingenPerDeelvraag.length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "0.5rem",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Deelvraag
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Bronnen (Bron-nummers)
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.bronverwijzingenPerDeelvraag.map((bk, idx) => (
                  <tr key={idx}>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                        verticalAlign: "top",
                      }}
                    >
                      {bk.deelvraag}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                        verticalAlign: "top",
                      }}
                    >
                      {Array.isArray(bk.bronnen) && bk.bronnen.length > 0
                        ? bk.bronnen.map((n) => `Bron ${n}`).join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Geen bronverwijzingen bekend.</p>
          )}
        </section>

        <section>
          <h2>Lesfasen (planning)</h2>
          {Array.isArray(d.lesfasen) && d.lesfasen.length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "0.5rem",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Fase
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Tijd
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Doel
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Activiteit
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Werkvorm
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.lesfasen.map((fase, idx) => (
                  <tr key={idx}>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                        verticalAlign: "top",
                      }}
                    >
                      {fase.fase}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                        verticalAlign: "top",
                      }}
                    >
                      {fase.tijd}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                        verticalAlign: "top",
                      }}
                    >
                      {fase.doel}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                        verticalAlign: "top",
                      }}
                    >
                      {fase.activiteit}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                        verticalAlign: "top",
                      }}
                    >
                      {fase.werkvorm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Geen lesfasen in de planning gevonden.</p>
          )}
        </section>
      </div>
    );
  };

  const renderLeerlingTab = () => {
    if (loading && !step2Leerling) {
      return (
        <div style={{ padding: "1.5rem" }}>Bezig met genereren van Step 2…</div>
      );
    }

    if (error && !step2Leerling) {
      return (
        <div style={{ padding: "1.5rem", color: "darkred" }}>
          Fout bij laden van Step 2: {error}
        </div>
      );
    }

    if (!step2Leerling) {
      return (
        <div style={{ padding: "1.5rem" }}>
          Nog geen leerlingmateriaal ontvangen voor Step 2.
        </div>
      );
    }

    const l = step2Leerling;
    const bronnen = l.bronnenblad?.bronNummering || [];
    const samenwerkingKolommen = l.samenwerkingstabel?.kolommen || [];
    const samenwerkingRijen = l.samenwerkingstabel?.rijen || [];
    const mk = l.samenwerkingstabel?.meerkeuze;
    const bronLabelMap = new Map<number, string>();
    for (const b of bronnen) {
      bronLabelMap.set(b.nummer, b.label);
    }

    return (
      <div
        style={{
          padding: "1.5rem",
          display: "grid",
          gap: "1.5rem",
          alignItems: "flex-start",
        }}
      >
        <section>
          <h2>Anti-presentisme (uitleg voor leerlingen)</h2>
          <p>{l.antiPresentismeIntro}</p>
        </section>

        <section>
          <h2>Startopdracht</h2>
          <p>{l.startopdracht.beschrijving}</p>
          {Array.isArray(l.startopdracht.stappen) &&
            l.startopdracht.stappen.length > 0 && (
              <ol style={{ marginTop: "0.75rem" }}>
                {l.startopdracht.stappen.map((stap, idx) => (
                  <li key={idx} style={{ marginBottom: "0.25rem" }}>
                    {stap}
                  </li>
                ))}
              </ol>
            )}
        </section>

        <section>
          <h2>Bronnenblad (nummering)</h2>
          <p>{l.bronnenblad.instructie}</p>
          {bronnen.length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "0.75rem",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Label
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Provider
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    ID (intern)
                  </th>
                </tr>
              </thead>
              <tbody>
                {bronnen.map((b) => (
                  <tr key={b.nummer}>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                      }}
                    >
                      {b.nummer}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                      }}
                    >
                      {b.label}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                      }}
                    >
                      {b.provider}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                      }}
                    >
                      {b.type}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "0.5rem",
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                      }}
                    >
                      {b.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Geen bronnen beschikbaar.</p>
          )}
        </section>

        <section>
          <h2>Bronvragen per bron</h2>
          {Array.isArray(l.bronvragen) && l.bronvragen.length > 0 ? (
            <div style={{ display: "grid", gap: "1rem" }}>
              {l.bronvragen.map((blok) => {
                const label = bronLabelMap.get(blok.bronNummer);
                return (
                  <div
                    key={blok.bronNummer}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "0.5rem",
                      padding: "0.75rem 1rem",
                    }}
                  >
                    <h3 style={{ marginBottom: "0.5rem" }}>
                      Bron {blok.bronNummer}
                      {label ? ` – ${label}` : ""}
                    </h3>
                    {Array.isArray(blok.vragen) && blok.vragen.length > 0 ? (
                      <ol style={{ marginLeft: "1.25rem" }}>
                        {blok.vragen.map((v, idx) => (
                          <li key={idx} style={{ marginBottom: "0.25rem" }}>
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                marginRight: "0.35rem",
                                textTransform: "capitalize",
                              }}
                            >
                              {v.type}:
                            </span>
                            {v.vraag}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>Geen vragen voor deze bron.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p>Geen bronvragen ontvangen in step2-output.</p>
          )}
        </section>

        <section>
          <h2>Samenwerkingstabel</h2>
          <p>{l.samenwerkingstabel.instructie}</p>

          {mk && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "1rem",
                marginTop: "0.75rem",
              }}
            >
              <div
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                }}
              >
                <strong>Wie spreekt in de bron?</strong>
                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
                  {mk.wieSpreektOpties.map((opt, idx) => (
                    <li key={idx}>{opt}</li>
                  ))}
                </ul>
              </div>
              <div
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                }}
              >
                <strong>Dimensie-opties</strong>
                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
                  {mk.dimensieOpties.map((opt, idx) => (
                    <li key={idx}>{opt}</li>
                  ))}
                </ul>
              </div>
              <div
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                }}
              >
                <strong>Subdimensie / soort verklaring</strong>
                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
                  {mk.subdimensieOpties.map((opt, idx) => (
                    <li key={idx}>{opt}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {samenwerkingKolommen.length > 0 && samenwerkingRijen.length > 0 && (
            <div style={{ marginTop: "1rem", overflowX: "auto" }}>
              <table
                style={{
                  minWidth: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {samenwerkingKolommen.map((kol, idx) => (
                      <th
                        key={idx}
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid #ccc",
                          padding: "0.5rem",
                        }}
                      >
                        {kol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {samenwerkingRijen.map((rij, idx) => (
                    <tr key={idx}>
                      {samenwerkingKolommen.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            borderBottom: "1px solid #eee",
                            padding: "0.5rem",
                            verticalAlign: "top",
                            fontSize: "0.9rem",
                          }}
                        >
                          {colIdx === 0 ? rij : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2>Reflectie-opdrachten</h2>
          <p>{l.reflectie.instructie}</p>
          {Array.isArray(l.reflectie.vragen) &&
            l.reflectie.vragen.length > 0 && (
              <ol style={{ marginTop: "0.75rem" }}>
                {l.reflectie.vragen.map((vraag, idx) => (
                  <li key={idx} style={{ marginBottom: "0.4rem" }}>
                    {vraag}
                  </li>
                ))}
              </ol>
            )}
        </section>
      </div>
    );
  };

  const renderDebugTab = () => {
    return (
      <div style={{ padding: "1.5rem" }}>
        <h2>Debug STEP 2 JSON</h2>
        {step2DebugJson ? (
          <pre
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid #ddd",
              maxHeight: "60vh",
              overflow: "auto",
              fontSize: "0.8rem",
            }}
          >
            {JSON.stringify(step2DebugJson, null, 2)}
          </pre>
        ) : (
          <p>Geen debug-data beschikbaar voor Step 2.</p>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderHeader()}
      {renderTabs()}
      {activeTab === "docent" && renderDocentTab()}
      {activeTab === "leerling" && renderLeerlingTab()}
      {activeTab === "debug" && renderDebugTab()}
    </div>
  );
};

export default LessonPage;


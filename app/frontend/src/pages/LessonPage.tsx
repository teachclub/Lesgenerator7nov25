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

type Step1DocentDeelvraag = {
  vraag: string;
  dimenisie?: string; // typo-veilig
  dimensie?: string;
  subdimensie?: string;
  toelichtingVoorDocent: string;
};

type Step1DocentBronRef = {
  id: string | number;
  relevatie: string;
};

type Step1DocentLesfase = {
  fase: string;
  activiteit: string;
  tijd: string;
  doel: string;
  product: string;
};

type Step1Docent = {
  wat: string;
  hoe: string;
  waarom: string;
  deelvragen: Step1DocentDeelvraag[];
  bronkoppeling: Record<string, Step1DocentBronRef[]>;
  lesplanning: Step1DocentLesfase[];
};

type Step1Response = {
  step: "step1";
  data: {
    chainSignature: string;
    docent: Step1Docent;
  };
};

type Step2Response = {
  step: "step2";
  data: any; // v7-leerlingcontract kun je later strakker typen
};

type LocationState = {
  concept?: LessonConcept;
  lessonConcept?: LessonConcept;
  sources?: Source[];
  selectedSources?: Source[];
};

type ActiveTab = "docent" | "leerling";

const LessonPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as LocationState;

  const concept: LessonConcept | undefined =
    state.concept || state.lessonConcept;
  const sources: Source[] = state.sources || state.selectedSources || [];

  const [activeTab, setActiveTab] = useState<ActiveTab>("docent");

  const [step1, setStep1] = useState<Step1Response | null>(null);
  const [step2, setStep2] = useState<Step2Response | null>(null);
  const [loadingStep1, setLoadingStep1] = useState(false);
  const [loadingStep2, setLoadingStep2] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Als er geen concept is (directe URL), terug naar lesvoorstellen
  useEffect(() => {
    if (!concept) {
      navigate("/proposals");
    }
  }, [concept, navigate]);

  useEffect(() => {
    if (!concept || sources.length === 0) return;

    const lightSources = sources.map((s) => ({
      id: s.id,
      title: s.title || "",
      provider: s.provider || "",
      type: s.type || "",
    }));

    const body = JSON.stringify({
      concept,
      sources: lightSources,
    });

    // STEP 1 – DOCENT
    setLoadingStep1(true);
    setError(null);
    fetch("/api/generate-lesson-v2/step1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Step1 HTTP ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((json: Step1Response) => {
        setStep1(json);
      })
      .catch((e) => {
        console.error("[LessonPage] Fout bij step1:", e);
        setError("Fout bij genereren van het docentmateriaal (stap 1).");
      })
      .finally(() => setLoadingStep1(false));

    // STEP 2 – LEERLING
    setLoadingStep2(true);
    fetch("/api/generate-lesson-v2/step2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Step2 HTTP ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((json: Step2Response) => {
        setStep2(json);
      })
      .catch((e) => {
        console.error("[LessonPage] Fout bij step2:", e);
        setError((prev) =>
          prev
            ? prev + " Ook fout bij het leerlingmateriaal (stap 2)."
            : "Fout bij genereren van het leerlingmateriaal (stap 2)."
        );
      })
      .finally(() => setLoadingStep2(false));
  }, [concept, sources]);

  const docent = step1?.data?.docent;

  const renderLesconcept = () => {
    if (!concept) return null;
    return (
      <section className="lesson-concept">
        <p
          style={{ cursor: "pointer", color: "#666", marginBottom: "0.5rem" }}
          onClick={() => navigate("/proposals")}
        >
          ← Terug naar lesvoorstellen
        </p>
        <h1>Lesconcept</h1>
        {concept.hook && (
          <p style={{ fontStyle: "italic", marginBottom: "0.75rem" }}>
            {concept.hook}
          </p>
        )}
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          {concept.tv && concept.ka
            ? `${concept.tv} • ${concept.ka}`
            : concept.tv || concept.ka}
        </p>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          {concept.tvLabel} {concept.tvLabel && concept.kaLabel && "—"}{" "}
          {concept.kaLabel}
        </p>

        {concept.hoofdvraag && (
          <p style={{ marginTop: "1rem" }}>
            <strong>Hoofdvraag (concept):</strong> {concept.hoofdvraag}
          </p>
        )}
      </section>
    );
  };

  const renderBronnen = () => {
    if (!sources.length) return null;
    return (
      <section style={{ marginTop: "2rem" }}>
        <h2>Bronnen in deze les</h2>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          {sources.length} bronnen geselecteerd uit Cito/Kleio.
        </p>
        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
          {sources.map((s) => (
            <article
              key={s.id}
              style={{
                border: "1px solid #eee",
                borderRadius: "0.75rem",
                padding: "0.75rem 1rem",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  color: "#999",
                  marginBottom: "0.25rem",
                }}
              >
                {s.provider || "Bron"} · {s.type || "TEXT"}
              </div>
              <div style={{ fontWeight: 600 }}>{s.title || `Bron ${s.id}`}</div>
            </article>
          ))}
        </div>
      </section>
    );
  };

  const renderDocentTab = () => {
    if (loadingStep1 && !docent) {
      return <p>Docentmateriaal wordt gegenereerd…</p>;
    }
    if (!docent) {
      return (
        <p>
          Geen docentmateriaal beschikbaar. Probeer de pagina te verversen of
          ga terug naar de lesvoorstellen.
        </p>
      );
    }

    return (
      <div>
        <h2>Stap 1 – Docentmateriaal</h2>

        <section style={{ marginTop: "1rem" }}>
          <h3>WAT – Waar gaat deze les over?</h3>
          <p>{docent.wat}</p>
        </section>

        <section style={{ marginTop: "1rem" }}>
          <h3>HOE – Opbouw en aanpak</h3>
          <p>{docent.hoe}</p>
        </section>

        <section style={{ marginTop: "1rem" }}>
          <h3>WAAROM – Didactische onderbouwing</h3>
          <p>{docent.waarom}</p>
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <h3>Deelvragen voor de docent</h3>
          <ul style={{ paddingLeft: "1.2rem" }}>
            {docent.deelvragen.map((dv, idx) => (
              <li key={idx} style={{ marginBottom: "0.5rem" }}>
                <strong>Deelvraag {idx + 1}:</strong> {dv.vraag}
                <br />
                <span style={{ fontSize: "0.85rem", color: "#555" }}>
                  Dimensie:{" "}
                  {dv.dimensie ||
                    (dv as any).dimenisie ||
                    "–"}{" "}
                  · Subdimensie: {dv.subdimensie || "–"}
                  <br />
                  <em>{dv.toelichtingVoorDocent}</em>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <h3>Bronkoppeling per deelvraag</h3>
          {["0", "1", "2", "3"].map((key) => {
            const bronRefs = docent.bronkoppeling?.[key] || [];
            if (!bronRefs.length) return null;
            const dvIndex = parseInt(key, 10);
            return (
              <div key={key} style={{ marginBottom: "1rem" }}>
                <strong>Deelvraag {dvIndex + 1}</strong>
                <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                  {bronRefs.map((b) => {
                    const full = sources.find((s) => s.id === b.id);
                    return (
                      <li key={b.id}>
                        <span>
                          <strong>
                            {full?.title || `Bron ${b.id}`}
                          </strong>{" "}
                          – {b.relevatie}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <h3>Lesplanning (globaal)</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "0.4rem" }}>
                  Fase
                </th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "0.4rem" }}>
                  Activiteit
                </th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "0.4rem", whiteSpace: "nowrap" }}>
                  Tijd
                </th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "0.4rem" }}>
                  Doel
                </th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "0.4rem" }}>
                  Product
                </th>
              </tr>
            </thead>
            <tbody>
              {docent.lesplanning.map((fase, idx) => (
                <tr key={idx}>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.4rem", fontWeight: 600 }}>
                    {fase.fase}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.4rem" }}>
                    {fase.activiteit}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.4rem" }}>
                    {fase.tijd}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.4rem" }}>
                    {fase.doel}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "0.4rem" }}>
                    {fase.product}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    );
  };

  const renderLeerlingTab = () => {
    if (loadingStep2 && !step2) {
      return <p>Leerlingmateriaal wordt gegenereerd…</p>;
    }
    if (!step2) {
      return (
        <p>
          Geen leerlingmateriaal beschikbaar (stap 2). De keten draait wel, maar
          de presentatie kun je later verder verfijnen.
        </p>
      );
    }

    // Voor nu: simpele debug-dump, totdat we de v7-leerling-UI precies hebben.
    return (
      <div>
        <h2>Stap 2 – Leerlingmateriaal</h2>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          v7-keten is actief; deze weergave kun je later mooi maken.
        </p>
        <pre
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            background: "#111",
            color: "#eee",
            fontSize: "0.75rem",
            maxHeight: "24rem",
            overflow: "auto",
          }}
        >
          {JSON.stringify(step2, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "1.5rem 1rem 3rem",
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)",
        gap: "2rem",
      }}
    >
      <div>
        {renderLesconcept()}

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setActiveTab("docent")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              border: "1px solid #111",
              background: activeTab === "docent" ? "#111" : "#fff",
              color: activeTab === "docent" ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            Stap 1 – Docent
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leerling")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              border: "1px solid #111",
              background: activeTab === "leerling" ? "#111" : "#fff",
              color: activeTab === "leerling" ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            Stap 2 – Leerling
          </button>
        </div>

        <section style={{ marginTop: "1.5rem" }}>
          {error && (
            <p style={{ color: "crimson", marginBottom: "1rem" }}>{error}</p>
          )}
          {activeTab === "docent" ? renderDocentTab() : renderLeerlingTab()}
        </section>
      </div>

      <aside>{renderBronnen()}</aside>
    </main>
  );
};

export default LessonPage;


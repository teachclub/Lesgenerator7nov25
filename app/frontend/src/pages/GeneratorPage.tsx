import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// @ts-ignore – html2pdf heeft geen officiële types
import html2pdf from "html2pdf.js";

type Concept = {
  title?: string;
  tv?: string | number;
  tijdvakNummer?: string | number;
  tijdvak?: string | number;
  ka?: string | string[];
  kaNummers?: string[];
  kenmerkendeAspecten?: string[];
  // fallback voor alles wat je verder doorstuurt
  [key: string]: any;
};

type Source = {
  id?: string;
  title?: string;
  provider?: string;
  fullText?: string;
  content?: string;
  imageUrl?: string;
  [key: string]: any;
};

interface GeneratorPageProps {
  concept?: Concept;
  sources?: Source[];
}

/**
 * Bouwt een veilige bestandsnaam:
 * TV09_KA37_KA38_de-waanzin-van-de-wapenwedloop.pdf
 */
function buildPdfFilename(concept: Concept | undefined): string {
  const title = concept?.title || concept?.titel || "lesgo-les";

  const tvRaw =
    concept?.tv ?? concept?.tijdvakNummer ?? concept?.tijdvak ?? "";
  const tvNumber = String(tvRaw).match(/\d+/);
  const tvPart = tvNumber ? `TV${tvNumber[0].padStart(2, "0")}` : "TVxx";

  const kaRaw =
    concept?.ka ?? concept?.kaNummers ?? concept?.kenmerkendeAspecten;
  let kaPart = "KAxx";

  if (Array.isArray(kaRaw) && kaRaw.length > 0) {
    kaPart = kaRaw
      .map((k) => String(k).replace(/\s+/g, ""))
      .join("_");
  } else if (typeof kaRaw === "string" && kaRaw.trim()) {
    kaPart = kaRaw.replace(/\s+/g, "_");
  }

  const safeTitle = String(title)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // spaties → -
    .replace(/[^a-z0-9\-]/g, ""); // alleen letters/cijfers/-

  const finalTitle = safeTitle || "lesgo";

  return `${tvPart}_${kaPart}_${finalTitle}.pdf`;
}

/**
 * LesGO GeneratorPage
 * - Roept /api/generate-lesson-v2/render aan
 * - Toont de volledige les (docent + leerling) als opgemaakte Markdown
 * - Maakt een PDF op basis van die weergave
 */
const GeneratorPage: React.FC<GeneratorPageProps> = ({
  concept: conceptProp,
  sources: sourcesProp,
}) => {
  // Concept: uit props als die bestaan, anders lokaal invullen
  const [concept, setConcept] = useState<Concept>(() => {
    if (conceptProp) return conceptProp;
    return {
      title: "De waanzin van de wapenwedloop",
      tv: "9",
      kaNummers: ["KA37", "KA38"],
    };
  });

  // Sources: uit props (bijv. uit je zoekscherm), anders leeg
  const [sources, setSources] = useState<Source[]>(() => sourcesProp || []);

  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Als de parent nieuwe concept/sources doorgeeft, neem die over
  useEffect(() => {
    if (conceptProp) setConcept(conceptProp);
  }, [conceptProp]);

  useEffect(() => {
    if (sourcesProp) setSources(sourcesProp);
  }, [sourcesProp]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-lesson-v2/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          sources,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Backend-fout (${res.status}): ${
            text || res.statusText || "Onbekende fout"
          }`
        );
      }

      const data = await res.json();
      if (!data || typeof data.markdown !== "string") {
        throw new Error("Backend gaf geen 'markdown'-veld terug.");
      }

      setMarkdown(data.markdown);
    } catch (e: any) {
      console.error("[LesGO] Fout bij render:", e);
      setError(
        e?.message ||
          "Er ging iets mis bij het genereren van de les. Check de console."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById("lesgo-output");
    if (!element) return;

    const filename = buildPdfFilename(concept);

    html2pdf()
      .set({
        margin: 10,
        filename,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

  const handleConceptFieldChange =
    (field: keyof Concept) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setConcept((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleKaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // bijv. "KA37, KA38" → ["KA37","KA38"]
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    setConcept((prev) => ({
      ...prev,
      kaNummers: parts,
    }));
  };

  const currentKaString = Array.isArray(concept.kaNummers)
    ? concept.kaNummers.join(", ")
    : typeof concept.ka === "string"
    ? concept.ka
    : "";

  return (
    <div className="lesgo-generator-page">
      <div className="lesgo-generator-layout">
        {/* Linkerkolom: configuratie / concept */}
        <aside className="lesgo-sidebar">
          <h1 className="lesgo-title">LesGO – Lesgenerator</h1>

          <section className="lesgo-panel">
            <h2>Lesconcept</h2>
            <label className="lesgo-field">
              <span>Titel lesvoorstel</span>
              <input
                type="text"
                value={concept.title || ""}
                onChange={handleConceptFieldChange("title")}
                placeholder="Bijv. De waanzin van de wapenwedloop"
              />
            </label>

            <label className="lesgo-field">
              <span>Tijdvak (nummer)</span>
              <input
                type="text"
                value={
                  concept.tv?.toString() ||
                  concept.tijdvakNummer?.toString() ||
                  ""
                }
                onChange={handleConceptFieldChange("tv")}
                placeholder="Bijv. 9"
              />
            </label>

            <label className="lesgo-field">
              <span>Kenmerkende aspecten (KA)</span>
              <input
                type="text"
                value={currentKaString}
                onChange={handleKaChange}
                placeholder="Bijv. KA37, KA38"
              />
            </label>

            <p className="lesgo-hint">
              De PDF-naam wordt opgebouwd als:
              <br />
              <code>TV_NR_KA_NR_Lestitel.pdf</code>
            </p>
          </section>

          <section className="lesgo-panel">
            <h2>Bronnen</h2>
            {sources && sources.length > 0 ? (
              <p className="lesgo-hint">
                <strong>{sources.length}</strong> bronnen geselecteerd uit Cito
                / Kleio.
              </p>
            ) : (
              <p className="lesgo-hint">
                Er zijn nu <strong>nog geen bronnen</strong> gekoppeld.
                <br />
                Selecteer eerst bronnen in je zoekscherm, of laat de parent
                deze pagina vullen met props.
              </p>
            )}
          </section>

          <section className="lesgo-panel lesgo-actions">
            <button
              className="lesgo-button primary"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Les wordt gegenereerd…" : "Genereer LesGO-les"}
            </button>

            <button
              className="lesgo-button"
              onClick={handleDownloadPdf}
              disabled={!markdown}
            >
              Download als PDF
            </button>

            {error && <p className="lesgo-error">⚠ {error}</p>}
          </section>
        </aside>

        {/* Rechterkolom: lesweergave */}
        <main className="lesgo-main">
          {!markdown && !loading && (
            <div className="lesgo-placeholder">
              <h2>Nog geen les gegenereerd</h2>
              <p>
                Stel links een lesconcept in, zorg dat er bronnen gekoppeld
                zijn en klik op <strong>“Genereer LesGO-les”</strong>.
              </p>
            </div>
          )}

          {loading && (
            <div className="lesgo-loading">
              <p>De LesGO-motor draait… even geduld.</p>
            </div>
          )}

          {markdown && (
            <div className="lesgo-output-wrapper">
              <div id="lesgo-output" className="lesgo-output">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdown}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default GeneratorPage;


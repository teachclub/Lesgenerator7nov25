import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// @ts-ignore – html2pdf heeft geen nette types meestal
import html2pdf from "html2pdf.js";

/**
 * LesGoPreviewPage
 *
 * Doel:
 * - Roept /api/generate-lesson-v2/render aan met concept + sources
 * - Toont de gegenereerde les in twee tabs:
 *   - Docentversie
 *   - Leerlingversie
 * - Biedt een knop "Download als PDF" van de huidige tab
 */

// TODO: vervang dit straks door jouw echte state/store
const MOCK_CONCEPT = "Grote vuurwapenwedloop en kernwapens in de Koude Oorlog";
const MOCK_SOURCES = [
  {
    id: "test-1",
    title: "Testbron kernwapens",
    provider: "dummy",
    fullText:
      "Korte testtekst over de angst voor kernoorlog tijdens de Koude Oorlog.",
  },
];

type TabKey = "docent" | "leerling";

export default function LesGoPreviewPage() {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("docent");

  // Hier renderen we de actieve tab in, zodat html2pdf precies dát pakt
  const pdfContentRef = useRef<HTMLDivElement | null>(null);

  // Helper: splits de markdown op in docent- en leerlingblok
  const { docentMarkdown, leerlingMarkdown } = splitMarkdown(markdown);

  async function handleGenerateClick() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-lesson-v2/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // TODO: hier straks jouw echte concept + sources uit de store inzetten
        body: JSON.stringify({
          concept: MOCK_CONCEPT,
          sources: MOCK_SOURCES,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.message || `Backend-fout: ${response.status.toString()}`
        );
      }

      const data = await response.json();
      if (!data.markdown) {
        throw new Error("Backend gaf geen 'markdown' veld terug.");
      }

      setMarkdown(data.markdown);
      setActiveTab("docent");
    } catch (e: any) {
      console.error("LesGo render error:", e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!pdfContentRef.current) return;

    const opt = {
      margin: 10,
      filename:
        activeTab === "docent"
          ? "LesGo-les-docentversie.pdf"
          : "LesGo-les-leerlingversie.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().from(pdfContentRef.current).set(opt).save();
  }

  return (
    <div className="lesgo-preview-page" style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={{ margin: 0 }}>LesGo – Lespreview</h1>
        <p style={{ margin: "4px 0 0" }}>
          Genereer een complete les (docent + leerling) en bekijk/bewaar als PDF.
        </p>
      </header>

      <section style={controlsStyle}>
        <button
          onClick={handleGenerateClick}
          disabled={loading}
          style={primaryButtonStyle}
        >
          {loading ? "Les genereren…" : "Genereer les"}
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={!markdown}
          style={secondaryButtonStyle}
        >
          Download als PDF
        </button>
      </section>

      {error && (
        <div style={errorBoxStyle}>
          <strong>Fout:</strong> {error}
        </div>
      )}

      {!markdown && !loading && !error && (
        <p style={{ marginTop: 16 }}>
          Nog geen les gegenereerd. Klik op <em>Genereer les</em> om te starten.
        </p>
      )}

      {markdown && (
        <>
          {/* Tabs */}
          <div style={tabsRowStyle}>
            <button
              style={
                activeTab === "docent"
                  ? tabButtonActiveStyle
                  : tabButtonInactiveStyle
              }
              onClick={() => setActiveTab("docent")}
            >
              Docentversie
            </button>
            <button
              style={
                activeTab === "leerling"
                  ? tabButtonActiveStyle
                  : tabButtonInactiveStyle
              }
              onClick={() => setActiveTab("leerling")}
            >
              Leerlingversie
            </button>
          </div>

          {/* De inhoud die zowel op het scherm als in de PDF komt */}
          <div
            ref={pdfContentRef}
            style={{
              ...previewBoxStyle,
              marginTop: 12,
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {activeTab === "docent" ? docentMarkdown : leerlingMarkdown}
            </ReactMarkdown>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Helper: splits de complete markdown in docent- en leerlingversie.
 * We zoeken simpelweg naar de heading "# Leerlingversie".
 */
function splitMarkdown(markdown: string): {
  docentMarkdown: string;
  leerlingMarkdown: string;
} {
  if (!markdown) {
    return { docentMarkdown: "", leerlingMarkdown: "" };
  }

  const marker = "# Leerlingversie";
  const idx = markdown.indexOf(marker);

  if (idx === -1) {
    // Geen aparte leerlingversie gevonden, alles in docent-tab
    return { docentMarkdown: markdown, leerlingMarkdown: "" };
  }

  const docent = markdown.slice(0, idx).trim();
  const leerling = markdown.slice(idx).trim();

  return { docentMarkdown: docent, leerlingMarkdown: leerling };
}

/* --- Simpele inline styles (kan je later in Tailwind / CSS zetten) --- */

const pageStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 24,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const headerStyle: React.CSSProperties = {
  borderBottom: "1px solid #ddd",
  paddingBottom: 12,
  marginBottom: 16,
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 12,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  background: "#fff",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: 14,
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  background: "#fee2e2",
  color: "#b91c1c",
  fontSize: 14,
};

const tabsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const tabButtonBase: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  fontSize: 14,
  cursor: "pointer",
  background: "#f9fafb",
};

const tabButtonActiveStyle: React.CSSProperties = {
  ...tabButtonBase,
  background: "#111827",
  color: "#f9fafb",
  borderColor: "#111827",
};

const tabButtonInactiveStyle: React.CSSProperties = {
  ...tabButtonBase,
  background: "#f9fafb",
  color: "#374151",
};

const previewBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  background: "#ffffff",
  maxHeight: "75vh",
  overflow: "auto",
  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
};


import React, { useRef } from "react";

interface DocentenInstructie {
  wat?: string;
  hoe?: string;
  waarom?: string;
}

interface Deelvraag {
  tekst?: string;
  dimensie?: string;
  [key: string]: any;
}

interface Source {
  id?: string;
  titel?: string;
  type?: string;  // "image" / "text" / etc.
  url?: string;   // afbeelding- of bron-URL
  provider?: string;
  omschrijving?: string;
  [key: string]: any;
}

interface LessonData {
  concept: {
    titel: string;
    tijdvakLabel?: string;
    kaLabel?: string;
    [key: string]: any;
  };
  sources: Source[];
  docentenInstructie?: DocentenInstructie;
  leerlingenOpdracht?: string;
  hoofdvraag?: string;
  deelvragen?: (string | Deelvraag)[];
  bronnenSelectie?: any[];
  quadrantContext?: {
    titel?: string;
    horizontaleAs?: { links?: string; rechts?: string };
    verticaleAs?: { boven?: string; onder?: string };
    kwadranten?: { naam?: string; uitleg?: string; voorbeeld?: string }[];
  };
  bronAntwoorden?: {
    bronNummer: number;
    observerenAntwoord: string;
    interpreterenAntwoord: string;
    hoofdvraagRelatieAntwoord: string;
    stereotyperingAnalyseAntwoord?: string;
  }[];
  samenwerkingTabelIngevuld?: string;
  kwadrantIngevuld?: string;
  reflectieAntwoorden?: string[];
  validation?: { status?: string; message?: string };
}

interface Props {
  lesson: LessonData;
  onExportPdf?: (element: HTMLElement) => void; // html2pdf hook (optioneel)
}

export const LessonPrintLayout: React.FC<Props> = ({ lesson, onExportPdf }) => {
  const printRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = React.useState<"docent" | "leerling">("docent");

  const handlePrint = () => {
    if (onExportPdf && printRef.current) {
      onExportPdf(printRef.current);
      return;
    }
    window.print(); // fallback
  };

  const renderDeelvraag = (dv: string | Deelvraag, index: number) => {
    if (typeof dv === "string") {
      return <li key={index}>{dv}</li>;
    }
    return (
      <li key={index}>
        {dv.tekst}
        {dv.dimensie && (
          <span style={{ fontStyle: "italic", marginLeft: 8 }}>
            ({dv.dimensie})
          </span>
        )}
      </li>
    );
  };

  const imageSources = lesson.sources.filter((s) => {
    if (s.type && s.type.toLowerCase().includes("image")) return true;
    if (s.url && /\.(png|jpe?g|gif|webp|svg)$/i.test(s.url)) return true;
    return false;
  });

  return (
    <div className="lesson-wrapper">
      <style>
        {`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .lesson-wrapper {
            padding: 0;
            margin: 0;
          }
          .lesson-card {
            box-shadow: none !important;
            border: none !important;
          }
        }

        .lesson-wrapper {
          padding: 16px;
        }

        .lesson-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          gap: 8px;
        }

        .lesson-tabs {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid #ccc;
          overflow: hidden;
        }

        .lesson-tab {
          padding: 6px 14px;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
          background: #f5f5f5;
        }

        .lesson-tab.active {
          background: #222;
          color: #fff;
        }

        .lesson-print-btn {
          padding: 6px 14px;
          font-size: 0.9rem;
          border-radius: 999px;
          border: 1px solid #222;
          background: #222;
          color: #fff;
          cursor: pointer;
        }

        .lesson-card {
          background: #fff;
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-width: 1200px;
          margin: 0 auto;
        }

        .lesson-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 12px;
        }

        .lesson-title {
          font-size: 1.4rem;
          font-weight: 600;
        }

        .lesson-meta {
          font-size: 0.8rem;
          text-align: right;
          color: #555;
        }

        .lesson-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 16px;
        }

        .lesson-section-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 12px 0 4px;
        }

        .lesson-section-subtitle {
          font-weight: 500;
          margin-top: 8px;
          margin-bottom: 4px;
        }

        .lesson-text {
          font-size: 0.9rem;
          line-height: 1.4;
          margin: 0;
        }

        .lesson-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          margin-top: 4px;
        }

        .lesson-table th,
        .lesson-table td {
          border: 1px solid #ccc;
          padding: 4px 6px;
          vertical-align: top;
        }

        .lesson-table th {
          background: #f0f0f0;
        }

        .lesson-images-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 8px;
        }

        .lesson-image-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          background: #fafafa;
        }

        .lesson-image-card img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          display: block;
        }

        .lesson-image-meta {
          padding: 4px 6px;
          font-size: 0.7rem;
        }

        .lesson-pre {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.75rem;
          white-space: pre-wrap;
          background: #f9f9f9;
          border-radius: 6px;
          padding: 6px;
          border: 1px solid #eee;
        }

        .lesson-reflect-list {
          font-size: 0.85rem;
          padding-left: 16px;
        }
      `}
      </style>

      <div className="lesson-toolbar no-print">
        <div className="lesson-tabs">
          <button
            className={`lesson-tab ${tab === "docent" ? "active" : ""}`}
            onClick={() => setTab("docent")}
          >
            Docentversie
          </button>
          <button
            className={`lesson-tab ${tab === "leerling" ? "active" : ""}`}
            onClick={() => setTab("leerling")}
          >
            Leerlingversie
          </button>
        </div>
        <button className="lesson-print-btn" onClick={handlePrint}>
          Print / Exporteer (A4 landscape)
        </button>
      </div>

      <div ref={printRef} className="lesson-card">
        <div className="lesson-header">
          <div>
            <div className="lesson-title">{lesson.concept.titel}</div>
            {lesson.hoofdvraag && tab === "leerling" && (
              <p className="lesson-text">
                <strong>Hoofdvraag:</strong> {lesson.hoofdvraag}
              </p>
            )}
          </div>
          <div className="lesson-meta">
            {lesson.concept.tijdvakLabel && (
              <div>{lesson.concept.tijdvakLabel}</div>
            )}
            {lesson.concept.kaLabel && <div>{lesson.concept.kaLabel}</div>}
          </div>
        </div>

        {tab === "docent" ? (
          <>
            <div className="lesson-grid">
              <div>
                <div className="lesson-section-title">Docenteninstructie</div>
                <p className="lesson-text">
                  <strong>Wat:</strong>{" "}
                  {lesson.docentenInstructie?.wat || "—"}
                </p>
                <p className="lesson-text">
                  <strong>Hoe:</strong>{" "}
                  {lesson.docentenInstructie?.hoe || "—"}
                </p>
                <p className="lesson-text">
                  <strong>Waarom:</strong>{" "}
                  {lesson.docentenInstructie?.waarom || "—"}
                </p>

                <div className="lesson-section-subtitle">
                  Leerlingenopdracht
                </div>
                <p className="lesson-text">
                  {lesson.leerlingenOpdracht || "—"}
                </p>

                <div className="lesson-section-subtitle">Hoofdvraag</div>
                <p className="lesson-text">
                  {lesson.hoofdvraag || "—"}
                </p>

                <div className="lesson-section-subtitle">Deelvragen</div>
                <ol className="lesson-text">
                  {lesson.deelvragen?.map(renderDeelvraag)}
                </ol>
              </div>

              <div>
                <div className="lesson-section-title">2x2-kwadrant</div>
                {lesson.quadrantContext ? (
                  <>
                    <p className="lesson-text">
                      <strong>{lesson.quadrantContext.titel}</strong>
                    </p>
                    <table className="lesson-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>
                            {lesson.quadrantContext.horizontaleAs?.links}
                          </th>
                          <th>
                            {lesson.quadrantContext.horizontaleAs?.rechts}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th>
                            {lesson.quadrantContext.verticaleAs?.boven}
                          </th>
                          <td>
                            {lesson.quadrantContext.kwadranten?.[0]?.naam}
                            <br />
                            <small>
                              {lesson.quadrantContext.kwadranten?.[0]?.uitleg}
                            </small>
                          </td>
                          <td>
                            {lesson.quadrantContext.kwadranten?.[1]?.naam}
                            <br />
                            <small>
                              {lesson.quadrantContext.kwadranten?.[1]?.uitleg}
                            </small>
                          </td>
                        </tr>
                        <tr>
                          <th>
                            {lesson.quadrantContext.verticaleAs?.onder}
                          </th>
                          <td>
                            {lesson.quadrantContext.kwadranten?.[2]?.naam}
                            <br />
                            <small>
                              {lesson.quadrantContext.kwadranten?.[2]?.uitleg}
                            </small>
                          </td>
                          <td>
                            {lesson.quadrantContext.kwadranten?.[3]?.naam}
                            <br />
                            <small>
                              {lesson.quadrantContext.kwadranten?.[3]?.uitleg}
                            </small>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="lesson-text">Geen kwadrant ingevuld.</p>
                )}

                <div className="lesson-section-title">
                  Bronnenoverzicht (afbeeldingen)
                </div>
                {imageSources.length === 0 ? (
                  <p className="lesson-text">Geen afbeeldingen geselecteerd.</p>
                ) : (
                  <div className="lesson-images-grid">
                    {imageSources.map((s, idx) => (
                      <div key={s.id || idx} className="lesson-image-card">
                        {s.url && (
                          <img src={s.url} alt={s.titel || "bron"} />
                        )}
                        <div className="lesson-image-meta">
                          <div>
                            <strong>{s.titel || "Zonder titel"}</strong>
                          </div>
                          {s.provider && <div>{s.provider}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="lesson-section-title">Samenwerkingstabel</div>
              {lesson.samenwerkingTabelIngevuld ? (
                <pre className="lesson-pre">
                  {lesson.samenwerkingTabelIngevuld}
                </pre>
              ) : (
                <p className="lesson-text">Nog geen tabel ingevuld.</p>
              )}

              <div className="lesson-section-title">Kwadrant (ruwe tabel)</div>
              {lesson.kwadrantIngevuld ? (
                <pre className="lesson-pre">
                  {lesson.kwadrantIngevuld}
                </pre>
              ) : (
                <p className="lesson-text">Nog geen kwadranttabel ingevuld.</p>
              )}

              <div className="lesson-section-title">Reflectie-antwoorden</div>
              {lesson.reflectieAntwoorden?.length ? (
                <ul className="lesson-reflect-list">
                  {lesson.reflectieAntwoorden.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="lesson-text">Nog geen reflecties.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="lesson-section-title">Hoofdvraag</div>
              <p className="lesson-text">{lesson.hoofdvraag || "—"}</p>

              <div className="lesson-section-title">Deelvragen</div>
              <ol className="lesson-text">
                {lesson.deelvragen?.map(renderDeelvraag)}
              </ol>

              <div className="lesson-section-title">Opdracht</div>
              <p className="lesson-text">
                {lesson.leerlingenOpdracht ||
                  "Gebruik de bronnen en het kwadrant om de hoofdvraag te beantwoorden."}
              </p>

              <div className="lesson-section-title">
                Belangrijkste bronnen (afbeeldingen)
              </div>
              {imageSources.length === 0 ? (
                <p className="lesson-text">Geen afbeeldingen geselecteerd.</p>
              ) : (
                <div className="lesson-images-grid">
                  {imageSources.map((s, idx) => (
                    <div key={s.id || idx} className="lesson-image-card">
                      {s.url && (
                        <img src={s.url} alt={s.titel || "bron"} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="lesson-section-title">Reflectie</div>
              <p className="lesson-text">
                Wat vind jij na het werken met deze bronnen? Schrijf in 5–8
                zinnen een antwoord op de hoofdvraag.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


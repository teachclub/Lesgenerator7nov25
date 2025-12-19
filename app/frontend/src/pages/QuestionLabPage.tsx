import React, { useMemo, useState } from "react";
import { useSearchMatch } from "../hooks/useSearchMatch";
import { useQuestionGen } from "../hooks/useQuestionGen";
import { log, error } from "../utils/log";
import "./QuestionLabPage.css";

type Hoofdvraag = { id: number; vraag: string };
type Deelvraag = { id: number; subdimensie: string; vraag: string };

const TVS = [
  { tv: "1", label: "TV1" },
  { tv: "2", label: "TV2" },
  { tv: "3", label: "TV3" },
  { tv: "4", label: "TV4" },
  { tv: "5", label: "TV5" },
  { tv: "6", label: "TV6" },
  { tv: "7", label: "TV7" },
  { tv: "8", label: "TV8" },
  { tv: "9", label: "TV9" },
  { tv: "10", label: "TV10" },
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function labelTaalniveau(v: number) {
  if (v <= 0) return "mavo";
  if (v === 1) return "havo";
  return "vwo";
}

function nuanceTo15(n: number) {
  const x = clamp(Number(n) || 0, 0, 100);
  if (x <= 20) return 1;
  if (x <= 40) return 2;
  if (x <= 60) return 3;
  if (x <= 80) return 4;
  return 5;
}

const QuestionLabPage = () => {
  const [vraagType, setVraagType] = useState<string>("verklarend");
  const [richting, setRichting] = useState<string>("");
  const [presentisme, setPresentisme] = useState<boolean>(true);
  const [taalniveau, setTaalniveau] = useState<number>(1);
  const [nuance, setNuance] = useState<number>(55);

  const [tvSelected, setTvSelected] = useState<Set<string>>(new Set());

  const [prikkelFileName, setPrikkelFileName] = useState<string>("");
  const [prikkelText, setPrikkelText] = useState<string>("");

  const [hoofdvraagResult, setHoofdvraagResult] = useState<Hoofdvraag[] | null>(null);
  const [gekozenHoofdvraag, setGekozenHoofdvraag] = useState<Hoofdvraag | null>(null);
  const [deelvragen, setDeelvragen] = useState<Deelvraag[] | null>(null);

  const [selectie, setSelectie] = useState<Record<number, Set<string>>>({});
  const [voorstel, setVoorstel] = useState<any[] | null>(null);
  const [loadingVoorstel, setLoadingVoorstel] = useState(false);
  const [loadingGen, setLoadingGen] = useState(false);

  const { fetchMatches, result: bronnenPerDeelvraag } = useSearchMatch();
  const { genereerHoofdvraagEnDeelvragen } = useQuestionGen();

  const tvChips = useMemo(
    () => Array.from(tvSelected).sort((a, b) => Number(a) - Number(b)),
    [tvSelected]
  );

  const resetAlles = () => {
    setHoofdvraagResult(null);
    setGekozenHoofdvraag(null);
    setDeelvragen(null);
    setSelectie({});
    setVoorstel(null);
  };

  const toggleTv = (tv: string) => {
    setTvSelected((prev) => {
      const n = new Set(prev);
      n.has(tv) ? n.delete(tv) : n.add(tv);
      return n;
    });
  };

  const onUpload = async (file: File | null) => {
    if (!file) {
      setPrikkelFileName("");
      setPrikkelText("");
      return;
    }
    setPrikkelFileName(file.name);
    try {
      const txt = await file.text();
      setPrikkelText(txt.slice(0, 12000));
    } catch (e) {
      error("❌ Upload lezen faalde", e);
      setPrikkelText("");
    }
  };

  const buildInvoer = () => {
    const tvLine = tvChips.length ? `Tijdvak(ken): TV${tvChips.join(", TV")}` : "Tijdvak(ken): (niet geselecteerd)";
    const lvl = labelTaalniveau(taalniveau);

    const presentLine = presentisme
      ? "Presentisme-regel: hoofdvraag heeft impliciete bril-van-nu (ongeloof/afkeur/verbazing) zonder nu-vs-toen te benoemen."
      : "Presentisme-regel: neutraal en verklarend.";

    const prikkel = prikkelText?.trim()
      ? `Prikkelende bron (geüpload, fragment):\n${prikkelText.trim()}\n`
      : "";

    return [
      `Soort vraag: ${vraagType}`,
      `Richting/idee: ${richting || "(leeg)"}`,
      presentLine,
      `Taalniveau: ${lvl}`,
      `Nuance/afwegen (1-5): ${nuanceTo15(nuance)}`,
      tvLine,
      prikkel ? prikkel : "",
      "Output: 3 hoofdvraagchips + 4 deelvragen (subdimensies).",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const genereer = async () => {
    try {
      setLoadingGen(true);
      setVoorstel(null);

      const invoer = buildInvoer();

      const payload = {
        invoer,
        vraagType,
        richting,
        presentisme,
        level: labelTaalniveau(taalniveau),
        nuance: nuanceTo15(nuance),
        tv: tvChips,
        prikkelText,
      };

      const resultaat = await genereerHoofdvraagEnDeelvragen(payload);

      const hoofd = (resultaat?.hoofdvraagSuggesties || []).slice(0, 3);
      setHoofdvraagResult(hoofd);
      setGekozenHoofdvraag(null);

      setDeelvragen(resultaat?.deelvragen || []);
      setSelectie({});

      log("🎯 Vragen gegenereerd", { payload, resultaat });
    } catch (err) {
      error("❌ Generatie faalde", err);
    } finally {
      setLoadingGen(false);
    }
  };

  const verwijderHoofdvraag = (id: number) => {
    setHoofdvraagResult((prev) => (prev ? prev.filter((hv) => hv.id !== id) : prev));
    if (gekozenHoofdvraag?.id === id) setGekozenHoofdvraag(null);
  };

  const kiesHoofdvraag = (hv: Hoofdvraag) => {
    setGekozenHoofdvraag(hv);
    setVoorstel(null);
  };

  const handleUpdateDeelvraag = (index: number, nieuweVraag: string) => {
    setDeelvragen((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], vraag: nieuweVraag };
      return updated;
    });
  };

  const handleVerwijderDeelvraag = (id: number) => {
    setDeelvragen((prev) => (prev ? prev.filter((dv) => dv.id !== id) : prev));
  };

  const toggleSelectie = (dvId: number, bronId: string) => {
    setSelectie((prev) => {
      const nieuw = new Set(prev[dvId] || []);
      nieuw.has(bronId) ? nieuw.delete(bronId) : nieuw.add(bronId);
      return { ...prev, [dvId]: nieuw };
    });
  };

  const opslaanSelectie = async (dvId: number) => {
    const bronIds = Array.from(selectie[dvId] || []);
    try {
      const res = await fetch("/api/bronselectie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deelvraagId: dvId, bronIds }),
      });
      const data = await res.json();
      if (data.ok) log(`✅ Opgeslagen selectie voor deelvraag ${dvId}`, bronIds);
      else error(`❌ Fout bij opslaan`, data);
    } catch (err) {
      error(`❌ Netwerkfout bij opslaan`, err);
    }
  };

  const verstuurLesvoorstel = async () => {
    if (!deelvragen) return;
    const payload = {
      hoofdvraag: gekozenHoofdvraag,
      deelvragen,
      selectie: Object.fromEntries(Object.entries(selectie).map(([k, v]) => [k, Array.from(v)])),
    };
    try {
      setLoadingVoorstel(true);
      const res = await fetch("/api/lesson-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setVoorstel(data.voorstel);
      log("📦 Voorstel ontvangen", data);
    } catch (err) {
      error("❌ Lesvoorstel ophalen faalde", err);
    } finally {
      setLoadingVoorstel(false);
    }
  };

  return (
    <div className="ql">
      <header className="ql-header">
        <div>
          <h1>QuestionLab</h1>
          <p>3 kolommen: vraagconfig → hoofdvraagchips → bronnen & lesvoorstel.</p>
        </div>
        <div className="ql-header-actions">
          <button className="ql-btn ql-btn-light" type="button" onClick={resetAlles}>
            Reset
          </button>
          <a className="ql-link" href="/preset">
            Preset-zoeker
          </a>
        </div>
      </header>

      <div className="ql-grid">
        <aside className="ql-col ql-left">
          <section className="ql-card">
            <h2>Instellingen</h2>

            <label className="ql-label">Wat voor soort onderzoeksvraag</label>
            <select className="ql-select" value={vraagType} onChange={(e) => setVraagType(e.target.value)}>
              <option value="verklarend">Verklarend (waarom/waardoor)</option>
              <option value="vergelijkend">Vergelijkend (hoe/waarom elders anders)</option>
              <option value="oorzaak-gevolg">Oorzaak–gevolg</option>
              <option value="continuiteit-verandering">Continuïteit & verandering</option>
              <option value="perspectief">Perspectief / standplaatsgebondenheid</option>
            </select>

            <label className="ql-label">Wat is je hoofdvraag / welke richting denk je aan?</label>
            <textarea
              className="ql-textarea"
              value={richting}
              onChange={(e) => setRichting(e.target.value)}
              placeholder="Bijv. ‘Hoe kregen nazi’s zoveel steun?’"
            />

            <label className="ql-check">
              <input type="checkbox" checked={presentisme} onChange={(e) => setPresentisme(e.target.checked)} />
              Presentisme in hoofdvraag (impliciet)
            </label>

            <div className="ql-sliders">
              <div className="ql-slider">
                <div className="ql-slider-top">
                  <span>Taalniveau</span>
                  <strong>{labelTaalniveau(taalniveau)}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={taalniveau}
                  onChange={(e) => setTaalniveau(Number(e.target.value))}
                />
              </div>

              <div className="ql-slider">
                <div className="ql-slider-top">
                  <span>Complexiteit / nuance</span>
                  <strong>{nuanceTo15(nuance)}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={nuance}
                  onChange={(e) => setNuance(Number(e.target.value))}
                />
              </div>
            </div>

            <label className="ql-label">Uploaden prikkelende bron</label>
            <input
              className="ql-file"
              type="file"
              accept=".txt,.md,.html"
              onChange={(e) => onUpload(e.target.files?.[0] || null)}
            />
            {!!prikkelFileName && <div className="ql-muted">Geselecteerd: {prikkelFileName}</div>}

            <div className="ql-divider" />

            <label className="ql-label">Tijdvak</label>
            <div className="ql-chips">
              {TVS.map((t) => (
                <button
                  type="button"
                  key={t.tv}
                  className={`ql-chip ${tvSelected.has(t.tv) ? "ql-chip-on" : ""}`}
                  onClick={() => toggleTv(t.tv)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="ql-actions">
              <button className="ql-btn" type="button" onClick={genereer} disabled={loadingGen}>
                {loadingGen ? "⏳ Genereren..." : "Genereer hoofdvraag + deelvragen"}
              </button>
            </div>
          </section>
        </aside>

        <main className="ql-col ql-mid">
          <section className="ql-card">
            <h2>Hoofdvraag (3 chips)</h2>

            <div className="ql-chiprow">
              {(hoofdvraagResult || []).map((hv) => (
                <div
                  key={hv.id}
                  className={`ql-bigchip ${gekozenHoofdvraag?.id === hv.id ? "ql-bigchip-on" : ""}`}
                  onClick={() => kiesHoofdvraag(hv)}
                  role="button"
                  tabIndex={0}
                >
                  <span>{hv.vraag}</span>
                  <button
                    className="ql-x"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      verwijderHoofdvraag(hv.id);
                    }}
                    aria-label="Verwijder hoofvraag"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!hoofdvraagResult?.length && <div className="ql-muted">Nog geen hoofdvragen (klik links op genereren).</div>}
            </div>

            {gekozenHoofdvraag && (
              <div className="ql-picked">
                <strong>Gekozen:</strong> {gekozenHoofdvraag.vraag}
                <button className="ql-btn ql-btn-light" type="button" onClick={() => setGekozenHoofdvraag(null)}>
                  Wegklikken
                </button>
              </div>
            )}
          </section>

          {gekozenHoofdvraag && (
            <section className="ql-card">
              <h2>Deelvragen</h2>

              {(deelvragen || []).map((dv, index) => (
                <div key={dv.id} className="ql-deelvraag">
                  <div className="ql-deelvraag-top">
                    <div className="ql-subdimensie">{dv.subdimensie}</div>

                    <button className="ql-x2" type="button" onClick={() => handleVerwijderDeelvraag(dv.id)}>
                      ×
                    </button>
                  </div>

                  <textarea
                    className="ql-textarea ql-textarea-small"
                    value={dv.vraag}
                    onChange={(e) => handleUpdateDeelvraag(index, e.target.value)}
                  />

                  <div className="ql-toolbar">
                    <button
                      className="ql-btn ql-btn-light"
                      type="button"
                      onClick={() => fetchMatches(String(dv.id), dv.vraag, dv.subdimensie)}
                    >
                      🔍 Vind bronnen
                    </button>
                  </div>
                </div>
              ))}

              {!deelvragen?.length && <div className="ql-muted">Nog geen deelvragen.</div>}
            </section>
          )}
        </main>

        <aside className="ql-col ql-right">
          <section className="ql-card">
            <h2>Bronnen & selectie</h2>

            {!gekozenHoofdvraag && <div className="ql-muted">Kies eerst een hoofdvraag in het midden.</div>}

            {gekozenHoofdvraag &&
              (deelvragen || []).map((dv) => (
                <div key={dv.id} className="ql-bronblok">
                  <div className="ql-bronblok-top">
                    <strong>Deelvraag {dv.id}</strong>
                    <span className="ql-muted">{dv.subdimensie}</span>
                  </div>

                  <div className="ql-bronnen">
                    {(bronnenPerDeelvraag[dv.id] || []).map((b, i) => (
                      <label key={b.id} className="ql-bron">
                        <input
                          type="checkbox"
                          checked={selectie[dv.id]?.has(b.id) || false}
                          onChange={() => toggleSelectie(dv.id, b.id)}
                        />
                        <div>
                          <div className="ql-bron-title">
                            <strong>{i < 2 ? "⭐" : "▫️"} {b.title}</strong>
                          </div>
                          <div className="ql-bron-desc">{b.motivatie || b.kernargumenten?.[0]}</div>
                        </div>
                      </label>
                    ))}

                    {!bronnenPerDeelvraag[dv.id]?.length && <div className="ql-muted">Nog geen bronnen (dummy search-match geeft nog lege lijst).</div>}
                  </div>

                  <div className="ql-toolbar">
                    <button className="ql-btn ql-btn-light" type="button" onClick={() => opslaanSelectie(dv.id)}>
                      💾 Opslaan selectie
                    </button>
                  </div>
                </div>
              ))}
          </section>

          <section className="ql-card">
            <h2>Lesvoorstel</h2>
            <button className="ql-btn" type="button" onClick={verstuurLesvoorstel} disabled={!gekozenHoofdvraag || loadingVoorstel}>
              {loadingVoorstel ? "⏳ Bouwen..." : "📦 Bouw lesvoorstel"}
            </button>

            {voorstel && (
              <ul className="ql-voorstel">
                {voorstel.map((blok, i) => (
                  <li key={i}>
                    <strong>{blok.subdimensie}:</strong> {blok.deelvraag} → {blok.aanbeveling}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default QuestionLabPage;


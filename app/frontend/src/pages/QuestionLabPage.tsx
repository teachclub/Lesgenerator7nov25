import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { labFetch } from "../lib/labFetch";
import { resetEvents } from "../lib/labDebugStore";
import LabDebugOverlay from "../components/LabDebugOverlay";
import LabStatus from "../components/LabStatus";

const LAB_VERSION = "questionlab-v5";

const TIJDVAKKEN = [
  { id: "1", label: "Jagers en boeren" },
  { id: "2", label: "Grieken en Romeinen" },
  { id: "3", label: "Monniken en ridders" },
  { id: "4", label: "Steden en staten" },
  { id: "5", label: "Ontdekkers en hervormers" },
  { id: "6", label: "Regenten en vorsten" },
  { id: "7", label: "Pruiken en revoluties" },
  { id: "8", label: "Burgers en stoommachines" },
  { id: "9", label: "Wereldoorlogen" },
  { id: "10", label: "Televisie en computer" }
];

const HOOFDVRAAG_TYPES = [
  { id: "vrij", label: "Vrij (geen type)" },
  { id: "verklarend", label: "Verklarend (waarom/hoe)" },
  { id: "vergelijkend", label: "Vergelijkend (A vs B)" },
  { id: "verandering", label: "Verandering/continuïteit" },
  { id: "standpunt", label: "Standpunt/weging (afwegen)" }
];

function labelErk(n: number) {
  if (n <= 1) return "ERK A1 (heel simpel) – korte zinnen, weinig vaktaal";
  if (n === 2) return "ERK A2 (simpel) – basistaal, weinig abstract";
  if (n === 3) return "ERK B1 (normaal) – havo-basis, duidelijke zinnen";
  if (n === 4) return "ERK B2 (hoog) – preciezer, meer vaktaal";
  return "ERK C1 (heel hoog) – rijker, abstracter, preciezer";
}

function labelNuance(n: number) {
  if (n <= 1) return "Weinig nuance (rechttoe rechtaan)";
  if (n === 2) return "Beetje nuance";
  if (n === 3) return "Gemiddeld (afwegen)";
  if (n === 4) return "Veel nuance (meerdere factoren)";
  return "Max nuance (tegenargumenten/afweging)";
}

export default function QuestionLabPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const disabled = status === "loading";

  const [presentisme, setPresentisme] = useState(true);
  const [taalniveau, setTaalniveau] = useState(2); // lager default
  const [nuance, setNuance] = useState(2); // lager default
  const [vraagType, setVraagType] = useState<string>("vrij");
  const [tijdvakken, setTijdvakken] = useState<string[]>([]);

  const [idee, setIdee] = useState("");

  const [useSeed, setUseSeed] = useState(false);
  const [seedType, setSeedType] = useState<"text" | "image">("text");
  const [seedText, setSeedText] = useState("");
  const [seedImageUrl, setSeedImageUrl] = useState("");
  const [seedToelichting, setSeedToelichting] = useState("");
  const [seedRelatieMetHoofdvraag, setSeedRelatieMetHoofdvraag] = useState("");
  const [seedRichting, setSeedRichting] = useState("");

  const [hoofdvraagResult, setHoofdvraagResult] = useState<any>(null);
  const [gekozenHoofdvraag, setGekozenHoofdvraag] = useState<string>("");

  function resetLab() {
    setStatus("idle");
    setErrorMsg(null);

    setPresentisme(true);
    setTaalniveau(2);
    setNuance(2);
    setVraagType("vrij");
    setTijdvakken([]);

    setIdee("");

    setUseSeed(false);
    setSeedType("text");
    setSeedText("");
    setSeedImageUrl("");
    setSeedToelichting("");
    setSeedRelatieMetHoofdvraag("");
    setSeedRichting("");

    setHoofdvraagResult(null);
    setGekozenHoofdvraag("");

    resetEvents();
  }

  function toggleTijdvak(tv: string) {
    setTijdvakken((prev) => (prev.includes(tv) ? prev.filter((x) => x !== tv) : [...prev, tv]));
  }

  async function callWithTimeout(p: Promise<any>, ms = 25000) {
    return Promise.race([
      p,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout (mogelijk Gemini)")), ms))
    ]);
  }

  function buildSeedSourceOrNull() {
    if (!useSeed) return null;

    const base: any = {
      type: seedType,
      observatie: seedToelichting,
      seedPrompt: seedRichting
    };

    if (seedType === "image") {
      if (!seedImageUrl.trim()) return null;
      base.imageUrl = seedImageUrl.trim();
    } else {
      if (!seedText.trim()) return null;
      base.text = seedText.trim();
    }

    if (seedRelatieMetHoofdvraag.trim()) {
      const rel = seedRelatieMetHoofdvraag.trim();
      base.seedPrompt = base.seedPrompt
        ? `${base.seedPrompt}\nRelatie met hoofdvraag: ${rel}`
        : `Relatie met hoofdvraag: ${rel}`;
    }

    return base;
  }

  const canGenerate = useMemo(() => {
    if (useSeed) {
      if (seedType === "image") return !!seedImageUrl.trim();
      return !!seedText.trim();
    }
    return !!idee.trim();
  }, [useSeed, seedType, seedImageUrl, seedText, idee]);

  async function genereerHoofdvragen() {
    if (!canGenerate) {
      setErrorMsg("Vul een richting in of kies een bron.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);
    setHoofdvraagResult(null);
    setGekozenHoofdvraag("");

    try {
      const seedSource = buildSeedSourceOrNull();

      const res = await callWithTimeout(
        labFetch("/api/question-gen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: 1,
            idee,
            presentisme,
            niveau: taalniveau,
            nuance,
            vraagType,
            tijdvakken,
            seedSource
          })
        })
      );

      const json = await res.json();
      if (!json?.result?.hoofdvragen?.length) throw new Error("Geen hoofdvragen ontvangen");

      setHoofdvraagResult(json.result);
      setStatus("idle");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  }

  function naarDeelvragenVerfijnen() {
    if (!gekozenHoofdvraag.trim()) {
      setErrorMsg("Selecteer eerst één hoofdvraag.");
      setStatus("error");
      return;
    }

    const payload = {
      fromLab: true,
      labVersion: LAB_VERSION,
      stap: "deelvragen-verfijnen",
      hoofdvraag: gekozenHoofdvraag,
      instellingen: {
        presentisme,
        taalniveau,
        nuance,
        vraagType,
        tijdvakken
      },
      seedSource: buildSeedSourceOrNull()
    };

    navigate("/lab/sources", { state: payload });
  }

  const hvList = hoofdvraagResult?.hoofdvragen || [];

  return (
    <div className="lesgo-generator-page">
      <div className="lesgo-generator-layout" style={{ gridTemplateColumns: "360px minmax(0, 1fr)" }}>
        <aside className="lesgo-sidebar">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h1 className="lesgo-title" style={{ margin: 0 }}>Vraaggenerator (LAB)</h1>
              <div style={{ fontSize: 12, opacity: 0.55 }}>v{LAB_VERSION}</div>
            </div>
            <LabStatus state={status} />
            {errorMsg && <div className="lesgo-error" style={{ marginTop: 8 }}>{errorMsg}</div>}
          </div>

          <div className="lesgo-panel">
            <h2>1) Instellingen</h2>

            <label style={{ display: "block", marginBottom: 10 }}>
              <input disabled={disabled} type="checkbox" checked={presentisme} onChange={(e) => setPresentisme(e.target.checked)} />{" "}
              Anti-presentisme
            </label>

            <div className="lesgo-field">
              <span>Type hoofdvraag (optioneel)</span>
              <select
                disabled={disabled}
                value={vraagType}
                onChange={(e) => setVraagType(e.target.value)}
                style={{ borderRadius: 8, border: "1px solid #d1d5db", padding: "0.45rem 0.6rem", fontSize: "0.9rem" }}
              >
                {HOOFDVRAAG_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="lesgo-field">
              <span>Taalniveau (ERK)</span>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{labelErk(taalniveau)}</div>
              <input disabled={disabled} type="range" min={1} max={5} value={taalniveau} onChange={(e) => setTaalniveau(Number(e.target.value))} />
            </div>

            <div className="lesgo-field">
              <span>Nuance / afwegen</span>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{labelNuance(nuance)}</div>
              <input disabled={disabled} type="range" min={1} max={5} value={nuance} onChange={(e) => setNuance(Number(e.target.value))} />
            </div>
          </div>

          <div className="lesgo-panel">
            <h2>2) Tijdvakken</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TIJDVAKKEN.map((tv) => {
                const active = tijdvakken.includes(tv.id);
                return (
                  <button
                    key={tv.id}
                    disabled={disabled}
                    onClick={() => toggleTijdvak(tv.id)}
                    className="lesgo-button"
                    style={{
                      borderRadius: 9999,
                      padding: "0.25rem 0.7rem",
                      fontSize: 12,
                      borderColor: active ? "#2563eb" : "#d1d5db",
                      background: active ? "#2563eb" : "white",
                      color: active ? "white" : "#111827"
                    }}
                    type="button"
                  >
                    TV {tv.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lesgo-panel">
            <h2>3) Start</h2>

            <div className="lesgo-field">
              <span>Richting / hoofdvraag (tekst)</span>
              <textarea
                disabled={disabled}
                value={idee}
                onChange={(e) => setIdee(e.target.value)}
                rows={3}
                placeholder="Bijv. ‘Waarom kreeg Hitler in Duitsland (1932) zoveel steun?’"
              />
            </div>

            <label style={{ display: "block", marginBottom: 8 }}>
              <input disabled={disabled} type="checkbox" checked={useSeed} onChange={(e) => setUseSeed(e.target.checked)} />{" "}
              Startbron toevoegen (optioneel)
            </label>

            {useSeed && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, background: "#f9fafb" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <label style={{ fontSize: 13 }}>
                    <input disabled={disabled} type="radio" checked={seedType === "text"} onChange={() => setSeedType("text")} />{" "}
                    Tekst
                  </label>
                  <label style={{ fontSize: 13 }}>
                    <input disabled={disabled} type="radio" checked={seedType === "image"} onChange={() => setSeedType("image")} />{" "}
                    Afbeelding (URL)
                  </label>
                </div>

                {seedType === "text" ? (
                  <textarea
                    disabled={disabled}
                    value={seedText}
                    onChange={(e) => setSeedText(e.target.value)}
                    rows={4}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: "0.45rem 0.6rem" }}
                    placeholder="Plak de volledige tekstbron."
                  />
                ) : (
                  <input
                    disabled={disabled}
                    value={seedImageUrl}
                    onChange={(e) => setSeedImageUrl(e.target.value)}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: "0.45rem 0.6rem" }}
                    placeholder="Plak de afbeelding-URL."
                  />
                )}

                <textarea
                  disabled={disabled}
                  value={seedToelichting}
                  onChange={(e) => setSeedToelichting(e.target.value)}
                  rows={2}
                  style={{ width: "100%", marginTop: 8, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.45rem 0.6rem" }}
                  placeholder="Toelichting (context): wat is dit voor bron?"
                />

                <textarea
                  disabled={disabled}
                  value={seedRelatieMetHoofdvraag}
                  onChange={(e) => setSeedRelatieMetHoofdvraag(e.target.value)}
                  rows={2}
                  style={{ width: "100%", marginTop: 8, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.45rem 0.6rem" }}
                  placeholder="Wat heeft deze bron met je hoofdvraag te maken?"
                />

                <input
                  disabled={disabled}
                  value={seedRichting}
                  onChange={(e) => setSeedRichting(e.target.value)}
                  style={{ width: "100%", marginTop: 8, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.45rem 0.6rem" }}
                  placeholder="Extra prompt/richting (optioneel)"
                />
              </div>
            )}

            <div className="lesgo-actions" style={{ marginTop: 12 }}>
              <button className="lesgo-button primary" disabled={disabled} onClick={genereerHoofdvragen} type="button">
                Genereer hoofdvragen
              </button>
              <button className="lesgo-button" disabled={disabled} onClick={resetLab} type="button">
                Reset
              </button>
            </div>
          </div>
        </aside>

        <main className="lesgo-main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Hoofdvraag</h2>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Selecteer → Volgende stap: deelvragen verfijnen</div>
          </div>

          {!hoofdvraagResult && (
            <div className="lesgo-placeholder">
              <h2>Start links</h2>
              <div style={{ opacity: 0.7 }}>
                Vul een richting in (of voeg een startbron toe) en klik op <strong>Genereer hoofdvragen</strong>.
              </div>
            </div>
          )}

          {hvList?.length > 0 && (
            <div className="lesgo-output-wrapper" style={{ marginTop: 12 }}>
              <h3 style={{ marginTop: 0 }}>Kies één hoofdvraag</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {hvList.map((hv: any) => {
                  const active = gekozenHoofdvraag === hv.vraag;
                  return (
                    <label
                      key={hv.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        cursor: "pointer",
                        background: active ? "#dbeafe" : "white"
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <input
                          disabled={disabled}
                          type="radio"
                          name="gekozenHoofdvraag"
                          checked={active}
                          onChange={() => setGekozenHoofdvraag(hv.vraag)}
                          style={{ marginTop: 4 }}
                        />
                        <div style={{ lineHeight: 1.45 }}>
                          <div style={{ fontWeight: 600 }}>{hv.vraag}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  className="lesgo-button primary"
                  disabled={disabled || !gekozenHoofdvraag}
                  onClick={naarDeelvragenVerfijnen}
                  type="button"
                >
                  Verder: deelvragen verfijnen
                </button>
              </div>
            </div>
          )}

          <LabDebugOverlay />
        </main>
      </div>
    </div>
  );
}


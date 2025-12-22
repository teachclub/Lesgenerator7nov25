import React, { useMemo, useState } from "react";

type HvChip = { id: string; text: string };
type DvItem = { id: string; dimKey?: string; dimLabel?: string; text: string };

type QlRes = {
  ok?: boolean;
  rid?: string;
  used?: string;
  ms?: number;
  hoofdvragen?: HvChip[];
  deelvragen?: DvItem[];
  error?: string;
};

async function postJSON<T>(url: string, body: any, timeoutMs = 25000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const txt = await r.text();
    let data: any = null;
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      data = { error: txt || `Non-JSON response (${r.status})` };
    }
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    return data as T;
  } finally {
    clearTimeout(t);
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function QuestionLabPage() {
  const tvChips = useMemo(() => Array.from({ length: 10 }, (_, i) => `TV${i + 1}`), []);

  const [vraagType, setVraagType] = useState<string>("Verklarend (waarom/waardoor)");
  const [richting, setRichting] = useState<string>("waarom nazi's zoveel aanhangers");
  const [presentisme, setPresentisme] = useState<boolean>(true);

  const [taalniveau, setTaalniveau] = useState<number>(3);
  const [complexiteit, setComplexiteit] = useState<number>(3);
  const [tijdvak, setTijdvak] = useState<string>("TV9");

  const [bijpromptHv, setBijpromptHv] = useState<string>("");
  const [showBijpromptHv, setShowBijpromptHv] = useState<boolean>(false);

  const [bijpromptDv, setBijpromptDv] = useState<string>("");
  const [showBijpromptDv, setShowBijpromptDv] = useState<boolean>(false);

  const [uploadFileName, setUploadFileName] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");

  const [hoofdvraagChips, setHoofdvraagChips] = useState<HvChip[]>([]);
  const [selectedHvId, setSelectedHvId] = useState<string>("");

  const [deelvragen, setDeelvragen] = useState<DvItem[]>([]);
  const [selectedDvId, setSelectedDvId] = useState<string>("");

  const selectedHv = useMemo(
    () => hoofdvraagChips.find((h) => h.id === selectedHvId) || null,
    [hoofdvraagChips, selectedHvId]
  );

  const selectedDv = useMemo(
    () => deelvragen.find((d) => d.id === selectedDvId) || null,
    [deelvragen, selectedDvId]
  );

  function resetAll() {
    setVraagType("Verklarend (waarom/waardoor)");
    setRichting("");
    setPresentisme(true);
    setTaalniveau(3);
    setComplexiteit(3);
    setTijdvak("TV9");
    setBijpromptHv("");
    setShowBijpromptHv(false);
    setBijpromptDv("");
    setShowBijpromptDv(false);
    setUploadFileName("");
    setHoofdvraagChips([]);
    setSelectedHvId("");
    setDeelvragen([]);
    setSelectedDvId("");
    setStatus("");
  }

  async function generateHvDv() {
    setLoading(true);
    setStatus("Genereren…");
    try {
      const payload = {
        richting,
        presentisme,
        hoofdvraagType: vraagType,
        tijdvak: tijdvak.replace("TV", ""),
        taalniveau,
        complexiteit,
      };
      const res = await postJSON<QlRes>("/api/ql/question-gen", payload, 25000);

      const hv = Array.isArray(res?.hoofdvragen) ? res.hoofdvragen : [];
      const dv = Array.isArray(res?.deelvragen) ? res.deelvragen : [];

      setHoofdvraagChips(hv);
      setSelectedHvId(hv[0]?.id || "");
      setDeelvragen(dv);
      setSelectedDvId(dv[0]?.id || "");

      setStatus(`Klaar (${res?.ms ?? "?"} ms)`);
    } catch (e: any) {
      setStatus(`Fout: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateSelectedHvWithBijprompt() {
    if (!selectedHv) {
      setStatus("Kies eerst een hoofdvraag-chip.");
      return;
    }
    setLoading(true);
    setStatus("Regenerate hoofdvraag…");
    try {
      const payload = {
        richting,
        presentisme,
        hoofdvraagType: vraagType,
        tijdvak: tijdvak.replace("TV", ""),
        taalniveau,
        complexiteit,
        bijprompt: bijpromptHv,
        regen: { kind: "hv", current: selectedHv.text },
      };
      const res = await postJSON<QlRes>("/api/ql/question-gen", payload, 25000);

      const nextHv = (Array.isArray(res?.hoofdvragen) ? res.hoofdvragen : [])[0];
      if (nextHv?.text) {
        setHoofdvraagChips((prev) =>
          prev.map((h) => (h.id === selectedHv.id ? { ...h, text: nextHv.text } : h))
        );
        setStatus("Hoofdvraag regenerated");
      } else {
        setStatus("Geen nieuwe hoofdvraag ontvangen");
      }
    } catch (e: any) {
      setStatus(`Fout: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateSelectedDvWithBijprompt() {
    if (!selectedDv) {
      setStatus("Kies eerst een deelvraag.");
      return;
    }
    setLoading(true);
    setStatus("Regenerate deelvraag…");
    try {
      const payload = {
        richting,
        presentisme,
        hoofdvraagType: vraagType,
        tijdvak: tijdvak.replace("TV", ""),
        taalniveau,
        complexiteit,
        bijprompt: bijpromptDv,
        regen: { kind: "dv", dimKey: selectedDv.dimKey, current: selectedDv.text },
      };
      const res = await postJSON<QlRes>("/api/ql/question-gen", payload, 25000);

      // Verwacht: deelvragen[0].text (of fallback hoofdvragen[0].text)
      const nextDv = (Array.isArray(res?.deelvragen) ? res.deelvragen : [])[0];
      const nextText =
        nextDv?.text ||
        (Array.isArray(res?.hoofdvragen) ? res.hoofdvragen : [])[0]?.text ||
        "";

      if (nextText) {
        setDeelvragen((prev) => prev.map((d) => (d.id === selectedDv.id ? { ...d, text: nextText } : d)));
        setStatus("Deelvraag regenerated");
      } else {
        setStatus("Geen nieuwe deelvraag ontvangen");
      }
    } catch (e: any) {
      setStatus(`Fout: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  const boxStyle: React.CSSProperties = {
    border: "1px solid #e6e6e6",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, marginBottom: 6 };
  const subStyle: React.CSSProperties = { fontSize: 12, opacity: 0.7, marginTop: 4 };

  return (
    <div style={{ padding: 14, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>QuestionLab</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>3 kolommen: vraagconfig → hoofdvraagchips → bronnen & lesvoorstel.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={resetAll}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
          >
            Reset
          </button>
          <button
            onClick={() => (window.location.href = "/lab/presets")}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
          >
            Preset-zoeker
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr 420px", gap: 12, alignItems: "start" }}>
        {/* LEFT: Instellingen */}
        <div style={{ ...boxStyle }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, marginBottom: 10 }}>INSTELLINGEN</div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Wat voor soort onderzoeksvraag</div>
            <select
              value={vraagType}
              onChange={(e) => setVraagType(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
            >
              <option>Verklarend (waarom/waardoor)</option>
              <option>Beschrijvend (wat/hoe)</option>
              <option>Vergelijkend (overeenkomsten/verschillen)</option>
              <option>Beoordelend (standpunt/afweging)</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Wat is je hoofdvraag / welke richting denk je aan?</div>
            <textarea
              value={richting}
              onChange={(e) => setRichting(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", resize: "vertical" }}
            />
            <div style={subStyle}>Tip: kort + concreet (actor/plaats/tijd)</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={presentisme} onChange={(e) => setPresentisme(e.target.checked)} />
              Presentisme in hoofdvraag (impliciet)
            </label>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={labelStyle}>Taalniveau</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{taalniveau >= 3 ? "havo" : "vmbo"}</div>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={taalniveau}
              onChange={(e) => setTaalniveau(clamp(Number(e.target.value), 1, 5))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={labelStyle}>Complexiteit / nuance</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{complexiteit}</div>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={complexiteit}
              onChange={(e) => setComplexiteit(clamp(Number(e.target.value), 1, 5))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Tijdvak</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tvChips.map((tv) => {
                const active = tv === tijdvak;
                return (
                  <button
                    key={tv}
                    onClick={() => setTijdvak(tv)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      background: active ? "#111" : "#fff",
                      color: active ? "#fff" : "#111",
                      cursor: "pointer",
                    }}
                  >
                    {tv}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HV bijprompt */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={labelStyle}>Bijprompt hoofdvraag</div>
              <button
                onClick={() => setShowBijpromptHv((s) => !s)}
                style={{ width: 30, height: 30, borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                title="Toon/verberg bijprompt"
              >
                +
              </button>
            </div>
            {showBijpromptHv && (
              <textarea
                value={bijpromptHv}
                onChange={(e) => setBijpromptHv(e.target.value)}
                rows={3}
                placeholder="bv. maak concreter / scherper / leerlingentaal"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", resize: "vertical" }}
              />
            )}
          </div>

          {/* DV bijprompt */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={labelStyle}>Bijprompt deelvraag</div>
              <button
                onClick={() => setShowBijpromptDv((s) => !s)}
                style={{ width: 30, height: 30, borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                title="Toon/verberg bijprompt"
              >
                +
              </button>
            </div>
            {showBijpromptDv && (
              <textarea
                value={bijpromptDv}
                onChange={(e) => setBijpromptDv(e.target.value)}
                rows={3}
                placeholder="bv. maak onderzoekbaar / specifieker / causaliteit"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", resize: "vertical" }}
              />
            )}
            <div style={subStyle}>Werkt op de geselecteerde deelvraag (midden).</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Uploaden prikkelende bron</div>
            <input type="file" onChange={(e) => setUploadFileName(e.target.files?.[0]?.name || "")} style={{ width: "100%" }} />
            <div style={subStyle}>{uploadFileName ? uploadFileName : "Geen bestand gekozen"}</div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={generateHvDv}
              disabled={loading || !richting.trim()}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                opacity: loading || !richting.trim() ? 0.6 : 1,
              }}
            >
              Genereer hoofdvraag + deelvragen
            </button>

            <button
              onClick={regenerateSelectedHvWithBijprompt}
              disabled={loading || !selectedHvId}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                opacity: loading || !selectedHvId ? 0.6 : 1,
              }}
              title="Regenerate alleen de geselecteerde hoofdvraag (met bijprompt)"
            >
              Regenerate HV (met bijprompt)
            </button>

            <button
              onClick={regenerateSelectedDvWithBijprompt}
              disabled={loading || !selectedDvId}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                opacity: loading || !selectedDvId ? 0.6 : 1,
              }}
              title="Regenerate alleen de geselecteerde deelvraag (met bijprompt)"
            >
              Regenerate DV (met bijprompt)
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>{status}</div>
        </div>

        {/* MIDDLE: Hoofdvraag chips + DV lijst */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ ...boxStyle }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, marginBottom: 10 }}>
              HOOFDVRAAG ({hoofdvraagChips.length} CHIPS)
            </div>

            {!hoofdvraagChips.length ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>Nog geen hoofdvragen (klik links op genereren).</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {hoofdvraagChips.map((h) => {
                  const active = h.id === selectedHvId;
                  return (
                    <button
                      key={h.id}
                      onClick={() => setSelectedHvId(h.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        background: active ? "#111" : "#fff",
                        color: active ? "#fff" : "#111",
                        cursor: "pointer",
                      }}
                      title={h.text}
                    >
                      {h.text}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...boxStyle }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, marginBottom: 10 }}>DEELVRAGEN</div>
            {!deelvragen.length ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>Nog geen deelvragen.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {deelvragen.map((d) => {
                  const active = d.id === selectedDvId;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDvId(d.id)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #eee",
                        background: active ? "#f6f6f6" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{(d.dimLabel || d.dimKey || "subdimensie").toString()}</div>
                      <div style={{ fontSize: 14 }}>{d.text}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Bronnen & selectie (placeholder) */}
        <div style={{ ...boxStyle }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, marginBottom: 10 }}>BRONNEN & SELECTIE</div>
          {!selectedHv ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>Kies eerst een hoofdvraag in het midden.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Geselecteerde hoofdvraag</div>
                <div style={{ fontWeight: 600 }}>{selectedHv.text}</div>
              </div>

              <div style={{ fontSize: 13, opacity: 0.9 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Geselecteerde deelvraag</div>
                <div style={{ fontWeight: 600 }}>{selectedDv ? selectedDv.text : "—"}</div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                (Dit paneel blijft zoals “oude UI”: bronnen ophalen/selectie zit in de volgende stappen van jouw flow.)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


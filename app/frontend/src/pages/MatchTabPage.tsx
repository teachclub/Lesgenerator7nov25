import { useEffect, useMemo, useState } from "react";

type MatchBron = {
  id: string;
  title: string;
  url?: string | null;
  provider?: string | null;
  status?: string | null;
  eindscore?: number | null;
  motivatie?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  fullText?: string | null;
};

type Deelvraag = {
  id: string | number;
  subdimensie?: string;
  vraag: string;
};

type MatchBundle = {
  deelvragen: Deelvraag[];
  matchesByDeelvraagId: Record<string, { bronnen: MatchBron[] }>;
  meta?: any;
};

const STORAGE_KEY = "lessie_match_bundle_v1";

function toKey(id: any) {
  return String(id ?? "").trim();
}

function subdimColor(sub: string) {
  const s = (sub || "").toLowerCase();
  if (s.includes("politiek")) return { bg: "#e8f1ff", border: "#3b82f6", chip: "#3b82f6" }; // blauw
  if (s.includes("sociaal") || s.includes("econom")) return { bg: "#fff7d6", border: "#f59e0b", chip: "#f59e0b" }; // geel
  if (s.includes("cultureel") || s.includes("mentaal") || s.includes("propaganda")) return { bg: "#ffe9d6", border: "#f97316", chip: "#f97316" }; // oranje
  if (s.includes("individ")) return { bg: "#efe9ff", border: "#8b5cf6", chip: "#8b5cf6" }; // paars
  return { bg: "#f3f4f6", border: "#9ca3af", chip: "#6b7280" };
}

function pickTop(bronnen: MatchBron[]) {
  const list = Array.isArray(bronnen) ? [...bronnen] : [];
  list.sort((a, b) => (Number(b.eindscore || 0) - Number(a.eindscore || 0)));
  const top4 = list.slice(0, 4).map((b) => ({ ...b, _tier: "top" as const }));
  const next2 = list.slice(4, 6).map((b) => ({ ...b, _tier: "rest" as const }));
  return [...top4, ...next2];
}

function proxiedImage(url?: string | null) {
  const u = (url || "").trim();
  if (!u) return "";
  return `/api/image-proxy?url=${encodeURIComponent(u)}`;
}

function safeText(s?: string | null) {
  return (s || "").replace(/\s+/g, " ").trim();
}

export default function MatchTabPage() {
  const [bundle, setBundle] = useState<MatchBundle | null>(null);
  const [selectedDeelvraagId, setSelectedDeelvraagId] = useState<string>("");
  const [selectedBronId, setSelectedBronId] = useState<string>("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setBundle(null);
        return;
      }
      const parsed = JSON.parse(raw) as MatchBundle;
      setBundle(parsed);

      const firstDv = parsed?.deelvragen?.[0];
      const firstId = firstDv ? toKey(firstDv.id) : "";
      setSelectedDeelvraagId(firstId);

      const firstBron = firstId && parsed.matchesByDeelvraagId?.[firstId]?.bronnen?.[0];
      setSelectedBronId(firstBron ? toKey(firstBron.id) : "");
    } catch {
      setBundle(null);
    }
  }, []);

  const deelvragen = bundle?.deelvragen || [];

  const selectedDeelvraag = useMemo(() => {
    return deelvragen.find((d) => toKey(d.id) === selectedDeelvraagId) || null;
  }, [deelvragen, selectedDeelvraagId]);

  const selectedBronnen = useMemo(() => {
    if (!bundle) return [];
    const box = bundle.matchesByDeelvraagId?.[selectedDeelvraagId];
    const bronnen = box?.bronnen || [];
    return pickTop(bronnen) as (MatchBron & { _tier: "top" | "rest" })[];
  }, [bundle, selectedDeelvraagId]);

  const selectedBron = useMemo(() => {
    const found = selectedBronnen.find((b) => toKey(b.id) === selectedBronId);
    return found || selectedBronnen[0] || null;
  }, [selectedBronnen, selectedBronId]);

  useEffect(() => {
    if (!selectedBronnen.length) {
      setSelectedBronId("");
      return;
    }
    const still = selectedBronnen.some((b) => toKey(b.id) === selectedBronId);
    if (!still) setSelectedBronId(toKey(selectedBronnen[0].id));
  }, [selectedBronnen, selectedBronId]);

  if (!bundle) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Bronnen matchen (3 kolommen)</h2>
        <p style={{ marginTop: 0, maxWidth: 760 }}>
          Geen match-data gevonden in deze tab.
          <br />
          Deze pagina verwacht <code>{STORAGE_KEY}</code> in <code>sessionStorage</code>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Bronnen matchen</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          Klik links een deelvraag, klik midden een bron, preview rechts.
        </div>
        <div style={{ marginLeft: "auto", color: "#6b7280", fontSize: 12 }}>
          Top 4 geel, daarna 2 wit.
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "360px 520px 1fr", minHeight: 0 }}>
        <div style={{ borderRight: "1px solid #e5e7eb", overflow: "auto", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Deelvragen</div>

          {deelvragen.map((dv) => {
            const id = toKey(dv.id);
            const sub = dv.subdimensie || "";
            const col = subdimColor(sub);
            const isActive = id === selectedDeelvraagId;

            const nAll = (bundle.matchesByDeelvraagId?.[id]?.bronnen || []).length;
            const nShow = Math.min(6, nAll);

            return (
              <button
                key={id}
                onClick={() => setSelectedDeelvraagId(id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: `2px solid ${isActive ? col.border : "#e5e7eb"}`,
                  background: col.bg,
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 10,
                  cursor: "pointer",
                  boxShadow: isActive ? "0 8px 20px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: col.chip,
                      flex: "0 0 auto",
                    }}
                  />
                  <div style={{ fontSize: 12, color: "#374151", fontWeight: 700 }}>
                    {sub || "subdimensie"}
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
                    {nShow}/{nAll}
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.25 }}>
                  {dv.vraag}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ borderRight: "1px solid #e5e7eb", overflow: "auto", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            Bronnen voor: <span style={{ color: "#111827", fontWeight: 700 }}>{selectedDeelvraag?.subdimensie || ""}</span>
          </div>

          {!selectedBronnen.length ? (
            <div style={{ color: "#6b7280", fontSize: 13 }}>Geen bronnen gevonden.</div>
          ) : (
            selectedBronnen.map((b) => {
              const isActive = toKey(b.id) === selectedBronId;
              const tier = (b as any)._tier as "top" | "rest";
              const bg = tier === "top" ? "#fff7d6" : "#ffffff";
              const border = tier === "top" ? "#f59e0b" : "#e5e7eb";

              const img = b.imageUrl ? proxiedImage(b.imageUrl) : "";

              return (
                <button
                  key={toKey(b.id)}
                  onClick={() => setSelectedBronId(toKey(b.id))}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: `2px solid ${isActive ? "#111827" : border}`,
                    background: bg,
                    borderRadius: 12,
                    padding: 10,
                    marginBottom: 10,
                    cursor: "pointer",
                    boxShadow: isActive ? "0 8px 20px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        width: 92,
                        height: 64,
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "#f3f4f6",
                        overflow: "hidden",
                        flex: "0 0 auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                        fontSize: 12,
                      }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        "geen image"
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <div style={{ fontWeight: 800, color: "#111827", fontSize: 14, lineHeight: 1.2 }}>
                          {b.title || "(zonder titel)"}
                        </div>
                        <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
                          score {Number(b.eindscore || 0)}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        {b.provider ? (
                          <span style={{ fontSize: 12, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>
                            {b.provider}
                          </span>
                        ) : null}
                        {b.status ? (
                          <span style={{ fontSize: 12, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>
                            {b.status}
                          </span>
                        ) : null}
                        {tier === "top" ? (
                          <span style={{ fontSize: 12, color: "#92400e", background: "#fde68a", padding: "2px 8px", borderRadius: 999 }}>
                            top
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#6b7280", background: "#f9fafb", padding: "2px 8px", borderRadius: 999 }}>
                            extra
                          </span>
                        )}
                      </div>

                      {b.motivatie ? (
                        <div style={{ marginTop: 8, fontSize: 13, color: "#374151", lineHeight: 1.25 }}>
                          {b.motivatie}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ overflow: "auto", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Preview</div>

          {!selectedBron ? (
            <div style={{ color: "#6b7280", fontSize: 13 }}>Selecteer een bron.</div>
          ) : (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 220,
                    height: 140,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#f3f4f6",
                    overflow: "hidden",
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9ca3af",
                    fontSize: 12,
                  }}
                >
                  {selectedBron.imageUrl ? (
                    <img
                      src={proxiedImage(selectedBron.imageUrl)}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    "geen image"
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#111827", lineHeight: 1.15 }}>
                    {selectedBron.title || "(zonder titel)"}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {selectedBron.provider ? (
                      <span style={{ fontSize: 12, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>
                        {selectedBron.provider}
                      </span>
                    ) : null}
                    {selectedBron.status ? (
                      <span style={{ fontSize: 12, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>
                        {selectedBron.status}
                      </span>
                    ) : null}
                    <span style={{ fontSize: 12, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>
                      score {Number(selectedBron.eindscore || 0)}
                    </span>
                  </div>

                  {selectedBron.url ? (
                    <div style={{ marginTop: 10, fontSize: 13 }}>
                      <a
                        href={selectedBron.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#2563eb", textDecoration: "none", wordBreak: "break-all" }}
                      >
                        Open bron
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Snippet</div>
                <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
                  {safeText(selectedBron.description) ||
                    safeText(selectedBron.fullText) ||
                    safeText(selectedBron.motivatie) ||
                    "Geen tekst beschikbaar in match-resultaat (alleen titel/url/status)."}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, color: "#6b7280", fontSize: 12 }}>
            Tip: deze tab verwacht dat QuestionLab vóór het openen <code>sessionStorage["{STORAGE_KEY}"]</code> vult.
          </div>
        </div>
      </div>
    </div>
  );
}


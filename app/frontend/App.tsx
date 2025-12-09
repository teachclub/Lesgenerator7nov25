import { useState, useEffect } from "react";
import {
  fetchTijdvakken,   // backend: [{id,label}]
  fetchKA,           // backend: [{id,name}]
  generateSearchTerms,
  kleioSearch,       // backend: /api/kleio/search?q=...&page=1 (geen limit)
} from "./lib/api";

/* ---------- Types die EXACT matchen met backend ---------- */
interface Tijdvak { id: string; label: string; }
interface KA { id: string; name: string; }
interface KleioItemRaw { title: string; url: string; source: string; }
interface KleioBron { id: string; titel: string; type: string; }
interface GeneratedTerms {
  personen: string[];
  gebeurtenissen: string[];
  begrippen: string[];
  jaartallen: string[];
}

/* ---------- Helpers ---------- */
const isTermsEmpty = (terms: GeneratedTerms | null) => {
  if (!terms) return true;
  return (
    (!terms.personen || terms.personen.length === 0) &&
    (!terms.gebeurtenissen || terms.gebeurtenissen.length === 0) &&
    (!terms.begrippen || terms.begrippen.length === 0) &&
    (!terms.jaartallen || terms.jaartallen.length === 0)
  );
};

function normalizeTerms(x: any): GeneratedTerms {
  // Defensive: voorkom render-crashes bij onverwachte shape
  return {
    personen: Array.isArray(x?.personen) ? x.personen : [],
    gebeurtenissen: Array.isArray(x?.gebeurtenissen) ? x.gebeurtenissen : [],
    begrippen: Array.isArray(x?.begrippen) ? x.begrippen : [],
    jaartallen: Array.isArray(x?.jaartallen) ? x.jaartallen : [],
  };
}

function mapKleioItems(items: KleioItemRaw[]): KleioBron[] {
  // Converteer backend-payload naar UI-vorm (id=url, titel=title, type=source)
  return (items || []).map((it) => ({
    id: it.url,
    titel: it.title,
    type: it.source,
  }));
}

/* ---------- Component ---------- */
export default function App() {
  // Dropdowns & chips
  const [tijdvakken, setTijdvakken] = useState<Tijdvak[]>([]);
  const [kenmerkendeAspecten, setKenmerkendeAspecten] = useState<KA[]>([]);
  const [selectedTv, setSelectedTv] = useState<string>("");
  const [selectedKa, setSelectedKa] = useState<string>("");
  const [suggestedTerms, setSuggestedTerms] = useState<GeneratedTerms | null>(null);

  // Zoeken & resultaten
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<KleioBron[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchTerms, setLastSearchTerms] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"direct" | "context">("direct");

  // Basket
  const [selectedBronnen, setSelectedBronnen] = useState<KleioBron[]>([]);
  const [aantalBronnen, setAantalBronnen] = useState(3); // min 3, max 6

  /* ----- Effect: tijdvakken laden ----- */
  useEffect(() => {
    fetchTijdvakken()
      .then((list: Tijdvak[]) => setTijdvakken(list || []))
      .catch((err) => console.error("Fout bij ophalen tijdvakken:", err));
  }, []);

  /* ----- Effect: KA laden bij TV-change ----- */
  useEffect(() => {
    if (selectedTv) {
      // reset UI-states die afhangen van TV
      setKenmerkendeAspecten([]);
      setSelectedKa("");
      setSuggestedTerms(null);
      setSearchMode("context");

      fetchKA(selectedTv)
        .then((list: KA[]) => setKenmerkendeAspecten(list || []))
        .catch((err) => console.error("Fout bij ophalen KA:", err));
    } else {
      setKenmerkendeAspecten([]);
      setSelectedKa("");
      setSuggestedTerms(null);
      setSearchMode("direct");
    }
  }, [selectedTv]);

  /* ----- Effect: chips reset bij KA-change ----- */
  useEffect(() => {
    setSuggestedTerms(null);
  }, [selectedKa]);

  /* ----- Handlers ----- */
  function handleTvChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // bij context mode: directe zoekterm leegmaken om verwarring te voorkomen
    setSearchTerm("");
    setSelectedTv(e.target.value);
  }
  function handleKaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedKa(e.target.value);
  }

  function handleChipClick(term: string) {
    setSearchTerm((prev) => (prev.includes(term) ? prev : `${prev} ${term}`.trim()));
  }

  function handleBronSelect(bron: KleioBron, isChecked: boolean) {
    setSelectedBronnen((prev) => {
      if (isChecked) {
        if (!prev.find((b) => b.id === bron.id)) return [...prev, bron];
      } else {
        return prev.filter((b) => b.id !== bron.id);
      }
      return prev;
    });
  }
  function isBronInBasket(bron: KleioBron) {
    return selectedBronnen.some((b) => b.id === bron.id);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setSearchResults([]);

    // Bepaal mode dynamisch
    const finalMode: "direct" | "context" = selectedTv ? "context" : "direct";
    setSearchMode(finalMode);

    let query = searchTerm.trim();

    if (finalMode === "context") {
      // Ka-label (niet id) doorgeven aan generateSearchTerms,
      // of fallback naar eerste KA-name als gebruiker nog niets koos
      let kaLabel = selectedKa;
      if (!kaLabel && kenmerkendeAspecten.length > 0) {
        kaLabel = kenmerkendeAspecten[0].name; // LET OP: backend veldnaam is 'name'
      }

      try {
        const data = await generateSearchTerms(selectedTv, kaLabel || "");
        const safe = normalizeTerms(data?.terms);
        setSuggestedTerms(safe);

        // query op basis van alle geldige chips
        const allChips = [
          ...safe.personen,
          ...safe.gebeurtenissen,
          ...safe.begrippen,
          ...safe.jaartallen,
        ].filter(Boolean);
        query = allChips.length ? allChips.join(" ") : [selectedTv, kaLabel].filter(Boolean).join(" ");
      } catch (err) {
        console.error("Fout bij generateSearchTerms:", err);
        // fallback query als chips faalt
        query = [selectedTv, kaLabel].filter(Boolean).join(" ");
      }
    } else {
      // DIRECT
      if (!query) {
        setIsLoading(false);
        return;
      }
    }

    setLastSearchTerms(query);

    try {
      const resp = await kleioSearch(query, 1); // page=1, geen limit
      const mapped = mapKleioItems(resp?.items || []);
      setSearchResults(mapped);
    } catch (err) {
      console.error("Fout bij zoeken in Kleio:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const canGenerate = selectedBronnen.length >= aantalBronnen && selectedBronnen.length <= 6;
  const isContextMode = searchMode === "context";

  return (
    <div style={{ display: "flex", gap: "2rem", padding: "1rem" }}>
      {/* Linker kolom */}
      <div style={{ flex: 1 }}>
        <h2>Kleio — Bronnenselectie & Zoekrichting</h2>

        <div style={{ marginBottom: "1rem", border: "1px solid #ccc", padding: "1rem" }}>
          <h3>Zoekmodus: {isContextMode ? "Contextueel (TV/KA)" : "Direct (Zoekterm)"}</h3>

          {/* Contextuele route */}
          <fieldset disabled={!isContextMode && !!searchTerm}>
            <legend>1. Contextuele Zoekrichting</legend>

            <label>
              Tijdvak
              <select value={selectedTv} onChange={handleTvChange} disabled={!isContextMode && !!searchTerm}>
                <option value="">— kies tijdvak (optioneel) —</option>
                {tijdvakken.map((tv) => (
                  <option key={tv.id} value={tv.id}>{tv.label}</option>   {/* label! */}
                ))}
              </select>
            </label>
            <br />

            <label>
              Kenmerkend aspect
              <select
                value={selectedKa}
                onChange={handleKaChange}
                disabled={!selectedTv || kenmerkendeAspecten.length === 0 || !isContextMode}
              >
                <option value="">— kies KA (optioneel) —</option>
                {kenmerkendeAspecten.map((ka) => (
                  <option key={ka.id} value={ka.name}>{ka.name}</option>  {/* name! */}
                ))}
              </select>
            </label>

            <button type="button" onClick={() => setSelectedTv("")} disabled={!isContextMode}>
              Reset Context
            </button>
          </fieldset>

          <hr />

          {/* Directe route */}
          <fieldset disabled={isContextMode}>
            <legend>2. Directe Zoekrichting</legend>
            <label>
              Zoekterm (Kleio)
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => !isContextMode && setSearchTerm(e.target.value)}
                placeholder="Typ een trefwoord, persoon, of jaartal"
                style={{ minWidth: "300px" }}
                disabled={isContextMode}
              />
            </label>
            <button type="button" onClick={() => setSearchTerm("")} disabled={isContextMode}>
              Reset Zoekterm
            </button>
          </fieldset>

          <p style={{ marginTop: "1rem", fontWeight: "bold" }}>
            {isContextMode
              ? "Contextuele zoekterm wordt automatisch gegenereerd en zoekt in Kleio."
              : "De zoekterm hierboven wordt direct naar Kleio gestuurd."}
          </p>

          <hr />

          <label>
            Minimaal aantal bronnen (3–6)
            <input
              type="number"
              min={3}
              max={6}
              value={aantalBronnen}
              onChange={(e) => setAantalBronnen(Math.max(3, Math.min(6, Number(e.target.value))))}
            />
          </label>
        </div>

        {/* Zoekknop */}
        <form onSubmit={handleSearch}>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Zoeken..." : "Zoek"}
          </button>
        </form>

        {/* Chips (alleen als ze er echt zijn) */}
        {isContextMode && suggestedTerms && !isTermsEmpty(suggestedTerms) && (
          <div style={{ margin: "1rem 0", border: "1px solid #eee", padding: "1rem" }}>
            <h4>Zoeksuggesties (Gebruikt in Zoekactie)</h4>
            <p>Laatste Kleio Query: <strong>{lastSearchTerms}</strong></p>

            {(() => {
              const safe = normalizeTerms(suggestedTerms);
              const secties: Array<[string, string[]]> = [
                ["personen", safe.personen],
                ["gebeurtenissen", safe.gebeurtenissen],
                ["begrippen", safe.begrippen],
                ["jaartallen", safe.jaartallen],
              ];
              return secties.map(([label, lijst]) => (
                <div key={label} style={{ marginBottom: ".5rem" }}>
                  {lijst.length > 0 && (
                    <>
                      <strong>{label}:</strong>{" "}
                      {lijst.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleChipClick(term)}
                          style={{ margin: "2px", cursor: "pointer" }}
                        >
                          {term}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ));
            })()}
          </div>
        )}

        <hr />

        {/* Resultaten */}
        <h3>Zoekresultaten</h3>
        <div>
          {isLoading && <p>Laden...</p>}
          {!isLoading && searchResults.length === 0 && <p>Geen (nieuwe) resultaten…</p>}
          {searchResults.map((bron) => (
            <div key={bron.id} style={{ borderBottom: "1px solid #eee", padding: "4px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={isBronInBasket(bron)}
                  onChange={(e) => handleBronSelect(bron, e.target.checked)}
                  disabled={!isBronInBasket(bron) && selectedBronnen.length >= 6}
                />
                {" "}
                {bron.titel} ({bron.type})
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Rechter kolom — blijft ALTIJD staan */}
      <div style={{ flex: 1, border: "2px solid green", padding: "1rem" }}>
        <h3>Verzamelde bronnen</h3>
        <p>Geselecteerd: {selectedBronnen.length} (Min: {aantalBronnen}, Max: 6)</p>

        {selectedBronnen.length === 0 && <p>Nog geen bronnen geselecteerd…</p>}
        {lastSearchTerms && <p>Laatste zoekopdracht: <strong>{lastSearchTerms}</strong></p>}

        {selectedBronnen.map((bron) => (
          <div key={bron.id} style={{ borderBottom: "1px solid #ccc", padding: "4px" }}>
            <p>{bron.titel}</p>
            <button type="button" onClick={() => handleBronSelect(bron, false)}>Verwijder</button>
          </div>
        ))}

        <hr />
        <button type="button" onClick={() => alert(`Genereer met ${selectedBronnen.length} bronnen`)} disabled={!canGenerate}>
          Genereer {aantalBronnen} lesvoorstellen
        </button>
      </div>
    </div>
  );
}


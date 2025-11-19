// backend/services/a28.cito.cjs
// Cito CSV → interne hits
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const kaMap = require("../data/kaMap.cjs");

// ====== CSV KOLOMNAMEN (eventueel aanpassen aan jouw bestand) ======
const COL_ID          = "ID"; // (OAI GOK - pas aan indien nodig)
const COL_TV          = "METADATA_TV_HC";
const COL_KA          = "METADATA_KA";
const COL_INLEIDING   = "INLEIDING_BRON1"; // Aangepast naar jouw 6-koloms model
const COL_BRON        = "TEKSTBRON_OFURL"; // Aangepast
const COL_TOELICHTING = "TOELICHTING_BRON"; // Aangepast
const COL_AFBEELDING  = "AFBEELDING_URL"; // (OAI GOK - negeer als dit niet bestaat)
const COL_NIVEAU      = "NIVEAU";

// ====== CSV INLEZEN ======
const CITO_CSV_PATH =
  process.env.CITO_CSV_PATH ||
  path.join(__dirname, "..", "data", "cito_bronnen.csv");

let citoRows = [];

function loadCitoCsvOnce() {
  if (citoRows.length > 0) return citoRows;

  try {
    const file = fs.readFileSync(CITO_CSV_PATH, "utf8");
    const rows = parse(file, {
      columns: true, // Gebruikt de header-rij
      skip_empty_lines: true,
      trim: true,
      delimiter: ",", // Aangepast naar komma
    });

    CITO_ROWS = rows;
    console.log(
      `[a28.cito] Cito CSV succesvol geladen. ${rows.length} individuele bronnen beschikbaar.`
    );
  } catch (err) {
    console.error("[a28.cito] Fout bij laden Cito CSV:", err.message);
    CITO_ROWS = [];
  }
  return CITO_ROWS;
}

// Laad direct bij het starten van de server
loadCitoCsvOnce();

// ====== HELPERS VOOR FILTERS ======
function tvCodesToLabels(tvCodes) {
  const labels = [];
  tvCodes.forEach((code) => {
    const tvDef = kaMap[code];
    if (tvDef && tvDef.label) {
      const m = tvDef.label.match(/^([^(:]+)/);
      const label = m ? m[1].trim() : tvDef.label;
      labels.push(label);
      const nummer = code.replace(/[^\d]/g, "");
      if (nummer) labels.push(`Tijdvak ${nummer}`);
    }
  });
  return labels;
}

function rowMatchesTv(row, tvCodes) {
  if (!tvCodes || tvCodes.length === 0) return true;
  const labels = tvCodesToLabels(tvCodes);
  const value = (row[COL_TV] || "").toLowerCase();
  return labels.some((lab) => value.includes(lab.toLowerCase()));
}

function extractKaCodes(metaKaText) {
  const text = (metaKaText || "");
  const matches = text.match(/KA\s*(\d+)/gi) || [];
  return matches
    .map(m => {
      const num = m.match(/(\d+)/);
      return num ? parseInt(num[1], 10) : null;
    })
    .filter(n => Number.isInteger(n));
}

function rowMatchesKa(row, kaFilters = []) {
  if (!kaFilters.length) return true;
  const rowKaCodes = extractKaCodes(row[COL_KA]);
  if (!rowKaCodes.length) return false;
  return kaFilters.some(k => rowKaCodes.includes(Number(k)));
}

function rowMatchesQuery(row, query) {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase();
  const text =
    `${row[COL_INLEIDING]} ${row[COL_BRON]} ${row[COL_TOELICHTING]}`.toLowerCase();
  return text.includes(q);
}

// ====== PUBLIEKE FUNCTIE: zoeken in Cito ======
async function searchCito(options = {}) {
  const { tv = [], ka = [], query = "" } = options;
  const rows = CITO_ROWS; // Gebruik de geladen data
  if (!rows.length) return [];

  const results = rows
    .filter((row) => rowMatchesTv(row, tv))
    .filter((row) => rowMatchesKa(row, ka))
    .filter((row) => rowMatchesQuery(row, query));

  const hits = results.map((row, index) => {
    const bronTekst = row[COL_BRON] || "";
    const afbeeldingUrl = row[COL_AFBEELDING] || "";
    const isImageUrl = afbeeldingUrl.startsWith("http");

    return {
      id: `cito-${row[COL_ID] || index}`,
      title: row[COL_INLEIDING] || "Cito-bron",
      provider: "Cito",
      description: isImageUrl ? bronTekst : bronTekst, // Toon brontekst
      toelichting: row[COL_TOELICHTING] || "",
      url: isImageUrl ? afbeeldingUrl : null,
      thumbnail: isImageUrl ? afbeeldingUrl : null,
    };
  });

  return hits;
}

module.exports = {
  searchCito,
};

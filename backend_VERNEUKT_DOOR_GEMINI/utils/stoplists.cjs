// utils/stoplists.cjs
// Centrale stoplijsten + helpers om rommel te filteren uit Europeana-facets voor chips

// ---- Normalisatie ----
function normalizeLabel(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- Hard filters (exacte of regex matches) ----

// MIME-types en TYPE die we nooit als chip willen
const MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/tiff",
  "audio/mpeg", "video/mp4", "application/pdf", "application/xhtml+xml",
  "application/rtf", "application/dash+xml", "text/html",
  // TYPE’s
  "IMAGE", "TEXT", "SOUND", "VIDEO"
]);

// Rechten/licenties – niet als inhoudelijke chip tonen
const RIGHTS_PREFIXES = [
  "http://rightsstatements.org/vocab/",
  "http://creativecommons.org/licenses/",
  "http://creativecommons.org/publicdomain/",
  "https://rightsstatements.org/vocab/",
  "https://creativecommons.org/licenses/",
  "https://creativecommons.org/publicdomain/",
];

// Kleurcodes (#ABCDEF) en CSS-namen-achtig (ruis uit kleur-facets)
const COLOR_HEX = /^#?[0-9A-Fa-f]{6}$/;

// Landen/taalcodes die vaak “ruis” zijn als onderwerp
const GENERIC_COUNTRIES = new Set([
  "Germany","Austria","Netherlands","Hungary","Czech Republic","Estonia","Sweden",
  "Poland","United Kingdom","United States of America","Denmark","France","Romania",
  "Spain","Italy","Finland","Belgium","Israel","Europe","Norway","Lithuania","Greece",
  "Switzerland","Slovenia","Latvia","Bulgaria","Cyprus","Slovakia","Croatia","Ireland"
]);

const LANG_CODES = new Set([
  "de","mul","hu","en","nl","et","pl","sv","da","fr","cs","ro","it","es","fi","ca",
  "no","lt","el","sk","lv","bg","hr","sl"
]);

// Bekende aggregators/providers die we niet als inhoud willen tonen
const AGGREGATORS = new Set([
  "German Digital Library","Kulturpool","MUSEU","Forum Hungaricum Non-profit Ltd.",
  "OpenUp!","Manuscriptorium","The European Library",
  "Estonian e-Repository and Conservation of Collections",
  "Digital Libraries Federation","Swedish Open Cultural Heritage",
  "Dutch Collections for Europe","Europeana Sounds","Archives Portal Europe",
  "Rijksmuseum","LoCloud","Heritage of the People's Europe",
  "National Heritage Institute, Bucharest","Linked Heritage","Heidelberg University Library",
  "Hispana","National Library of Finland","Jewish Heritage Network",
  "DK-National Aggregation Service","International Association of Labour History Institutions",
  "CulturaItalia","CARARE","EUscreen","Arts and Culture Norway","Catalònica",
  "PHOTOCONSORTIUM","LT-Aggregator Service National Library of Lithuania",
  "ESbírky","European Library of Information and Culture","Greek Aggregator SearchCulture.gr",
  "Wellcome Collection","European Fashion Heritage Association","The European Film Gateway",
  "MuseuMap","Slovenian National E-content Aggregator","Europeana 1914-1918",
  "Ribambelle","Digital Library of Latvia","Diplomatic Documents of Switzerland, dodis.ch",
  "Europeana Local Austria","Memoriav","Public Library Pencho Slaveykov, Varna","Slovakiana",
]);

// Provider/instelling-ruis (grote algemene bibliotheken/musea – mag wél onder “institution”,
// maar niet als inhouds-chip in onderwerpen/personen/concepten)
const BIG_INSTITUTIONS = new Set([
  "Bavarian State Library","Austrian National Library","Berlin State Library",
  "Bodleian Libraries, University of Oxford","National Library of France",
  "Rijksmuseum","Germanisches National Museum","The Albertina Museum",
  "Heidelberg University Library","Naturalis Biodiversity Center"
]);

// Generieke onderwerp-termen (meertalig) die vaak ruis zijn
const GENERIC_SUBJECT_TOKENS = new Set([
  // portret/portrait in vele talen
  "portret","portrait","porträt","muotokuva","retratos","retrato","портрет","porträt einer historischen person",
  // materiaal/techniek
  "estampa","stampa","stampă","druckgrafik","malerei","grafik","plastic and sculpture","plastik und skulptur",
  "architectuur","architektur","stadt","topografie","architecture","topography",
  // super-generiek
  "history","geschiedenis","historisch","collection","sammlung","museum","library","archive"
]);

// Patterns voor spam/URL-achtige labels
const URL_LIKE = /^https?:\/\//i;

// Enkele heuristieken om jaren en jaartal-reeksen te herkennen
const PURE_YEAR = /^(1[4-9]\d{2}|20\d{2})$/;                           // 1400–2099
const YEAR_RANGE = /^(1[4-9]\d{2}|20\d{2})\s*[\-–—]\s*(1[4-9]\d{2}|20\d{2})$/;

// ---- Helpers ----

function startsWithAny(s, prefixes) {
  const t = String(s || "");
  return prefixes.some(p => t.startsWith(p));
}

function isGenericInstitution(label) {
  return AGGREGATORS.has(label) || BIG_INSTITUTIONS.has(label);
}

function isRightsLabel(label) {
  return startsWithAny(label, RIGHTS_PREFIXES);
}

function isColorNoise(label) {
  const t = label.trim();
  return COLOR_HEX.test(t);
}

function isUrlLike(label) {
  return URL_LIKE.test(label);
}

function isLangCode(label) {
  return LANG_CODES.has(label.toLowerCase());
}

function isCountryNoise(label) {
  return GENERIC_COUNTRIES.has(label);
}

function isMimeOrTypeNoise(label) {
  return MIME_TYPES.has(label);
}

function looksLikePureYear(label) {
  return PURE_YEAR.test(label.trim());
}

function looksLikeYearRange(label) {
  return YEAR_RANGE.test(label.replace(/\s+/g, " ").trim());
}

function isGenericSubject(label) {
  const low = normalizeLabel(label).toLowerCase();
  return GENERIC_SUBJECT_TOKENS.has(low);
}

/**
 * Hoofdfilter: beslist of een facet-label nooit als inhoudelijke chip mag gelden.
 * (Mag nog wel als aparte categorie “institution/format” afhankelijk van gebruik).
 */
function isHardNoise(label) {
  if (!label) return true;
  if (isUrlLike(label)) return true;
  if (isColorNoise(label)) return true;
  if (isRightsLabel(label)) return true;
  if (isMimeOrTypeNoise(label)) return true;
  if (isLangCode(label)) return true;
  return false;
}

/**
 * Zachtere filter: markeer als “waarschijnlijk generiek/ruis” (kan penalty krijgen).
 */
function isLikelyGeneric(label) {
  if (isCountryNoise(label)) return true;
  if (isGenericInstitution(label)) return true;
  if (isGenericSubject(label)) return true;
  return false;
}

module.exports = {
  normalizeLabel,
  // sets/arrays (handig voor externe checks of UI)
  MIME_TYPES,
  RIGHTS_PREFIXES,
  GENERIC_COUNTRIES,
  LANG_CODES,
  AGGREGATORS,
  BIG_INSTITUTIONS,
  GENERIC_SUBJECT_TOKENS,
  // tests
  isHardNoise,
  isLikelyGeneric,
  isGenericInstitution,
  isRightsLabel,
  isColorNoise,
  isUrlLike,
  isLangCode,
  isCountryNoise,
  isMimeOrTypeNoise,
  looksLikePureYear,
  looksLikeYearRange,
  isGenericSubject,
};


// services/a24.item.cjs
// --------------------------------------
// Mapper: rauwe Europeana-doc -> "Hit"
// We proberen hier o.a. PDF / tekstbronnen te herkennen.
// --------------------------------------

function firstString(value) {
  if (!value) return "";
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value);
}

function normalizeYear(doc) {
  const allDates = []
    .concat(doc.year || [])
    .concat(doc.dcDate || [])
    .concat(doc["dcterms:issued"] || [])
    .filter(Boolean)
    .map(String);

  if (!allDates.length) return null;

  // simpele heuristiek: zoek eerste 4-cijferig jaartal
  for (const d of allDates) {
    const m = d.match(/(1[0-9]{3}|20[0-9]{2})/);
    if (m) return m[1];
  }
  return null;
}

function detectKind(doc, mediaUrls, formatField) {
  const formatLower = (formatField || "").toLowerCase();

  const hasPdfFormat = formatLower.includes("pdf");
  const hasPdfUrl = mediaUrls.some(
    (u) => typeof u === "string" && u.toLowerCase().includes(".pdf")
  );

  if (hasPdfFormat || hasPdfUrl) return "pdf";

  const type =
    (doc.type || doc.edmType || "").toString().trim().toUpperCase();

  if (type === "IMAGE") return "image";
  if (type === "TEXT") return "scan-text";

  return "other";
}

function mapEuropeanaItem(doc) {
  if (!doc) return null;

  const id = firstString(doc.id || doc.guid);
  if (!id) return null;

  // Titelletjes zo goed mogelijk uit de data vissen
  const rawTitle =
    firstString(doc.title) ||
    firstString(doc.dcTitle) ||
    firstString(doc["dc:title"]);

  const altTitle =
    firstString(doc.description) ||
    firstString(doc["dcDescription"]) ||
    null;

  const title = rawTitle || null;

  const creator =
    firstString(doc.dcCreator) ||
    firstString(doc["dc:creator"]) ||
    null;

  const provider =
    firstString(doc.dataProvider) ||
    firstString(doc.provider) ||
    null;

  const thumbUrl =
    firstString(doc.edmPreview) ||
    firstString(doc.edmIsShownBy) ||
    null;

  const edmIsShownAt = firstString(doc.edmIsShownAt);
  const edmIsShownBy = firstString(doc.edmIsShownBy);

  const hasView = Array.isArray(doc.edmHasView) ? doc.edmHasView : [];
  const mediaUrls = [edmIsShownBy, ...hasView].filter(Boolean);

  // format-veld voor MIME-achtige hint
  const formatField = []
    .concat(doc.dcFormat || [])
    .concat(doc["dcterms:format"] || [])
    .join(" ");

  const kind = detectKind(doc, mediaUrls, formatField);

  // Handige "primary" URL om eventueel in de UI te gebruiken
  const primaryUrl =
    mediaUrls.find(
      (u) => typeof u === "string" && u.toLowerCase().includes(".pdf")
    ) ||
    edmIsShownAt ||
    edmIsShownBy ||
    mediaUrls[0] ||
    null;

  const year = normalizeYear(doc);

  return {
    id,
    title,        // kan null zijn
    altTitle,     // alternatieve titel / beschrijving
    creator,
    provider,
    year,
    thumbUrl, // Dit heet nu 'thumbUrl', niet 'edmIsShownBy'
    edmIsShownAt,
    edmIsShownBy,
    mediaUrls,
    kind,         // "pdf" | "scan-text" | "image" | "other"
    mimeHint: formatField || null,
    type: doc.type || doc.edmType || null,
    primaryUrl,
  };
}

module.exports = {
  mapEuropeanaItem,
};

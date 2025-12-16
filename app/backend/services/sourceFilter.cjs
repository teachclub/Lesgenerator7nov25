// services/sourceFilter.cjs
// Drop “lege” of “ruis/boilerplate” Kleio-bronnen voordat ze ooit naar proposals/Gemini/frontend gaan.
//
// Doel (dec 2025): noYear-ruis (scooters/congres/avatar/bever/Biesbosch + lesidee/meta) strakker wegdrukken,
// maar historische noYear-parels (Bonifatius/Germanen/kiesrecht/slavernij/Jacobs etc.) behouden.

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function normStr(x) {
  return typeof x === "string" ? x : "";
}

function stripHtml(s) {
  const t = normStr(s);
  if (!t) return "";
  return t
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function squashWs(s) {
  return normStr(s).replace(/\s+/g, " ").trim();
}

function getTextPayload(src) {
  if (!isObj(src)) return "";
  const fullText = normStr(src.fullText);
  const content = normStr(src.content);
  const description = normStr(src.description);

  const raw = [fullText, content, description].filter(Boolean).join("\n\n");
  return squashWs(stripHtml(raw));
}

function isKleioSource(src) {
  if (!isObj(src)) return false;
  const provider = normStr(src.provider).toLowerCase();
  const url = normStr(src.url).toLowerCase();
  const imageUrl = normStr(src.imageUrl).toLowerCase();
  const type = normStr(src.type).toLowerCase();

  if (provider.includes("kleio")) return true;
  if (url.includes("vgnkleio") || url.includes("kleio")) return true;
  if (imageUrl.includes("vgnkleio") || imageUrl.includes("kleio")) return true;
  if (type.includes("kleio")) return true;

  return false;
}

function hasImage(src) {
  if (!isObj(src)) return false;
  const u = squashWs(normStr(src.imageUrl));
  return !!u;
}

function isLikelyNoiseText(text) {
  const t = normStr(text);
  if (!t) return false;
  const lower = t.toLowerCase();

  if (
    lower.includes("ga naar de inhoud") ||
    lower.includes("terug naar overzicht") ||
    lower.includes("bbp-no-js") ||
    lower.includes("document.body.classname") ||
    lower.includes('"prefetch"') ||
    lower.includes("wp-content") ||
    lower.includes("wp-admin") ||
    lower.includes("tl-") ||
    lower.includes("advertentie")
  ) {
    return true;
  }

  const braceCount = (t.match(/[{}]/g) || []).length;
  if (t.length > 200 && braceCount >= 12) return true;

  return false;
}

const yrRe = /(?:1[0-9]{3}|20[0-2][0-9])/g;
function extractYears(text) {
  const m = squashWs(text).match(yrRe) || [];
  return m.map(Number).filter((y) => Number.isInteger(y) && y >= 800 && y <= 2000);
}

// Hard noYear-titelruis: dit zijn vrijwel altijd “modern/agenda/natuur/edtech/lesidee” resultaten die door tv-filter glippen
// doordat ze géén jaartal bevatten. Deze willen we ook weg, zelfs mét thumbnail.
function isHardNoYearTitleNoise(titleRaw) {
  const t = squashWs(titleRaw).toLowerCase();
  if (!t) return false;

  if (
    t.includes("scooter") ||
    t.includes("scooters") ||
    t.includes("congres") ||
    t.includes("multiperspectiviteit") ||
    t.includes("avatar") ||
    t.includes("bever") ||
    t.includes("biesbosch") ||
    t.includes("ontwikkelingen in de tijd") ||
    t.includes("drieluik") ||
    t.includes("genie of massamoordenaar")
  ) {
    return true;
  }

  return false;
}

// --- noYear score heuristiek ---
function noYearScore(title, text) {
  const t = (squashWs(title) + " " + squashWs(text)).toLowerCase();
  let score = 0;

  const good = [
    "bonifatius",
    "germanen",
    "middeleeuw",
    "kiesrecht",
    "vrouwenkiesrecht",
    "vrouwenemancipatie",
    "aletta",
    "jacobs",
    "marchant",
    "slavernij",
    "slaafgemaakten",
    "afschaffing",
    "zestiende eeuw",
    "zeventiende eeuw",
    "achttiende eeuw",
    "negentiende eeuw",
    "twintigste eeuw",
    "gouden eeuw",
    "eik",
  ];
  for (const w of good) {
    if (t.includes(w)) score += 2;
  }

  const bad = [
    "symposium",
    "workshop",
    "aanmelden",
    "inschrijven",
    "tickets",
    "programma",
    "locatie",
  ];
  for (const w of bad) {
    if (t.includes(w)) score -= 2;
  }

  return score;
}

// Conservatieve cleanup voor noYear-rommel:
// - Titel exact "Zoekwoorden" altijd weg
// - noYear + hard-title-noise -> weg (ook mét image)
// - noYear + geen image + heel korte inhoud -> weg
// - noYear + geen image + beperkte inhoud + slechte score -> weg
function isLowValueNoYear(src, text) {
  const titleRaw = squashWs(normStr(src.title));
  const title = titleRaw.toLowerCase();

  if (title === "zoekwoorden") return true;

  const years = extractYears([titleRaw, text].filter(Boolean).join(" "));
  const noYear = years.length === 0;
  if (!noYear) return false;

  if (isHardNoYearTitleNoise(titleRaw)) return true;

  if (hasImage(src)) return false;

  if (text.length > 0 && text.length < 160) return true;

  const score = noYearScore(titleRaw, text);
  if (text.length > 0 && text.length < 420 && score <= -2) return true;

  return false;
}

function filterSources(sources, opts = {}) {
  const minTextLen =
    Number.isFinite(Number(opts.minTextLen)) ? Number(opts.minTextLen) : 80;

  const out = [];
  let droppedKleioEmpty = 0;
  let droppedKleioNoise = 0;

  for (const s of Array.isArray(sources) ? sources : []) {
    if (!isObj(s)) continue;

    if (!isKleioSource(s)) {
      out.push(s);
      continue;
    }

    const text = getTextPayload(s);
    const okText = text.length >= minTextLen;
    const okImg = hasImage(s);
    const noise = isLikelyNoiseText(text);

    if (noise) {
      droppedKleioNoise++;
      continue;
    }

    if (isLowValueNoYear(s, text)) {
      droppedKleioNoise++;
      continue;
    }

    if (okText || okImg) {
      out.push(s);
    } else {
      droppedKleioEmpty++;
    }
  }

  return { sources: out, droppedKleioEmpty, droppedKleioNoise };
}

module.exports = {
  filterSources,
  isKleioSource,
  getTextPayload,
};


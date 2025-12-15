// services/sourceFilter.cjs
// Drop “lege” of “ruis/boilerplate” Kleio-bronnen voordat ze ooit naar proposals/Gemini/frontend gaan.

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


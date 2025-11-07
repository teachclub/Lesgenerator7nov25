// services/a21.intent.cjs
// Vrije tekst -> intent (who/what/where/YEAR/TYPE/COUNTRY/DATA_PROVIDER) -> Europeana params

const CITY_MAP = {
  amsterdam:"Amsterdam", leiden:"Leiden",
  london:"London", londen:"London",
  berlin:"Berlin", berlijn:"Berlijn",
  moscow:"Moscow", moskou:"Moscow",
  münchen:"München", munchen:"München"
};
const COUNTRY_MAP = {
  "united kingdom":"United Kingdom",
  "verenigd koninkrijk":"United Kingdom",
  "verenigd koninkrijk (vk)":"United Kingdom",
  "vk":"United Kingdom",
  "united states":"United States",
  "verenigde staten":"United States",
  "duitsland":"Germany",
  "germany":"Germany",
  "ussr":"Soviet Union",
  "sovjetunie":"Soviet Union",
  "soviet union":"Soviet Union"
};
const TYPE_MAP = {
  beeld:"IMAGE", afbeelding:"IMAGE", foto:"IMAGE", poster:"IMAGE", affiche:"IMAGE",
  tekst:"TEXT", wet:"TEXT", krant:"TEXT", pamflet:"TEXT", brochure:"TEXT", pamphlet:"TEXT"
};
// veel WOII-posters zitten bij deze aanbieders:
const PROVIDER_MAP = {
  "imperial war museum":"Imperial War Museums",
  "imperial war museums":"Imperial War Museums",
  "iwm":"Imperial War Museums",
  "british library":"The British Library",
  "national archives":"The National Archives",
  "manchester art gallery":"Manchester Art Gallery",
  "science museum":"Science Museum"
};

function norm(s=""){ return s.toLowerCase().trim(); }

function yearsFromText(t){
  const m1 = t.match(/(\d{3,4})\s*[–-]\s*(\d{2,4})/);
  if (m1){ let a=+m1[1], b=+m1[2]; if (b<100) b=(Math.floor(a/100)*100)+b; return {from:Math.min(a,b), to:Math.max(a,b)}; }
  const m2 = t.match(/rond\s+(\d{3,4})/i); if (m2){ const y=+m2[1]; return {from:y-5, to:y+5}; }
  const m3 = t.match(/vóór|voor\s+(\d{3,4})/i); if (m3){ const y=+m3[1]; return {from:y-10, to:y-1}; }
  const m4 = t.match(/na\s+(\d{3,4})/i); if (m4){ const y=+m4[1]; return {from:y+1, to:y+10}; }
  const m5 = t.match(/(\d{3,4})/); if (m5){ const y=+m5[1]; return {from:y, to:y}; }
  return null;
}
function detectTypes(t){
  const out = [];
  for (const [k,v] of Object.entries(TYPE_MAP)) if (t.includes(k)) out.push(v);
  if (t.includes("image+text") || t.includes("beeld+tekst")) out.push("IMAGE","TEXT");
  return [...new Set(out)];
}
function detectWhere(t){
  const out = [];
  for (const [k,v] of Object.entries(CITY_MAP)) if (t.includes(k)) out.push(v);
  return [...new Set(out)];
}
function detectCountry(t){
  const out = [];
  for (const [k,v] of Object.entries(COUNTRY_MAP)) if (t.includes(k)) out.push(v);
  return [...new Set(out)];
}
function detectProviders(t){
  const out = [];
  for (const [k,v] of Object.entries(PROVIDER_MAP)) if (t.includes(k)) out.push(v);
  return [...new Set(out)];
}
function detectNegatives(t){
  const negs = [];
  if (t.includes("geen reproductie")) negs.push("reproduction");
  if (t.includes("geen reproducties")) negs.push("reproduction");
  if (t.includes("geen webshop") || t.includes("geen poster shop")) negs.push("poster shop");
  return negs;
}
function detectWho(t){
  const who = [];
  if (t.includes("churchill")) who.push("Winston Churchill");
  if (t.includes("roosevelt") || t.includes("fdr")) who.push("Franklin D. Roosevelt","FDR");
  if (t.includes("stalin")) who.push("Joseph Stalin","Stalin");
  if (t.includes("hitler")) who.push("Adolf Hitler","Hitler");
  if (t.includes("goebbels")) who.push("Goebbels");
  if (t.includes("himmler")) who.push("Himmler");
  return [...new Set(who)];
}
function detectWhat(t){
  let what = [];
  if (t.includes("speech") || t.includes("toespraak") || t.includes("radio")) what.push("speech","address","radio broadcast");
  if (t.includes("ministry of information")) what.push("Ministry of Information","propaganda","poster","affiche");
  if (t.includes("battle of britain") || t.includes("raf")) what.push("Battle of Britain","RAF");
  if (t.includes("new deal")) what.push("New Deal","WPA","CCC","TVA","act","law","pamphlet");
  if (t.includes("nkvd")) what.push("NKVD");
  if (t.includes("show trial") || t.includes("showprocessen") || t.includes("processen")) what.push("show trial","purge","decree","newspaper");
  if (t.includes("propaganda")) what.push("propaganda","poster","affiche");
  if (t.includes("nsdap")) what.push("NSDAP","Nationalsozialistische Deutsche Arbeiterpartei");
  if (t.includes("sa")) what.push("SA");
  if (t.includes("ss")) what.push("SS");
  return [...new Set(what)];
}

function buildIntent(freeText, override = {}) {
  const t = norm(freeText);
  const intent = {
    anchor: freeText,
    who: override.who || detectWho(t),
    what: override.what || detectWhat(t),
    where: override.where || detectWhere(t),
    country: override.country || detectCountry(t),
    dataProvider: override.dataProvider || detectProviders(t),
    yearRange: override.yearRange || yearsFromText(freeText),
    type: override.type || detectTypes(t),
    reusability: t.includes("open") ? "open" : undefined,
    negatives: detectNegatives(t),
    priority: ["who","YEAR","country","where","TYPE","DATA_PROVIDER"],
    clarify: [],
    confidence: 0.6
  };

  if (!intent.yearRange) intent.clarify.push("Periode? Geef een jaar of bereik (bijv. 1939–1945).");
  if ((intent.type||[]).length===0) intent.clarify.push("Type? Beeld (IMAGE) of Tekst (TEXT) — of beide?");
  if ((intent.who||[]).length===0 && (intent.what||[]).length===0)
    intent.clarify.push("Tijdgenoten/actoren of kernbegrippen die zeker mee moeten? (bijv. Ministry of Information / RAF / WPA/CCC/TVA / NKVD)");

  let score = 0;
  if (intent.who.length) score+=0.18;
  if (intent.what.length) score+=0.18;
  if (intent.where.length || intent.country.length) score+=0.15;
  if (intent.yearRange) score+=0.25;
  if (intent.type.length) score+=0.18;
  if (intent.dataProvider.length) score+=0.06;
  if (!intent.clarify.length) score+=0.05;
  intent.confidence = Math.min(0.99, score);

  return intent;
}

function intentToEuropeanaParams(intent){
  const qf = [];
  (intent.who||[]).forEach(v=> qf.push(`who:"${v}"`));
  (intent.what||[]).forEach(v=> qf.push(`what:"${v}"`));
  (intent.where||[]).forEach(v=> qf.push(`where:"${v}"`));
  (intent.country||[]).forEach(v=> qf.push(`COUNTRY:"${v}"`));
  (intent.dataProvider||[]).forEach(v=> qf.push(`DATA_PROVIDER:"${v}"`));
  (intent.type||[]).forEach(v=> qf.push(`TYPE:${v}`));
  if (intent.yearRange) qf.push(`YEAR:[${intent.yearRange.from} TO ${intent.yearRange.to}]`);

  const qTerms = [];
  if (intent.who && intent.who[0]) qTerms.push(`"${intent.who[0]}"`);
  if (intent.what && intent.what[0]) qTerms.push(`"${intent.what[0]}"`);
  if (!qTerms.length && intent.dataProvider && intent.dataProvider[0]) qTerms.push(`"${intent.dataProvider[0]}"`);
  const query = qTerms.join(" OR ") || "*";

  const params = {
    query,
    qf,
    media: "true",
    profile: "rich",
    rows: 24
  };
  if (intent.reusability) params.reusability = intent.reusability;
  return params;
}

module.exports = { buildIntent, intentToEuropeanaParams };


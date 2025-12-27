"use strict";

const express = require("express");

console.log("[a16.questionGen] MODULE_LOAD ok");

let runGeminiAndParse = null;
let buildBasePreamble = null;
let MASTER_SIGNATURE = null;

try {
  ({ runGeminiAndParse } = require("../services/gemini.cjs"));
  console.log("[a16.questionGen] require services/gemini.cjs ok");
} catch (e) {
  console.log("[a16.questionGen] require services/gemini.cjs FAIL", e?.message || String(e));
}

try {
  ({ buildBasePreamble } = require("../prompts/lessonV2.base.cjs"));
  console.log("[a16.questionGen] require prompts/lessonV2.base.cjs ok");
} catch (e) {
  console.log("[a16.questionGen] require prompts/lessonV2.base.cjs FAIL", e?.message || String(e));
}

try {
  ({ MASTER_SIGNATURE } = require("../config/masterSignature.cjs"));
  console.log("[a16.questionGen] require config/masterSignature.cjs ok");
} catch (e) {
  console.log("[a16.questionGen] require config/masterSignature.cjs FAIL", e?.message || String(e));
}

function normalizeLevel(level) {
  const v = String(level || "").toLowerCase().trim();
  if (v === "mavo" || v === "vmbo") return "mavo";
  if (v === "vwo") return "vwo";
  return "havo";
}

function normalizeNuance(nuance) {
  const n = Number(nuance);
  if (!Number.isFinite(n)) return 3;
  if (n < 1) return 1;
  if (n > 5) return 5;
  return Math.round(n);
}

function normalizeVraagType(t) {
  const v = String(t || "").toLowerCase().trim();
  if (v === "vergelijkend") return "vergelijkend";
  if (v === "oorzaak-gevolg") return "oorzaak-gevolg";
  if (v === "continuiteit-verandering") return "continuiteit-verandering";
  if (v === "perspectief") return "perspectief";
  if (v === "standpunt") return "standpunt";
  return "verklarend";
}

const FORBIDDEN_PRESENT = [
  /\bmet de kennis van nu\b/i,
  /\bwij (vinden|kijken|denken) nu\b/i,
  /\bnu vs toen\b/i,
  /\btoen\b/i,
  /\bdestijds\b/i,
  /\bin die tijd\b/i,
  /\btegenwoordig\b/i,
  /\bachteraf\b/i,
  /\blater\b/i,
  /\buiteindelijk\b/i,
  /\bgezien wat er (later )?gebeurde\b/i,
  /\b(ondanks|terwijl).*\boorlogsmisdaden\b/i,
];

function violatesPresentRule(vraag) {
  const s = String(vraag || "");
  return FORBIDDEN_PRESENT.some((re) => re.test(s));
}

function extractBadHoofdvragen(arr) {
  const out = [];
  for (const hv of Array.isArray(arr) ? arr : []) {
    const v = hv && typeof hv.vraag === "string" ? hv.vraag : "";
    if (v && violatesPresentRule(v)) out.push(v);
  }
  return out;
}

function buildQuestionGenPrompt(input) {
  if (!buildBasePreamble || !MASTER_SIGNATURE) {
    throw new Error("A16 mist buildBasePreamble of MASTER_SIGNATURE (require faalde).");
  }

  const preamble = buildBasePreamble(MASTER_SIGNATURE);

  const vraagType = normalizeVraagType(input.vraagType);
  const richting = typeof input.richting === "string" ? input.richting.trim() : "";
  const presentisme = Boolean(input.presentisme);
  const level = normalizeLevel(input.level);
  const nuance = normalizeNuance(input.nuance);

  const tvArr = Array.isArray(input.tv) ? input.tv.map(String).filter(Boolean) : [];
  const tvLine = tvArr.length ? `Tijdvak(ken): TV${tvArr.join(", TV")}` : `Tijdvak(ken): (niet geselecteerd)`;

  const prikkelText = typeof input.prikkelText === "string" ? input.prikkelText.trim() : "";
  const prikkel = prikkelText ? `Prikkelende bron (fragment):\n${prikkelText}\n` : "";

  const presentRule = presentisme
    ? [
        "Presentisme-regel (streng):",
        "- De leerling heeft géén bewust taalgebruik over ‘nu vs toen’.",
        "- De hoofdvraag mag wél een verbaasde/afkeurende/ongelovige toon hebben, maar zonder het verschil te benoemen.",
        "- VERBODEN woorden/frames in de hoofdvraag: ‘toen’, ‘destijds’, ‘in die tijd’, ‘met de kennis van nu’, ‘wij vinden nu’, ‘tegenwoordig’, ‘later/uiteindelijk/achteraf’, en zinnen als ‘ondanks later bekende misdaden’ of ‘wat later gebeurde’.",
        "- Formuleer alsof een leerling het NU-beeld heeft (incl. afloop-kennis) maar dat NIET reflecteert; dus géén meta-bewustzijn.",
      ].join("\n")
    : "Presentisme-regel: Formuleer neutraal en verklarend, zonder oordeel/framing vanuit nu.";

  return [
    preamble,
    "",
    "TAAK: QUESTION-GEN (hoofdvraagchips + deelvragen). Volg de base/masterprompt-stijl en structuur.",
    "",
    `Soort vraag: ${vraagType}`,
    `Richting/idee (van docent): ${richting || "(leeg)"}`,
    presentRule,
    `Taalniveau: ${level}`,
    `Nuance/afwegen (1-5): ${nuance}`,
    tvLine,
    prikkel ? prikkel : "",
    "",
    "OUTPUT: Geef exact JSON (geen extra tekst) met dit schema:",
    `{
  "hoofdvraagSuggesties": [
    { "id": 1, "vraag": "..." },
    { "id": 2, "vraag": "..." },
    { "id": 3, "vraag": "..." }
  ],
  "deelvragen": [
    { "id": 1, "subdimensie": "politiek (macht/bestuur)", "vraag": "..." },
    { "id": 2, "subdimensie": "sociaal-economisch (geld/werk/groepen)", "vraag": "..." },
    { "id": 3, "subdimensie": "cultureel-mentaal (ideeën/propaganda/beelden)", "vraag": "..." },
    { "id": 4, "subdimensie": "individueel (keuzes/motieven/ervaringen)", "vraag": "..." }
  ]
}`,
    "",
    "REGELS:",
    "- 3 hoofdvragen: leerlingentaal, onderzoekbaar met bronnen, concreet genoeg om bronnen te koppelen.",
    "- 4 deelvragen: elk duidelijk in eigen subdimensie, geen overlap.",
    "- Hoofdvraag: GEEN verboden presentisme-woorden/frames (zie presentisme-regel).",
  ].join("\n");
}

function buildRepairPrompt(input, badQuestions) {
  if (!buildBasePreamble || !MASTER_SIGNATURE) {
    throw new Error("A16 mist buildBasePreamble of MASTER_SIGNATURE (require faalde).");
  }

  const preamble = buildBasePreamble(MASTER_SIGNATURE);

  const vraagType = normalizeVraagType(input.vraagType);
  const richting = typeof input.richting === "string" ? input.richting.trim() : "";
  const level = normalizeLevel(input.level);
  const nuance = normalizeNuance(input.nuance);

  const tvArr = Array.isArray(input.tv) ? input.tv.map(String).filter(Boolean) : [];
  const tvLine = tvArr.length ? `Tijdvak(ken): TV${tvArr.join(", TV")}` : `Tijdvak(ken): (niet geselecteerd)`;

  return [
    preamble,
    "",
    "TAAK: HERSTEL hoofdvraagchips.",
    "De volgende hoofdvragen overtreden de presentisme-regel (verboden woorden/frames).",
    "Herschrijf ze naar 3 nieuwe hoofdvragen die WEL voldoen.",
    "",
    "VERBODEN in hoofdvraag: toen/destijds/in die tijd/met de kennis van nu/wij vinden nu/tegenwoordig/later/achteraf/uiteindelijk/‘ondanks later bekende misdaden’ etc.",
    "Wel toegestaan: impliciete verbazing/afkeer in leerlingentaal ZONDER meta-bewustzijn.",
    "",
    `Soort vraag: ${vraagType}`,
    `Richting/idee (van docent): ${richting || "(leeg)"}`,
    `Taalniveau: ${level}`,
    `Nuance/afwegen (1-5): ${nuance}`,
    tvLine,
    "",
    "FOUTE hoofdvragen (niet herhalen, alleen herschrijven):",
    badQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
    "",
    "OUTPUT: exact JSON (geen extra tekst) met alleen dit schema:",
    `{
  "hoofdvraagSuggesties": [
    { "id": 1, "vraag": "..." },
    { "id": 2, "vraag": "..." },
    { "id": 3, "vraag": "..." }
  ]
}`,
  ].join("\n");
}

module.exports = function a16QuestionGenRouter() {
  const router = express.Router();

  console.log("[a16.questionGen] FACTORY ok (router gemaakt)");

  router.use((req, res, next) => {
    console.log("[a16.questionGen] HIT", req.method, req.url);
    next();
  });

  router.get("/question-gen/ping", (req, res) => {
    return res.json({ ok: true, route: "/api/question-gen/ping", ts: new Date().toISOString() });
  });

  router.post("/question-gen", async (req, res) => {
    const startedAt = Date.now();
    console.log("[a16.questionGen] BEGIN", new Date().toISOString(), "bodyKeys=", Object.keys(req.body || {}));

    try {
      if (!runGeminiAndParse) throw new Error("runGeminiAndParse ontbreekt (require services/gemini.cjs faalde).");

      const body = req.body || {};
      const prompt = buildQuestionGenPrompt(body);

      console.log("[a16.questionGen] BEFORE_GEMINI", "promptLen=", prompt.length);

      let json = await runGeminiAndParse({
        label: "A16/questionGen",
        meta: { route: "/api/question-gen" },
        prompt,
        timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 20000),
      });

      console.log("[a16.questionGen] AFTER_GEMINI", "keys=", Object.keys(json || {}));

      const bad = extractBadHoofdvragen(json.hoofdvraagSuggesties);

      if (Boolean(body.presentisme) && bad.length) {
        const repairPrompt = buildRepairPrompt(body, bad);

        console.log("[a16.questionGen] REPAIR_BEFORE_GEMINI", "badN=", bad.length);

        const repaired = await runGeminiAndParse({
          label: "A16/questionGen-repair",
          meta: { route: "/api/question-gen", repair: true },
          prompt: repairPrompt,
          timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 20000),
        });

        const repairedBad = extractBadHoofdvragen(repaired.hoofdvraagSuggesties);
        if (
          !repairedBad.length &&
          Array.isArray(repaired.hoofdvraagSuggesties) &&
          repaired.hoofdvraagSuggesties.length
        ) {
          json = { ...json, hoofdvraagSuggesties: repaired.hoofdvraagSuggesties };
        }
      }

      const ms = Date.now() - startedAt;

      console.log("[a16.questionGen] END", { ms });

      return res.json({
        ok: true,
        meta: { ms, model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite" },
        hoofdvraagSuggesties: Array.isArray(json.hoofdvraagSuggesties) ? json.hoofdvraagSuggesties : [],
        deelvragen: Array.isArray(json.deelvragen) ? json.deelvragen : [],
      });
    } catch (err) {
      console.error("[a16.questionGen] ERR", err);
      return res.status(500).json({
        ok: false,
        error: "question-gen faalde",
        message: err && err.message ? String(err.message) : "onbekende fout",
      });
    }
  });

  return router;
};


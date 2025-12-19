"use strict";

const express = require("express");
const { runGeminiAndParse } = require("../services/gemini.cjs");
const { buildBasePreamble } = require("../prompts/lessonV2.base.cjs");
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

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

  router.post("/question-gen", async (req, res) => {
    const startedAt = Date.now();
    try {
      const body = req.body || {};
      const prompt = buildQuestionGenPrompt(body);

      let json = await runGeminiAndParse({
        label: "A16/questionGen",
        meta: { route: "/api/question-gen" },
        prompt,
      });

      const bad = extractBadHoofdvragen(json.hoofdvraagSuggesties);

      if (Boolean(body.presentisme) && bad.length) {
        const repairPrompt = buildRepairPrompt(body, bad);
        const repaired = await runGeminiAndParse({
          label: "A16/questionGen-repair",
          meta: { route: "/api/question-gen", repair: true },
          prompt: repairPrompt,
        });

        const repairedBad = extractBadHoofdvragen(repaired.hoofdvraagSuggesties);
        if (!repairedBad.length && Array.isArray(repaired.hoofdvraagSuggesties) && repaired.hoofdvraagSuggesties.length) {
          json = { ...json, hoofdvraagSuggesties: repaired.hoofdvraagSuggesties };
        }
      }

      const ms = Date.now() - startedAt;

      return res.json({
        ok: true,
        meta: { ms, model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite" },
        hoofdvraagSuggesties: Array.isArray(json.hoofdvraagSuggesties) ? json.hoofdvraagSuggesties : [],
        deelvragen: Array.isArray(json.deelvragen) ? json.deelvragen : [],
      });
    } catch (err) {
      console.error("[a16.questionGen] FOUT", err);
      return res.status(500).json({
        ok: false,
        error: "question-gen faalde",
        message: err && err.message ? String(err.message) : "onbekende fout",
      });
    }
  });

  return router;
};


"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");
const { buildStep2Prompt } = require("../prompts/lessonV2.step2.cjs");
const { runGeminiAndParse } = require("../services/gemini.cjs");

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function normStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

function normType(t) {
  const s = normStr(t).toLowerCase();
  if (!s) return "text";
  if (s.includes("image")) return "image";
  if (s.includes("tekst") || s.includes("text")) return "text";
  return s;
}

function buildLabelFromSource(s, idx) {
  const title = normStr(s.title);
  if (title) return title;
  const provider = normStr(s.provider) || "Bron";
  const type = normType(s.type);
  return `${provider} (${type})`;
}

function defaultQuestionsForType(type) {
  const t = normType(type);
  if (t === "image") {
    return [
      { type: "observatie", vraag: "Wat zie je precies op deze afbeelding? Noem minimaal drie concrete details." },
      { type: "interpretatie", vraag: "Welke boodschap of bedoeling lijkt de maker met deze afbeelding over te brengen?" },
      { type: "koppeling", vraag: "Hoe helpt deze afbeelding om (een deel van) de hoofdvraag te beantwoorden? Leg uit." }
    ];
  }
  return [
    { type: "observatie", vraag: "Wat staat er letterlijk in de bron? Noem de belangrijkste uitspraak/boodschap." },
    { type: "interpretatie", vraag: "Wat betekent dit volgens jou in de context van die tijd? Wat wil de schrijver duidelijk maken?" },
    { type: "koppeling", vraag: "Hoe helpt deze bron om (een deel van) de hoofdvraag te beantwoorden? Leg uit." }
  ];
}

function coerceQuestionArray(vragen, sourceType) {
  const allowed = new Set(["observatie", "interpretatie", "koppeling", "betrouwbaarheid"]);
  const out = [];

  if (Array.isArray(vragen)) {
    for (const q of vragen) {
      if (!isObj(q)) continue;
      const type = normStr(q.type).toLowerCase();
      const vraag = normStr(q.vraag);
      if (!vraag) continue;
      out.push({
        type: allowed.has(type) ? type : "observatie",
        vraag
      });
      if (out.length >= 4) break;
    }
  }

  if (out.length < 3) {
    return defaultQuestionsForType(sourceType);
  }
  return out;
}

function normalizeStep2Output(parsed, lightSources) {
  const N = lightSources.length;

  const step2 = isObj(parsed) ? parsed : {};
  step2.step = "step2";

  if (!isObj(step2.data)) step2.data = {};
  if (!step2.data.chainSignature) step2.data.chainSignature = MASTER_SIGNATURE;

  if (!isObj(step2.data.leerling)) step2.data.leerling = {};
  const leerling = step2.data.leerling;

  if (Object.prototype.hasOwnProperty.call(leerling, "kwadrant")) {
    delete leerling.kwadrant;
  }

  if (!isObj(leerling.bronnenblad)) leerling.bronnenblad = {};
  if (!normStr(leerling.bronnenblad.instructie)) {
    leerling.bronnenblad.instructie =
      "In dit overzicht vind je alle bronnen die je gaat gebruiken. Let goed op het nummer van de bron, want dat nummer heb je nodig bij de verschillende opdrachten.";
  }

  const bronNummering = lightSources.map((s, idx) => ({
    nummer: idx + 1,
    id: s.bronId,
    label: buildLabelFromSource(s, idx + 1),
    provider: normStr(s.provider) || "",
    type: normType(s.type),
    url: null
  }));

  leerling.bronnenblad.bronNummering = bronNummering;

  const byNum = new Map();
  const rawBronvragen = Array.isArray(leerling.bronvragen) ? leerling.bronvragen : [];
  for (const item of rawBronvragen) {
    if (!isObj(item)) continue;
    const bn = Number(item.bronNummer);
    if (!Number.isInteger(bn) || bn < 1 || bn > N) continue;
    if (byNum.has(bn)) continue;

    const bronId = normStr(item.bronId) || lightSources[bn - 1].bronId;
    const vragen = coerceQuestionArray(item.vragen, lightSources[bn - 1].type);

    byNum.set(bn, {
      bronNummer: bn,
      bronId,
      vragen
    });
  }

  const fixedBronvragen = [];
  for (let i = 1; i <= N; i++) {
    if (byNum.has(i)) {
      const existing = byNum.get(i);
      existing.bronNummer = i;
      existing.bronId = lightSources[i - 1].bronId;
      existing.vragen = coerceQuestionArray(existing.vragen, lightSources[i - 1].type);
      fixedBronvragen.push(existing);
    } else {
      fixedBronvragen.push({
        bronNummer: i,
        bronId: lightSources[i - 1].bronId,
        vragen: defaultQuestionsForType(lightSources[i - 1].type)
      });
    }
  }

  leerling.bronvragen = fixedBronvragen;

  if (!isObj(leerling.startopdracht)) {
    leerling.startopdracht = {
      beschrijving:
        "Bekijk alle bronnen die je ter beschikking krijgt. Welke bron spreekt jou het meest aan en waarom? Welke vragen roept deze bron bij je op?",
      stappen: [
        "Doorloop alle bronnen in het bronnenblad.",
        "Kies één bron die je het meest interessant vindt.",
        "Noteer kort waarom je deze bron kiest.",
        "Schrijf minimaal twee vragen op die deze bron bij je oproept."
      ]
    };
  }

  if (!normStr(leerling.antiPresentismeIntro)) {
    leerling.antiPresentismeIntro =
      "Om deze periode goed te begrijpen, is het belangrijk om de mensen uit die tijd te zien zoals zij zichzelf zagen. Probeer daarom niet te oordelen met de kennis van nu, maar kijk vanuit hun perspectief. Bekijk en lees de bronnen eerst goed voordat je conclusies trekt.";
  }

  if (!isObj(leerling.samenwerkingstabel)) leerling.samenwerkingstabel = {};
  if (!Array.isArray(leerling.samenwerkingstabel.kolommen) || leerling.samenwerkingstabel.kolommen.length === 0) {
    leerling.samenwerkingstabel.kolommen = [
      "Bron",
      "Wie spreekt in de bron?",
      "Observatie",
      "Interpretatie",
      "Dimensie",
      "Subdimensie / soort verklaring"
    ];
  }
  leerling.samenwerkingstabel.rijen = lightSources.map((_, idx) => `Bron ${idx + 1}`);

  if (!isObj(leerling.samenwerkingstabel.meerkeuze)) leerling.samenwerkingstabel.meerkeuze = {};
  if (!Array.isArray(leerling.samenwerkingstabel.meerkeuze.wieSpreektOpties) || leerling.samenwerkingstabel.meerkeuze.wieSpreektOpties.length < 5) {
    leerling.samenwerkingstabel.meerkeuze.wieSpreektOpties = [
      "Politicus",
      "Religieus leider",
      "Diplomatiek informant",
      "Burger die getuige is",
      "Journalist/uitgever",
      "Koning(in)",
      "Propagandist",
      "Beeldmaker/tekenaar"
    ];
  }
  if (!Array.isArray(leerling.samenwerkingstabel.meerkeuze.dimensieOpties) || leerling.samenwerkingstabel.meerkeuze.dimensieOpties.length < 5) {
    leerling.samenwerkingstabel.meerkeuze.dimensieOpties = [
      "politiek-institutioneel",
      "sociaal-economisch",
      "cultureel-mentaal/ideologisch",
      "individueel/biografisch",
      "internationaal/militair"
    ];
  }
  if (!Array.isArray(leerling.samenwerkingstabel.meerkeuze.subdimensieOpties) || leerling.samenwerkingstabel.meerkeuze.subdimensieOpties.length < 5) {
    leerling.samenwerkingstabel.meerkeuze.subdimensieOpties = [
      "propaganda",
      "diplomatieke communicatie",
      "vorming van 'wij' en 'zij'-beelden",
      "leiderschap en bestuur",
      "angst en onzekerheid",
      "ideologische strijd",
      "verhoudingen tussen staten"
    ];
  }

  if (!isObj(leerling.reflectie)) leerling.reflectie = {};
  if (!normStr(leerling.reflectie.instructie)) {
    leerling.reflectie.instructie =
      "Denk na over de verschillende bronnen en hoe ze met elkaar samenhangen. Beantwoord de volgende vragen en gebruik hierbij minimaal twee bronnen per vraag.";
  }
  if (!Array.isArray(leerling.reflectie.vragen) || leerling.reflectie.vragen.length < 2) {
    leerling.reflectie.vragen = [
      "Kies twee bronnen die elkaar aanvullen. Leg uit wat je samen te weten komt over de hoofdvraag.",
      "Kies twee bronnen die (een beetje) botsen of een ander beeld geven. Hoe kan dat? Denk aan doel, maker en context.",
      "Welke dimensie vind jij het belangrijkst om de hoofdvraag te beantwoorden? Onderbouw met minimaal twee bronnen."
    ];
  }

  return step2;
}

function registerLessonV2Step2Routes(router) {
  router.post("/generate-lesson-v2/step2", async (req, res) => {
    try {
      const body = req.body || {};

      const conceptRaw = body.concept || {};
      if (!conceptRaw || typeof conceptRaw !== "object") {
        throw new Error("STEP2: ontbrekend of ongeldig 'concept' in body");
      }
      if (typeof conceptRaw.hoofdvraag !== "string" || !conceptRaw.hoofdvraag.trim()) {
        throw new Error("STEP2: 'concept.hoofdvraag' ontbreekt of is leeg");
      }

      let deelvragen = Array.isArray(body.deelvragen)
        ? body.deelvragen
        : Array.isArray(conceptRaw.deelvragen)
        ? conceptRaw.deelvragen
        : [];

      deelvragen = (Array.isArray(deelvragen) ? deelvragen : [])
        .map((v) => {
          if (typeof v === "string") return v.trim();
          if (v && typeof v === "object" && typeof v.vraag === "string") return v.vraag.trim();
          return "";
        })
        .filter(Boolean);

      if (!deelvragen.length) {
        throw new Error("STEP2: 'deelvragen' ontbreekt of is leeg");
      }

      const concept = { ...conceptRaw, deelvragen };

      const tvKa = body.tvKa || {};
      if (!tvKa || typeof tvKa !== "object") {
        throw new Error("STEP2: ontbrekend of ongeldig 'tvKa' in body");
      }

      const rawSources = Array.isArray(body.sources) ? body.sources : [];
      const MAX_SOURCES_STEP2 = 15;
      const cappedSources = rawSources.slice(0, MAX_SOURCES_STEP2);

      const lightSources = cappedSources.map((s, idx) => ({
        bronNummer: idx + 1,
        bronId: s.id,
        id: idx + 1,
        title: s.title || "",
        provider: s.provider || "",
        type: s.type || "",
        url: s.url || null
      }));

      const safeBody = {
        ...body,
        concept,
        tvKa,
        deelvragen,
        sources: lightSources,
        masterSignature: MASTER_SIGNATURE,
        step: "step2"
      };

      const prompt = buildStep2Prompt(safeBody);
      if (typeof prompt !== "string" || !prompt.trim()) {
        return res.status(500).json({
          step: "step2",
          error: "Interne fout: ongeldige prompt voor Gemini (step2)"
        });
      }

      const json = await runGeminiAndParse({
        prompt,
        label: "lessonV2_step2",
        meta: {
          masterSignature: MASTER_SIGNATURE,
          sourceCount: lightSources.length,
          tv: tvKa.tv,
          ka: tvKa.ka
        }
      });

      const normalized = normalizeStep2Output(json, lightSources);

      if (!normalized.data || !normalized.data.leerling) {
        return res.status(502).json({
          step: "step2",
          error: "Ongeldige output (na normalize): leerling ontbreekt"
        });
      }

      const leerling = normalized.data.leerling;
      const N = lightSources.length;

      if (!Array.isArray(leerling.bronnenblad?.bronNummering) || leerling.bronnenblad.bronNummering.length !== N) {
        return res.status(502).json({
          step: "step2",
          error: "Ongeldige output: bronnenblad.bronNummering moet exact N items hebben"
        });
      }

      if (!Array.isArray(leerling.bronvragen) || leerling.bronvragen.length !== N) {
        return res.status(502).json({
          step: "step2",
          error: "Ongeldige output: leerling.bronvragen moet exact N items hebben"
        });
      }

      return res.json(normalized);
    } catch (err) {
      console.error("[lessonV2_step2] ERROR", err?.message || err);
      return res.status(500).json({
        step: "step2",
        error: err?.message || "Interne fout in step2 route"
      });
    }
  });
}

module.exports = { registerLessonV2Step2Routes };


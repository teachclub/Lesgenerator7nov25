"use strict";

// routes/lessonV2.step4.cjs
// Step 4 = Step 2 + antwoorden (onder alle bronvragen) + ingevulde tabel + reflectie-antwoorden

const { runGeminiAndParse } = require("../services/gemini.cjs");
const { buildStep4Prompt } = require("../prompts/lessonV2.step4.cjs");
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function normStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

function toInt(x) {
  const n = Number(x);
  return Number.isInteger(n) ? n : null;
}

function pickStep2Leerling(body) {
  const s2 = body.step2 || null;
  if (!s2) return null;

  if (isObj(s2) && isObj(s2.data) && isObj(s2.data.leerling)) return s2.data.leerling;
  if (isObj(s2) && isObj(s2.leerling)) return s2.leerling;
  if (isObj(s2) && (s2.antiPresentismeIntro || s2.bronvragen || s2.bronnenblad)) return s2;

  return null;
}

function normalizeVragenArray(rawVragen) {
  const arr = Array.isArray(rawVragen) ? rawVragen : [];
  const out = [];

  for (const v of arr) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t) out.push({ type: "observatie", vraag: t });
      continue;
    }
    if (isObj(v)) {
      const vraag = normStr(v.vraag || v.question || v.text);
      if (!vraag) continue;
      const type = normStr(v.type).toLowerCase() || "observatie";
      out.push({ type, vraag });
    }
  }

  return out;
}

function flattenBronvragenContinuous(leerling) {
  const bronvragen = Array.isArray(leerling?.bronvragen) ? leerling.bronvragen : [];
  const sorted = [...bronvragen].filter(isObj).sort((a, b) => {
    const an = toInt(a.bronNummer ?? a.bronnummer ?? 0) || 0;
    const bn = toInt(b.bronNummer ?? b.bronnummer ?? 0) || 0;
    return an - bn;
  });

  let qn = 1;
  const perBron = [];
  const flat = [];

  for (const b of sorted) {
    const bronNummer = toInt(b.bronNummer ?? b.bronnummer ?? 0) || 0;
    const bronId = b.bronId ?? b.bronID ?? b.id ?? null;

    const vragenNorm = normalizeVragenArray(b.vragen || b.bronvragen || b.questions);
    const vragenWithN = vragenNorm.map((vv) => ({
      nummer: qn++,
      type: vv.type || "observatie",
      vraag: vv.vraag,
    }));

    perBron.push({
      bronNummer,
      bronId,
      vragen: vragenWithN,
    });

    for (const v of vragenWithN) {
      flat.push({
        nummer: v.nummer,
        bronNummer,
        bronId,
        type: v.type,
        vraag: v.vraag,
      });
    }
  }

  return { perBron, flat, total: qn - 1 };
}

function normalizeReflectieVragen(leerling) {
  const rv = leerling?.reflectie?.vragen;
  const arr = Array.isArray(rv) ? rv : Array.isArray(leerling?.reflectie) ? leerling.reflectie : [];
  const vragen = (Array.isArray(arr) ? arr : [])
    .map((x) => (typeof x === "string" ? x.trim() : normStr(x?.vraag || x?.text)))
    .filter(Boolean);

  return vragen;
}

function buildAnswerMap(jsonData) {
  const map = new Map();

  const groepen = Array.isArray(jsonData?.bronvragenAntwoorden)
    ? jsonData.bronvragenAntwoorden
    : Array.isArray(jsonData?.bronvragen)
    ? jsonData.bronvragen
    : [];

  for (const g of groepen) {
    if (!isObj(g)) continue;
    const antwoorden = Array.isArray(g.antwoorden) ? g.antwoorden : Array.isArray(g.answers) ? g.answers : [];
    for (const a of antwoorden) {
      if (!isObj(a)) continue;
      const n = toInt(a.nummer ?? a.n ?? a.no);
      const antwoord = normStr(a.antwoord || a.answer);
      if (n && antwoord) map.set(n, antwoord);
    }
  }

  return map;
}

function buildReflectieAnswerMap(jsonData) {
  const map = new Map();
  const arr = Array.isArray(jsonData?.reflectieAntwoorden)
    ? jsonData.reflectieAntwoorden
    : Array.isArray(jsonData?.reflectie?.antwoorden)
    ? jsonData.reflectie.antwoorden
    : [];

  for (const a of arr) {
    if (!isObj(a)) continue;
    const n = toInt(a.nummer ?? a.n ?? a.no);
    const antwoord = normStr(a.antwoord || a.answer);
    if (n && antwoord) map.set(n, antwoord);
  }

  return map;
}

function ensureSamenwerkingstabel(leerlingBase, jsonData, bronCount) {
  const cols =
    Array.isArray(leerlingBase?.samenwerkingstabel?.kolommen)
      ? leerlingBase.samenwerkingstabel.kolommen
      : ["Bron", "Wie spreekt", "Observatie", "Interpretatie", "Dimensie", "Subdimensie"];

  const rijenIn = Array.isArray(jsonData?.samenwerkingstabel?.rijen)
    ? jsonData.samenwerkingstabel.rijen
    : Array.isArray(jsonData?.samenwerkingstabel?.rows)
    ? jsonData.samenwerkingstabel.rows
    : [];

  const rijen = (Array.isArray(rijenIn) ? rijenIn : [])
    .filter(isObj)
    .map((r) => ({
      bron: normStr(r.bron) || "",
      wieSpreekt: normStr(r.wieSpreekt || r.spreker || r.whoSpeaks) || "",
      observatie: normStr(r.observatie || r.obs) || "",
      interpretatie: normStr(r.interpretatie || r.interp) || "",
      dimensie: normStr(r.dimensie || r.dimension) || "",
      subdimensie: normStr(r.subdimensie || r.subdimension) || "",
    }));

  const minRows = Math.max(0, Number.isInteger(bronCount) ? bronCount : 0);
  const filled = [...rijen];

  while (filled.length < minRows) {
    filled.push({
      bron: `Bron ${filled.length + 1}`,
      wieSpreekt: "",
      observatie: "",
      interpretatie: "",
      dimensie: "",
      subdimensie: "",
    });
  }

  return {
    kolommen: cols,
    rijen: filled,
  };
}

function registerLessonV2Step4Routes(router) {
  const handler = async (req, res) => {
    const body = req.body || {};
    const concept = body.concept || {};
    const sources = Array.isArray(body.sources) ? body.sources : [];

    if (!concept || typeof concept.hoofdvraag !== "string" || !concept.hoofdvraag.trim()) {
      return res.status(400).json({
        step: "step4",
        error: "MISSING_CONCEPT_HOOFDVRAAG",
        message: "Step4 verwacht concept.hoofdvraag.",
      });
    }

    if (!sources.length) {
      return res.status(400).json({
        step: "step4",
        error: "MISSING_SOURCES",
        message: "Step4 verwacht een niet-lege sources array.",
      });
    }

    const leerlingStep2 = pickStep2Leerling(body);
    if (!leerlingStep2) {
      return res.status(400).json({
        step: "step4",
        error: "MISSING_STEP2",
        message: "Step4 verwacht step2 (met data.leerling) in de body.",
      });
    }

    const { perBron, flat, total } = flattenBronvragenContinuous(leerlingStep2);
    if (!flat.length) {
      return res.status(400).json({
        step: "step4",
        error: "MISSING_STEP2_BRONVRAGEN",
        message: "Step4 kan niet draaien: step2.leerling.bronvragen ontbreekt/leeg.",
      });
    }

    const reflectieVragen = normalizeReflectieVragen(leerlingStep2);

    const expected = concept.masterSignature || MASTER_SIGNATURE;

    try {
      const prompt = buildStep4Prompt({
        ...body,
        concept,
        sources,
        step2: leerlingStep2,
        _step4Meta: { flatQuestions: flat, totalQuestions: total, reflectieVragen },
        masterSignature: expected,
      });

      const json = await runGeminiAndParse({
        prompt,
        label: "lessonV2_step4",
        meta: {
          hoofdvraag: concept.hoofdvraag,
          sourceCount: sources.length,
          questionCount: total,
          reflectieCount: reflectieVragen.length,
        },
      });

      const data = isObj(json?.data) ? json.data : isObj(json) ? json : null;
      if (!data) {
        return res.status(502).json({
          step: "step4",
          error: "STEP4_BAD_OUTPUT",
          message: "Step4: Gemini gaf geen bruikbare JSON-data terug.",
        });
      }

      const got = normStr(data.chainSignature);
      if (got && expected && got !== expected) {
        throw new Error(`STEP4_SIGNATURE_MISMATCH: expected "${expected}", got "${got}"`);
      }
      data.chainSignature = expected;

      const ansMap = buildAnswerMap(data);
      const refMap = buildReflectieAnswerMap(data);

      const bronCount = Array.isArray(leerlingStep2?.bronnenblad?.bronNummering)
        ? leerlingStep2.bronnenblad.bronNummering.length
        : perBron.length;

      const leerlingOut = {
        antiPresentismeIntro: leerlingStep2.antiPresentismeIntro || "",
        startopdracht: leerlingStep2.startopdracht || null,
        bronnenblad: leerlingStep2.bronnenblad || null,

        bronvragen: perBron.map((b) => ({
          bronNummer: b.bronNummer,
          bronId: b.bronId,
          qa: b.vragen.map((q) => ({
            nummer: q.nummer,
            vraag: q.vraag,
            antwoord: ansMap.get(q.nummer) || "Onvoldoende informatie in de gegeven bronnen om dit zeker te beantwoorden.",
          })),
        })),

        samenwerkingstabel: ensureSamenwerkingstabel(leerlingStep2, data, bronCount),

        reflectie: {
          instructie: normStr(leerlingStep2?.reflectie?.instructie) || "",
          vragen: reflectieVragen,
          antwoorden: reflectieVragen.map((v, i) => ({
            nummer: i + 1,
            vraag: v,
            antwoord:
              refMap.get(i + 1) ||
              "Onvoldoende informatie in de gegeven bronnen om dit goed te onderbouwen. Gebruik minimaal twee bronnen en leg uit wat je daaruit afleidt.",
          })),
        },
      };

      const out = {
        step: "step4",
        data: {
          chainSignature: expected,
          leerling: leerlingOut,
        },
      };

      return res.json(out);
    } catch (err) {
      console.error("[LesGo][step4] ERROR", err?.message || err);
      return res.status(500).json({
        step: "step4",
        error: "STEP4_FAILED",
        message: err?.message || String(err),
      });
    }
  };

  router.post("/generate-lesson-v2/step4", handler);
  router.post("/step4", handler);
}

module.exports = {
  registerLessonV2Step4Routes,
};


"use strict";

const { runGeminiAndParse } = require("../services/gemini.cjs");
const { buildStep1Prompt } = require("../prompts/lessonV2.step1.cjs");
const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function toIntArray(arr, maxN) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const v of arr) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1 && (!maxN || n <= maxN)) out.push(n);
  }
  return [...new Set(out)];
}

function parseMinutesStrict(t) {
  if (typeof t !== "string") return null;
  const s = t.trim();
  if (!s) return null;

  const range = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return null;

  const m = s.match(/(\d+)/);
  if (!m) return null;

  const n = Number(m[1]);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function normalizeStep1Result(raw, expectedSignature) {
  const wrap = (docentObj) => ({
    step: "step1",
    data: {
      chainSignature: expectedSignature,
      docent: docentObj || null,
    },
  });

  if (!isObj(raw)) return wrap(null);

  if (raw.step === "step1" && isObj(raw.data) && isObj(raw.data.docent)) {
    raw.data.chainSignature = raw.data.chainSignature || expectedSignature;
    return raw;
  }

  if (isObj(raw.docent)) return wrap(raw.docent);

  if (isObj(raw.data) && isObj(raw.data.docent)) {
    return {
      step: "step1",
      data: {
        chainSignature: raw.data.chainSignature || expectedSignature,
        docent: raw.data.docent,
      },
    };
  }

  const looksLikeDocent =
    typeof raw.wat === "string" ||
    typeof raw.hoe === "string" ||
    typeof raw.waarom === "string" ||
    Array.isArray(raw.deelvragen);

  if (looksLikeDocent) return wrap(raw);

  return wrap(null);
}

function forceLesfasen3(docent) {
  if (!isObj(docent)) return;
  const lf = Array.isArray(docent.lesfasen) ? docent.lesfasen : [];
  if (!lf.length) return;

  const fixTimes = (arr) => {
    const out = arr.map((x) => (isObj(x) ? { ...x } : {}));
    if (!out[0]) out[0] = {};
    if (!out[1]) out[1] = {};
    if (!out[2]) out[2] = {};

    out[0].fase = out[0].fase || "Instructie";
    out[1].fase = out[1].fase || "Verwerking";
    out[2].fase = out[2].fase || "Evaluatie/reflectie";

    out[0].tijd = "10 min";
    out[1].tijd = "30 min";
    out[2].tijd = "10 min";

    return out;
  };

  if (lf.length === 3) {
    docent.lesfasen = fixTimes(lf);
    return;
  }

  const first = isObj(lf[0]) ? { ...lf[0] } : {};
  const last = isObj(lf[lf.length - 1]) ? { ...lf[lf.length - 1] } : {};

  const midSlice = lf.slice(1, Math.max(1, lf.length - 1));
  const mids = midSlice.filter(isObj);

  const mergeField = (key) =>
    mids
      .map((m) => (typeof m[key] === "string" ? m[key].trim() : ""))
      .filter(Boolean)
      .join(" ");

  const middle = {
    fase: "Verwerking",
    tijd: "30 min",
    doel: mergeField("doel") || "",
    activiteit: mergeField("activiteit") || "",
    werkvorm: mergeField("werkvorm") || "",
  };

  first.fase = first.fase || "Instructie";
  last.fase = last.fase || "Evaluatie/reflectie";

  docent.lesfasen = fixTimes([first, middle, last]);
}

function synthesizeHoofdvraagAntwoord(docent, concept, sourcesLen) {
  if (!isObj(docent)) return;

  if (isObj(docent.hoofdvraagAntwoord)) return;

  const vraag =
    (concept && typeof concept.hoofdvraag === "string" && concept.hoofdvraag.trim()) ||
    "";

  const deelantwoorden = Array.isArray(docent.deelantwoorden) ? docent.deelantwoorden : [];
  const parts = [];
  const used = [];

  for (const da of deelantwoorden) {
    if (!isObj(da)) continue;
    if (typeof da.antwoord === "string" && da.antwoord.trim()) parts.push(da.antwoord.trim());
    used.push(...toIntArray(da.gebruikteBronNummers, sourcesLen));
  }

  const antwoordRaw = parts.join(" ").trim();
  const antwoord = antwoordRaw ? antwoordRaw.split(/\s+/).slice(0, 140).join(" ") : "";

  const bronNums = toIntArray(used, sourcesLen);

  if (vraag && antwoord && bronNums.length) {
    docent.hoofdvraagAntwoord = {
      vraag,
      antwoord,
      gebruikteBronNummers: bronNums,
    };
  }
}

function repairBronRefs(docent, concept, sourcesLen) {
  if (!isObj(docent)) return;

  const pickFallback = (i) => {
    if (!sourcesLen) return [];
    const n = Math.min(Math.max(1, i + 1), sourcesLen);
    return [n];
  };

  const dv = Array.isArray(docent.deelvragen) ? docent.deelvragen : [];
  const da = Array.isArray(docent.deelantwoorden) ? docent.deelantwoorden : [];
  const bv = Array.isArray(docent.bronverwijzingenPerDeelvraag)
    ? docent.bronverwijzingenPerDeelvraag
    : [];

  for (let i = 0; i < 4; i++) {
    const dai = isObj(da[i]) ? da[i] : null;
    const bvi = isObj(bv[i]) ? bv[i] : null;

    const fromDA = toIntArray(dai && dai.gebruikteBronNummers, sourcesLen);
    const fromBV = toIntArray(bvi && bvi.bronnen, sourcesLen);

    let nums = fromDA.length ? fromDA : fromBV.length ? fromBV : pickFallback(i);

    if (dai) dai.gebruikteBronNummers = nums;
    if (bvi) bvi.bronnen = nums;

    if (bvi && dv[i] && typeof dv[i] === "string") bvi.deelvraag = dv[i];
    if (dai && dv[i] && typeof dv[i] === "string") dai.vraag = dv[i];
  }

  if (isObj(docent.hoofdvraagAntwoord)) {
    const hvNums = toIntArray(docent.hoofdvraagAntwoord.gebruikteBronNummers, sourcesLen);
    if (!hvNums.length) {
      const used = [];
      for (let i = 0; i < 4; i++) {
        const dai = isObj(da[i]) ? da[i] : null;
        used.push(...toIntArray(dai && dai.gebruikteBronNummers, sourcesLen));
      }
      const merged = toIntArray(used, sourcesLen);
      docent.hoofdvraagAntwoord.gebruikteBronNummers = merged.length ? merged : pickFallback(0);
    }
  }
}

function validateStep1Strict(normalized, expectedSignature, sourcesLen) {
  const errs = [];
  const fail = (msg) => errs.push(msg);

  if (!isObj(normalized) || normalized.step !== "step1") fail("step != 'step1'");
  if (!isObj(normalized.data)) fail("data ontbreekt");
  if (!isObj(normalized.data?.docent)) fail("data.docent ontbreekt");

  const data = normalized.data || {};
  const docent = data.docent || {};

  if (data.chainSignature !== expectedSignature) {
    fail(
      `chainSignature mismatch: expected "${expectedSignature}", got "${String(
        data.chainSignature
      )}"`
    );
  }

  if (typeof docent.wat !== "string" || !docent.wat.trim()) fail("docent.wat ontbreekt/leeg");
  if (typeof docent.hoe !== "string" || !docent.hoe.trim()) fail("docent.hoe ontbreekt/leeg");
  if (typeof docent.waarom !== "string" || !docent.waarom.trim()) fail("docent.waarom ontbreekt/leeg");

  const deelvragen = Array.isArray(docent.deelvragen) ? docent.deelvragen : [];
  if (deelvragen.length !== 4) fail(`docent.deelvragen moet 4 items hebben (nu ${deelvragen.length})`);
  for (let i = 0; i < deelvragen.length; i++) {
    if (typeof deelvragen[i] !== "string" || !deelvragen[i].trim()) {
      fail(`docent.deelvragen[${i}] leeg/ongeldig`);
    }
  }

  const hv = docent.hoofdvraagAntwoord;
  if (!isObj(hv)) {
    fail("docent.hoofdvraagAntwoord ontbreekt");
  } else {
    if (typeof hv.vraag !== "string" || !hv.vraag.trim()) fail("hoofdvraagAntwoord.vraag ontbreekt/leeg");
    if (typeof hv.antwoord !== "string" || !hv.antwoord.trim()) fail("hoofdvraagAntwoord.antwoord ontbreekt/leeg");
    const nums = toIntArray(hv.gebruikteBronNummers, sourcesLen);
    if (nums.length < 1) fail("hoofdvraagAntwoord.gebruikteBronNummers moet >=1 geldige bron bevatten");
  }

  const deelantwoorden = Array.isArray(docent.deelantwoorden) ? docent.deelantwoorden : [];
  if (deelantwoorden.length !== 4) fail(`docent.deelantwoorden moet 4 items hebben (nu ${deelantwoorden.length})`);

  for (let i = 0; i < Math.min(4, deelantwoorden.length); i++) {
    const da = deelantwoorden[i];
    if (!isObj(da)) {
      fail(`deelantwoorden[${i}] ongeldig`);
      continue;
    }
    const v = typeof da.vraag === "string" ? da.vraag.trim() : "";
    const dv = typeof deelvragen[i] === "string" ? deelvragen[i].trim() : "";
    if (!v) fail(`deelantwoorden[${i}].vraag ontbreekt/leeg`);
    if (dv && v && v !== dv) fail(`deelantwoorden[${i}].vraag moet exact gelijk zijn aan deelvragen[${i}]`);
    if (typeof da.antwoord !== "string" || !da.antwoord.trim()) fail(`deelantwoorden[${i}].antwoord ontbreekt/leeg`);
    const nums = toIntArray(da.gebruikteBronNummers, sourcesLen);
    if (nums.length < 1) fail(`deelantwoorden[${i}].gebruikteBronNummers moet >=1 geldige bron bevatten`);
  }

  const bpdv = Array.isArray(docent.bronverwijzingenPerDeelvraag)
    ? docent.bronverwijzingenPerDeelvraag
    : [];
  if (bpdv.length !== 4) fail(`docent.bronverwijzingenPerDeelvraag moet 4 items hebben (nu ${bpdv.length})`);

  for (let i = 0; i < Math.min(4, bpdv.length); i++) {
    const item = bpdv[i];
    if (!isObj(item)) {
      fail(`bronverwijzingenPerDeelvraag[${i}] ongeldig`);
      continue;
    }
    const dv = typeof deelvragen[i] === "string" ? deelvragen[i].trim() : "";
    const v = typeof item.deelvraag === "string" ? item.deelvraag.trim() : "";
    if (!v) fail(`bronverwijzingenPerDeelvraag[${i}].deelvraag ontbreekt/leeg`);
    if (dv && v && v !== dv) fail(`bronverwijzingenPerDeelvraag[${i}].deelvraag moet exact gelijk zijn aan deelvragen[${i}]`);
    const nums = toIntArray(item.bronnen, sourcesLen);
    if (nums.length < 1) fail(`bronverwijzingenPerDeelvraag[${i}].bronnen moet >=1 geldige bron bevatten`);
  }

  const lesfasen = Array.isArray(docent.lesfasen) ? docent.lesfasen : [];
  if (lesfasen.length !== 3) {
    fail(`docent.lesfasen moet exact 3 items hebben (nu ${lesfasen.length})`);
  }

  let sum = 0;
  for (let i = 0; i < lesfasen.length; i++) {
    const lf = lesfasen[i];
    if (!isObj(lf)) {
      fail(`lesfasen[${i}] ongeldig`);
      continue;
    }
    const mins = parseMinutesStrict(lf.tijd);
    if (mins == null) {
      fail(`lesfasen[${i}].tijd moet 1 enkel getal minuten bevatten: "${String(lf.tijd)}"`);
      continue;
    }
    sum += mins;
  }

  if (lesfasen.length === 3 && sum !== 50) {
    fail(`totaal minuten lesfasen moet EXACT 50 zijn (nu ${sum})`);
  }

  if (errs.length) {
    const msg = "STEP1_INVALID_SHAPE: " + errs.join(" | ");
    const e = new Error(msg);
    e.code = "STEP1_INVALID_SHAPE";
    throw e;
  }
}

function registerLessonV2Step1Routes(router) {
  router.post("/generate-lesson-v2/step1", async (req, res) => {
    const body = req.body || {};
    const { concept = {}, sources = [] } = body;

    if (!concept || !concept.hoofdvraag) {
      return res.status(400).json({
        error: "MISSING_CONCEPT_HOOFDVRAAG",
        step: "step1",
        message: "Step 1 verwacht concept.hoofdvraag.",
      });
    }

    if (!Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        error: "MISSING_SOURCES",
        step: "step1",
        message: "Step 1 verwacht een niet-lege sources array.",
      });
    }

    try {
      const prompt = buildStep1Prompt(body);

      const rawJson = await runGeminiAndParse({
        prompt,
        label: "lessonV2_step1",
        meta: {
          hoofdvraag: concept.hoofdvraag,
          sourceCount: sources.length,
        },
      });

      const expected = concept.masterSignature || MASTER_SIGNATURE;
      const normalized = normalizeStep1Result(rawJson, expected);

      const got = normalized?.data?.chainSignature || null;
      if (got && expected && got !== expected) {
        throw new Error(`STEP1_SIGNATURE_MISMATCH: expected "${expected}", got "${got}"`);
      }

      const docent = normalized?.data?.docent || null;

      forceLesfasen3(docent);
      synthesizeHoofdvraagAntwoord(docent, concept, sources.length);
      repairBronRefs(docent, concept, sources.length);

      validateStep1Strict(normalized, expected, sources.length);

      return res.json(normalized);
    } catch (err) {
      console.error("[LesGo][step1] ERROR", err && err.message ? err.message : err);
      return res.status(500).json({
        error: "STEP1_FAILED",
        step: "step1",
        message: err && err.message ? err.message : String(err),
      });
    }
  });
}

module.exports = {
  registerLessonV2Step1Routes,
};


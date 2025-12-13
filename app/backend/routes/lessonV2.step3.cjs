"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

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

function buildLabel(s, idx) {
  const title = normStr(s?.title);
  if (title) return title;

  const desc = normStr(s?.description);
  if (desc) return desc;

  const provider = normStr(s?.provider) || "Bron";
  const type = normType(s?.type);
  return `${provider} (${type})`;
}

function resolveSignature(body) {
  const conceptSig = normStr(body?.concept?.masterSignature);
  const payloadSig = normStr(body?.masterSignature);
  return conceptSig || payloadSig || MASTER_SIGNATURE;
}

function normalizeSources(rawSources) {
  const arr = Array.isArray(rawSources) ? rawSources : [];
  const capped = arr.slice(0, 30);

  return capped.map((s, idx) => {
    const id = s?.id ?? s?.bronId ?? s?.sourceId ?? String(idx + 1);
    const provider = normStr(s?.provider);
    const type = normType(s?.type);
    const title = normStr(s?.title);
    const url = s?.url ? s.url : null;

    return {
      nummer: idx + 1,
      id,
      label: buildLabel(s, idx + 1),
      title: title || null,
      provider: provider || null,
      type,
      url,
    };
  });
}

function registerLessonV2Step3Routes(router) {
  router.post("/generate-lesson-v2/step3", async (req, res) => {
    try {
      const body = req.body || {};
      const sources = Array.isArray(body.sources) ? body.sources : [];

      if (!sources.length) {
        return res.status(400).json({
          step: "step3",
          error: "MISSING_SOURCES",
          message: "Step 3 verwacht een niet-lege sources array.",
        });
      }

      const chainSignature = resolveSignature(body);
      const bronnen = normalizeSources(sources);

      return res.json({
        step: "step3",
        data: {
          chainSignature,
          bronnenblad: {
            instructie:
              "Dit is het bronnenblad. Gebruik altijd het bronnummer (Bron 1, Bron 2, ...) wanneer je in opdrachten naar een bron verwijst.",
            bronnen,
          },
          meta: {
            bronCount: bronnen.length,
          },
        },
      });
    } catch (err) {
      console.error("[lessonV2_step3] ERROR", err?.message || err);
      return res.status(500).json({
        step: "step3",
        error: "STEP3_FAILED",
        message: err?.message || "Interne fout in step3 route",
      });
    }
  });
}

module.exports = { registerLessonV2Step3Routes };


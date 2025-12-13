"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function normStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

function normType(t) {
  const s = normStr(t).toLowerCase();
  if (!s) return "text";
  if (s.includes("image") || s.includes("afbeeld")) return "image";
  if (s.includes("tekst") || s.includes("text")) return "text";
  return s;
}

function pickText(s) {
  const fullText = normStr(s.fullText);
  if (fullText) return fullText;

  const content = normStr(s.content);
  if (content) return content;

  const desc = normStr(s.description);
  if (desc) return desc;

  return "";
}

function pickTitle(s) {
  const t = normStr(s.title);
  if (t) return t;

  const d = normStr(s.description);
  if (d) return d.length > 80 ? d.slice(0, 77) + "…" : d;

  return "";
}

function pickImageUrl(s) {
  const a = normStr(s.imageUrl);
  if (a) return a;

  const b = normStr(s.image);
  if (b) return b;

  const c = normStr(s.img);
  if (c) return c;

  return "";
}

function isKleioSource(s) {
  const provider = normStr(s.provider).toLowerCase();
  const url = normStr(s.url).toLowerCase();
  if (provider.includes("kleio")) return true;
  if (url.includes("vgnkleio")) return true;
  if (url.includes("kleio")) return true;
  return false;
}

function registerLessonV2Step3Routes(router) {
  router.post("/generate-lesson-v2/step3", async (req, res) => {
    try {
      const body = req.body || {};
      const concept = isObj(body.concept) ? body.concept : {};
      const sources = Array.isArray(body.sources) ? body.sources : [];

      if (!concept || typeof concept !== "object") {
        return res.status(400).json({
          step: "step3",
          error: "STEP3_MISSING_CONCEPT",
          message: "Step 3 verwacht concept in de body.",
        });
      }

      if (!Array.isArray(sources) || sources.length === 0) {
        return res.status(400).json({
          step: "step3",
          error: "STEP3_MISSING_SOURCES",
          message: "Step 3 verwacht een niet-lege sources array.",
        });
      }

      const chainSignature =
        (typeof concept.masterSignature === "string" && concept.masterSignature.trim()) ||
        MASTER_SIGNATURE;

      const bronNummering = sources.map((s, idx) => {
        const id = s?.id ?? idx + 1;
        const provider = normStr(s?.provider);
        const type = normType(s?.type);
        const title = pickTitle(s);
        const text = pickText(s);
        const url = normStr(s?.url) || null;
        const imageUrl = pickImageUrl(s) || null;

        return {
          nummer: idx + 1,
          id,
          titel: title,
          provider,
          type,
          tekst: text,
          url,
          imageUrl,
          isKleio: isKleioSource(s),
        };
      });

      return res.json({
        step: "step3",
        data: {
          chainSignature,
          bronnenblad: {
            instructie:
              "Gebruik dit bronnenblad als overzicht. Noteer bij opdrachten steeds het bronnnummer. Als het een Kleio-bron is, kun je via ‘Origineel (Kleio)’ de bron terugvinden.",
            bronNummering,
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


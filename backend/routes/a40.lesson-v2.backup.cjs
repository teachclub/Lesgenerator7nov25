// routes/a40.lesson-v2.cjs
// LesGo – lesgenerator v2 (step1..4 + render met Canvas-klaar Markdown)

const express = require('express');
const router = express.Router();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildSystemPrompt } = require('../prompts/lesgoPrompt.cjs');
const { buildLessonMarkdown } = require('../utils/formatLessonMarkdown.cjs');

/**
 * Kleine helper om eventuele ```json fences en rommel weg te halen
 * voordat we JSON.parse doen. (Extra veiligheid tegen eigenwijze modellen.)
 */
function cleanJson(text) {
  if (!text) return '';
  let clean = text.replace(/```json/gi, '').replace(/```/g, '');
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    clean = clean.substring(first, last + 1);
  }
  return clean.trim();
}

/**
 * Roept Gemini / LesGo aan voor één stap.
 * stepName: 'STEP1' | 'STEP2' | 'STEP3' | 'STEP4'
 * payload: object dat als "user"-JSON wordt meegegeven aan het model.
 */
async function callLesGoStep(stepName, payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName =
    process.env.GEMINI_MODEL_LESSON_V2 ||
    process.env.GEMINI_MODEL ||
    process.env.GEMINI_MODEL_CHIPS ||
    'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is niet gezet in de environment.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const systemPrompt = buildSystemPrompt(stepName);

  const result = await model.generateContent({
    contents: [
      {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'user',
        parts: [
          {
            text: JSON.stringify({
              step: stepName.toLowerCase(),
              ...payload,
            }),
          },
        ],
      },
    ],
  });

  const raw = result.response.text().trim();
  const cleaned = cleanJson(raw);

  let json;
  try {
    json = JSON.parse(cleaned);
  } catch (err) {
    console.error(`[LesGo] JSON parse error in ${stepName}:`, err.message);
    console.error('[LesGo] Raw model output:\n', raw);
    throw new Error(`LesGo ${stepName} gaf geen geldige JSON terug.`);
  }

  if (!json.validation) {
    json.validation = { status: 'ok', message: '' };
  }

  return json;
}

/**
 * Generieke helper om losse step-endpoints te maken.
 * We laten de frontend gewoon zelf bepalen wat er in req.body zit;
 * dat payload-object sturen we 1-op-1 door naar LesGo.
 */
function makeStepRoute(stepName, path) {
  router.post(path, async (req, res) => {
    console.log(`[LesGo] ▶ ${path} hit met keys:`, Object.keys(req.body || {}));
    try {
      const payload = req.body || {};
      const result = await callLesGoStep(stepName, payload);
      res.json(result);
    } catch (err) {
      console.error(`[LesGo] Fout in ${path}:`, err);
      res.status(500).json({
        error: `STEP_ERROR_${stepName}`,
        message: err.message || String(err),
      });
    }
  });
}

// ===== Losse stappen, paden blijven zoals je ze had =====
makeStepRoute('STEP1', '/generate-lesson-v2/step1');
makeStepRoute('STEP2', '/generate-lesson-v2/step2');
makeStepRoute('STEP3', '/generate-lesson-v2/step3');
makeStepRoute('STEP4', '/generate-lesson-v2/step4');

/**
 * Volledige les + Markdown in één call.
 *
 * Verwacht body:
 * {
 *   "concept": "string",
 *   "sources": [ ... ]   // met brontekst, imageUrl etc.
 * }
 */
router.post('/generate-lesson-v2/render', async (req, res) => {
  console.log('[LesGo] ▶ /generate-lesson-v2/render hit met keys:', Object.keys(req.body || {}));

  try {
    const { concept, sources } = req.body || {};

    if (!concept) {
      return res.status(400).json({ error: 'concept is verplicht' });
    }

    const safeSources = Array.isArray(sources) ? sources : [];

    // STEP1: docentenbasis (concept + evt. meta over bronnen)
    const step1 = await callLesGoStep('STEP1', {
      concept,
      sourcesMeta: safeSources.map((s, idx) => ({
        id: s.id || String(idx + 1),
        title: s.title || `Bron ${idx + 1}`,
      })),
    });

    // STEP2: leerlingentry (alleen concept)
    const step2 = await callLesGoStep('STEP2', {
      concept,
    });

    // STEP3: leerlingwerkblad (concept + bronnen + context van step2)
    const step3 = await callLesGoStep('STEP3', {
      concept,
      sources: safeSources,
      previous: {
        leerlingInleiding: step2.leerlingInleiding,
        hoofdvraag: step2.hoofdvraag,
        kernDimensies: step2.kernDimensies,
        subDimensies: step2.subDimensies,
        kwadrantAsLabels: step2.kwadrantAsLabels,
      },
    });

    // STEP4: antwoordmodel docent (concept + bronnen + eerdere stappen)
    const step4 = await callLesGoStep('STEP4', {
      concept,
      sources: safeSources,
      previous: {
        step2,
        step3,
      },
    });

    // Canvas-klaar Markdown-document bouwen (Docent + Leerling in één)
    const markdown = buildLessonMarkdown({
      concept,
      sources: safeSources,
      step1,
      step2,
      step3,
      step4,
    });

    res.json({
      markdown,
      step1,
      step2,
      step3,
      step4,
    });
  } catch (err) {
    console.error('[LesGo] Fout in /generate-lesson-v2/render:', err);
    res.status(500).json({
      error: 'RENDER_ERROR',
      message: err.message || String(err),
    });
  }
});

module.exports = router;


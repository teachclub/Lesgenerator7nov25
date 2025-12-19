"use strict";

// POST /api/lab/questions
// mode:
// - "explore" -> 3 hoofdvraag-voorstellen
// - "deelvragen" -> 4 deelvragen (4 subdimensies) op basis van gekozen hoofdvraag

const express = require("express");
const router = express.Router();

let runGeminiAndParse = null;
try {
  ({ runGeminiAndParse } = require("../services/gemini.cjs"));
} catch {
  runGeminiAndParse = null;
}

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function squashWs(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function clampInt(n, a, b, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(a, Math.min(b, Math.round(x)));
}

function jsonSafeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function stripFences(t) {
  const s = String(t || "").trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (m && m[1]) return m[1].trim();
  return s;
}

function buildPromptExplore({ input, antiPresentisme, level }) {
  return `
Je bent een ervaren docent geschiedenis in het voortgezet onderwijs in Nederland.

De docent beschrijft globaal waar zijn of haar gedachten naar uitgaan voor een les of lessenserie.

TAKEN:
1. Formuleer 3 verschillende mogelijke hoofdvragen.
2. Elke hoofdvraag:
   - is open en onderzoekend;
   - vermijdt presentisme;
   - nodigt uit tot historisch redeneren.
3. Gebruik geen bronnen.
4. Formuleer op niveau ${level} (1 = eenvoudig, 5 = complex).
5. Schrijf in correct Nederlands voor het VO.
6. ${antiPresentisme ? "Gebruik expliciet anti-presentistische formuleringen (wereld van toen, geen oordeel vanuit nu)." : "Vermijd presentisme waar mogelijk."}

Context docent:
"${squashWs(input)}"

Geef output als JSON (en niets anders):

{
  "hoofdvragen": [
    {
      "id": "hq1",
      "vraag": "...",
      "toelichting": "..."
    }
  ]
}
`.trim();
}

function buildPromptDeelvragen({ hoofdvraag, antiPresentisme, level }) {
  return `
Je bent een ervaren docent geschiedenis in het voortgezet onderwijs in Nederland.

Hoofdvraag:
"${squashWs(hoofdvraag)}"

Formuleer 4 deelvragen, elk vanuit een andere subdimensie:
- politiek-institutioneel
- sociaal-economisch
- cultureel-mentaal
- individueel

REGELS:
- Elke deelvraag helpt bij het beantwoorden van de hoofdvraag.
- ${antiPresentisme ? "Geen presentistische formuleringen; kijk vanuit de wereld van toen." : "Vermijd presentisme waar mogelijk."}
- Nog GEEN bronnen gebruiken.
- Niveau ${level}.
- Deelvragen moeten onderling duidelijk verschillen (perspectief/diversiteit).

Geef output als JSON (en niets anders):

{
  "deelvragen": [
    {
      "id": "dq1",
      "subdimensie": "politiek-institutioneel",
      "vraag": "..."
    }
  ]
}
`.trim();
}

async function runGeminiJson(prompt) {
  if (typeof runGeminiAndParse === "function") {
    // jouw helper doet al “model call + parse”
    // maar we blijven defensief als het toch tekst teruggeeft
    const out = await runGeminiAndParse(prompt, { expectJson: true }).catch(() => null);
    if (isObj(out)) return out;
    const maybe = jsonSafeParse(stripFences(out));
    if (isObj(maybe)) return maybe;
  }
  // Fallback: we kunnen niet bij je gemini helper -> nette fout
  const err = new Error("Gemini helper (runGeminiAndParse) niet beschikbaar in services/gemini.cjs");
  err.code = "NO_GEMINI_HELPER";
  throw err;
}

router.post("/lab/questions", async (req, res) => {
  try {
    const body = isObj(req.body) ? req.body : {};
    const mode = squashWs(body.mode || "explore") || "explore";
    const antiPresentisme = typeof body.antiPresentisme === "boolean" ? body.antiPresentisme : true;
    const level = clampInt(body.level, 1, 5, 3);

    if (mode === "explore") {
      const input = squashWs(body.input || "");
      if (!input) {
        return res.status(400).json({ ok: false, error: "input ontbreekt" });
      }
      const prompt = buildPromptExplore({ input, antiPresentisme, level });
      const j = await runGeminiJson(prompt);

      const hv = Array.isArray(j.hoofdvragen) ? j.hoofdvragen : [];
      const cleaned = hv
        .map((x, i) => ({
          id: squashWs(x?.id) || `hq${i + 1}`,
          vraag: squashWs(x?.vraag),
          toelichting: squashWs(x?.toelichting),
        }))
        .filter((x) => x.vraag);

      return res.json({
        ok: true,
        mode,
        antiPresentisme,
        level,
        hoofdvragen: cleaned.slice(0, 3),
      });
    }

    if (mode === "deelvragen") {
      const hoofdvraag = squashWs(body.hoofdvraag || "");
      if (!hoofdvraag) {
        return res.status(400).json({ ok: false, error: "hoofdvraag ontbreekt" });
      }
      const prompt = buildPromptDeelvragen({ hoofdvraag, antiPresentisme, level });
      const j = await runGeminiJson(prompt);

      const dv = Array.isArray(j.deelvragen) ? j.deelvragen : [];
      const cleaned = dv
        .map((x, i) => ({
          id: squashWs(x?.id) || `dq${i + 1}`,
          subdimensie: squashWs(x?.subdimensie),
          vraag: squashWs(x?.vraag),
        }))
        .filter((x) => x.vraag);

      return res.json({
        ok: true,
        mode,
        antiPresentisme,
        level,
        hoofdvraag,
        deelvragen: cleaned.slice(0, 6),
      });
    }

    return res.status(400).json({ ok: false, error: `onbekende mode: ${mode}` });
  } catch (e) {
    console.error("[lab/questions] error:", e && e.message ? e.message : e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

module.exports = router;


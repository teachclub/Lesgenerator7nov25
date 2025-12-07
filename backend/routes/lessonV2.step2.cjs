// backend/routes/lessonV2.step2.cjs
// STEP 2 – LEERLINGMATERIAAL (stub zonder Gemini, maar wél v6-structuur)
// Route: POST /api/generate-lesson-v2/step2

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

/**
 * Verwacht body:
 * {
 *   concept: {
 *     hoofdvraag: string,
 *     deelvragen: [
 *       { vraag, dimensie, subdimensie }
 *     ]
 *   },
 *   sources: [ { id, title, ... } ]
 * }
 *
 * Geeft terug (stub, maar in v6-structuur):
 * {
 *   "step": "step2",
 *   "data": {
 *     "chainSignature": "<MASTER_SIGNATURE>",
 *     "hoofdvraag": "...",
 *     "inleiding": "...",
 *     "bronvragen": [ { sourceId, vraag, deelvraagIndex, dimensie, subdimensie } ],
 *     "invultabel": { kolommen: [...], rijen: [...] },
 *     "reflectie": { vragen: [ { vraag, aandachtspuntVoorDocent } ] }
 *   }
 * }
 */

function registerLessonV2Step2Routes(router) {
  router.post("/generate-lesson-v2/step2", async (req, res) => {
    try {
      const body = req.body || {};
      const concept = body.concept || {};
      const sources = Array.isArray(body.sources) ? body.sources : [];

      const hoofdvraagRaw =
        typeof concept.hoofdvraag === "string" ? concept.hoofdvraag.trim() : "";

      const hoofdvraag =
        hoofdvraagRaw.length > 0
          ? hoofdvraagRaw
          : "Hoe dachten en handelden mensen in deze tijd volgens de bronnen?";

      const deelvragen = Array.isArray(concept.deelvragen)
        ? concept.deelvragen
        : [];

      // Gebruik de eerste deelvraag als default voor dimensie/subdimensie,
      // zodat de structuur klopt.
      const defaultDV = deelvragen[0] || {
        vraag: "",
        dimensie: "",
        subdimensie: "",
      };

      // Eenvoudige bronvragen: één vraag per bron, gekoppeld aan deelvraagIndex 0
      const bronvragen = sources.map((src, index) => ({
        sourceId: src.id ?? index + 1,
        vraag:
          "Wat laat deze bron zien over hoe mensen toen dachten of handelden?",
        deelvraagIndex: 0,
        dimensie: defaultDV.dimensie || "",
        subdimensie: defaultDV.subdimensie || "",
      }));

      const data = {
        chainSignature: MASTER_SIGNATURE,
        hoofdvraag,
        inleiding:
          "In deze les ga je met bronnen onderzoeken hoe mensen dachten en handelden in de tijd van deze gebeurtenis. Gebruik de bronnen om samen een antwoord te vinden op de hoofdvraag. Let goed op wat de bron vertelt over de tijd en de mensen van toen.",
        bronvragen,
        invultabel: {
          kolommen: [
            "Belangrijkste observaties",
            "Interpretatie",
            "Link met hoofdvraag",
          ],
          rijen: [
            {
              label: "Groep A",
              uitleg:
                "Werkt met de eerste bronnen (bijvoorbeeld 1–3) en vult de tabel in voor jullie bronnen.",
              deelvraagIndex: 0,
            },
            {
              label: "Groep B",
              uitleg:
                "Werkt met de volgende bronnen (bijvoorbeeld 4–6) en vult de tabel in voor jullie bronnen.",
              deelvraagIndex: 1,
            },
            {
              label: "Groep C",
              uitleg:
                "Werkt met de volgende bronnen (bijvoorbeeld 7–9) en vult de tabel in voor jullie bronnen.",
              deelvraagIndex: 2,
            },
            {
              label: "Groep D",
              uitleg:
                "Werkt met de volgende bronnen (bijvoorbeeld 10–12) en vult de tabel in voor jullie bronnen.",
              deelvraagIndex: 3,
            },
          ],
        },
        reflectie: {
          vragen: [
            {
              vraag:
                "Welke bron vond jij het meest belangrijk voor het beantwoorden van de hoofdvraag? Leg uit waarom.",
              aandachtspuntVoorDocent:
                "Laat leerlingen altijd terugverwijzen naar de hoofdvraag en een concrete bron noemen.",
            },
            {
              vraag:
                "Wat snap je nu beter over de tijd van deze bronnen dan voordat je met de les begon?",
              aandachtspuntVoorDocent:
                "Stimuleer dat leerlingen één concreet inzicht benoemen dat uit meerdere bronnen komt.",
            },
          ],
        },
      };

      return res.json({ step: "step2", data });
    } catch (err) {
      console.error("[lessonV2][step2] ERROR", err);
      return res.status(500).json({
        step: "step2",
        error: "Interne fout in step2 route",
      });
    }
  });
}

module.exports = { registerLessonV2Step2Routes };


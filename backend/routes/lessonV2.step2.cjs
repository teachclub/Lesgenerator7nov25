// backend/routes/lessonV2.step2.cjs
// Eenvoudige step2-route zonder Gemini, zodat de frontend geen 404 meer krijgt.

function registerLessonV2Step2Routes(router) {
  router.post("/step2", async (req, res) => {
    try {
      const body = req.body || {};
      const concept = body.concept || {};
      const sources = Array.isArray(body.sources) ? body.sources : [];

      const hoofdvraag =
        typeof concept.hoofdvraag === "string" && concept.hoofdvraag.trim().length > 0
          ? concept.hoofdvraag.trim()
          : "Hoe dachten en handelden mensen in deze tijd volgens de bronnen?";

      // Heel basic bronvragen: één vraag per bron
      const bronvragen = sources.map((src, index) => ({
        bronId: src.id ?? index + 1,
        vraag: "Wat laat deze bron zien over hoe mensen toen dachten of handelden?",
        dimensieHint: null,
      }));

      const data = {
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

      res.json({ step: "step2", data });
    } catch (err) {
      console.error("[lessonV2][step2] ERROR", err);
      res.status(500).json({
        step: "step2",
        error: "Interne fout in step2 route",
      });
    }
  });
}

module.exports = { registerLessonV2Step2Routes };


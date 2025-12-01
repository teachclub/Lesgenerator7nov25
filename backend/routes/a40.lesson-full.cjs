// routes/a40.lesson-full.cjs
// Dummy-implementatie voor een volledige les in hetzelfde formaat
// als de frontend verwacht (step1..step4).

const express = require('express');
const router = express.Router();

/**
 * Helper: veilige string
 */
function safe(s, fallback = "") {
  if (s === null || s === undefined) return fallback;
  return String(s);
}

/**
 * POST /api/generate-lesson-v2/full
 *
 * Verwacht in req.body:
 * {
 *   concept: { title, hook },
 *   sources: [ { id, title, ... } ],
 *   quadrantContext: { ... } (optioneel)
 * }
 *
 * Stuurt terug:
 * {
 *   concept,
 *   sources,
 *   quadrantContext,
 *   fullLesson: {
 *     step1, step2, step3, step4   // zoals de frontend FullLesson verwacht
 *   }
 * }
 */
router.post('/generate-lesson-v2/full', async (req, res) => {
  try {
    const { concept, sources = [], quadrantContext = null } = req.body || {};

    const title = safe(concept && concept.title, "Onbekend onderwerp");
    const hook = safe(concept && concept.hook, "");

    // ---------- STEP 1: Docenteninstructie + Lesplanning ----------
    const step1 = {
      docentenInstructie: {
        wat: `De leerlingen onderzoeken: ${title}. (DUMMY-les, backend versie)`,
        hoe:
          "Deze les is een dummy-voorbeeld zonder echte AI. De docent bespreekt de bronnen klassikaal " +
          "en laat leerlingen in groepjes de bronnen analyseren aan de hand van observatie- en interpretatievragen.",
        waarom:
          "Deze dummy-les is bedoeld om de technische keten tussen Lessie-frontend en backend te testen. " +
          "Als dit werkt, kunnen we later de echte Gemini-logica koppelen zonder dat de UI omvalt."
      },
      lesPlanning: {
        tabelMarkdown: [
          "| Fase | Duur | Activiteit |",
          "|------|------|-----------|",
          "| Start | 5 min | Introductie van het onderwerp en de verwonderingsvraag. |",
          "| Verkennen | 15 min | Leerlingen lezen de bronnen en noteren eerste observaties. |",
          "| Analyseren | 20 min | In groepjes beantwoorden leerlingen de bronvragen. |",
          "| Plenair | 15 min | Bespreking van antwoorden en koppeling aan de hoofdvraag. |",
          "| Reflectie | 10 min | Leerlingen vullen kwadrant en reflectieopdracht in. |"
        ].join("\n")
      }
    };

    // ---------- STEP 2: Hoofdvraag, inleiding, kwadrant-labels ----------
    const step2 = {
      hoofdvraag:
        hook && hook.trim().length > 0
          ? hook
          : `Welke spanningen en belangen spelen een rol bij het onderwerp "${title}"?`,
      leerlingInleiding: [
        `Je gaat in deze les werken met verschillende bronnen over "${title}".`,
        "",
        "Eerst ga je goed observeren wat je precies ziet of leest.",
        "Daarna ga je interpreteren: wat betekent dit? Wat zegt dit over de tijd waarin de bron is gemaakt?",
        "Tot slot koppel je jouw bevindingen aan de hoofdvraag van de les."
      ].join("\n"),
      kwadrantAsLabels: {
        X_links: "Dicht bij het dagelijks leven van mensen",
        X_rechts: "Ver van het dagelijks leven van mensen",
        Y_boven: "Grote historische veranderingen",
        Y_onder: "Kleine, geleidelijke veranderingen"
      }
    };

    // ---------- STEP 3: Bronvragen, samenwerkingstabel, kwadrant-leeg, reflectie ----------
    const bronVragen = sources.map((src, index) => {
      const bronNummer = index + 1;
      const bronTitel = safe(src && src.title, `Bron ${bronNummer}`);

      return {
        bronNummer,
        observeren: `Wat zie je / lees je precies in ${bronTitel}? Noem minimaal drie concrete elementen.`,
        interpreteren:
          `Wat probeert de maker met ${bronTitel} duidelijk te maken? ` +
          `Leg uit wat de bron zegt over de tijd en de betrokken personen of landen.`,
        hoofdvraagRelatie:
          `Hoe helpt ${bronTitel} jou om de hoofdvraag van de les beter te beantwoorden?`
      };
    });

    const samenwerkingTabelLeeg = [
      "| Groep | Bron(nen) | Belangrijkste observaties | Interpretatie | Link met hoofdvraag |",
      "|-------|-----------|---------------------------|--------------|----------------------|",
      "| A | ... | ... | ... | ... |",
      "| B | ... | ... | ... | ... |",
      "| C | ... | ... | ... | ... |"
    ].join("\n");

    const kwadrantLeeg = [
      "|                | Dicht bij dagelijks leven | Ver van dagelijks leven |",
      "|----------------|--------------------------|-------------------------|",
      "| Grote veranderingen | ... | ... |",
      "| Kleine veranderingen | ... | ... |"
    ].join("\n");

    const reflectieOpdracht = [
      "1. Wat vond je de meest verrassende bron en waarom?",
      "2. In welk vak van het kwadrant zou jij het onderwerp van deze les plaatsen? Licht je keuze toe.",
      "3. Wat zegt dit onderwerp volgens jou over de tijd waarin wij nu leven? Noem één overeenkomst en één verschil."
    ].join("\n");

    const step3 = {
      bronVragen,
      samenwerkingTabelLeeg,
      kwadrantLeeg,
      reflectieOpdracht
    };

    // ---------- STEP 4: Voorbeeldantwoorden (dummy) ----------
    const bronAntwoorden = sources.map((src, index) => {
      const bronNummer = index + 1;
      const bronTitel = safe(src && src.title, `Bron ${bronNummer}`);

      return {
        bronNummer,
        observerenAntwoord:
          `Leerlingen noemen concrete elementen uit ${bronTitel}, zoals personen, symbolen, jaartallen of citaten.`,
        interpreterenAntwoord:
          `Leerlingen leggen uit welke boodschap de maker met ${bronTitel} wil overbrengen en plaatsen dit in de context van de tijd.`,
        hoofdvraagRelatieAntwoord:
          `Leerlingen maken een duidelijke koppeling tussen ${bronTitel} en de hoofdvraag, bijvoorbeeld door een spanning of dilemma te benoemen.`
      };
    });

    const samenwerkingTabelIngevuld = [
      "| Groep | Bron(nen) | Belangrijkste observaties | Interpretatie | Link met hoofdvraag |",
      "|-------|-----------|---------------------------|--------------|----------------------|",
      "| A | 1–2 | Leerlingen zien de rol van grote mogendheden. | De bronnen laten spanningen en belangen zien. | Laat zien hoe het onderwerp past in de Koude Oorlog. |",
      "| B | 3–4 | Leerlingen zien protesten en reacties van burgers. | De samenleving reageert actief op beleid van machthebbers. | Verduidelijkt de impact op gewone mensen. |"
    ].join("\n");

    const kwadrantIngevuld = [
      "|                | Dicht bij dagelijks leven | Ver van dagelijks leven |",
      "|----------------|--------------------------|-------------------------|",
      "| Grote veranderingen | Voorbeelden van oorlog, revolutie of machtsblokken. | Ontwikkeling van nieuwe wapens, internationale verdragen. |",
      "| Kleine veranderingen | Veranderingen in mening of houding van mensen. | Langzame verschuiving van machtsverhoudingen. |"
    ].join("\n");

    const step4 = {
      samenwerkingTabelIngevuld,
      kwadrantIngevuld,
      bronAntwoorden
    };

    const fullLesson = { step1, step2, step3, step4 };

    return res.json({
      concept: concept || null,
      sources,
      quadrantContext,
      fullLesson
    });
  } catch (err) {
    console.error("[A40/full] Fout bij genereren volledige les:", err);
    return res
      .status(500)
      .json({ error: "Er ging iets mis bij het genereren van de volledige les." });
  }
});

module.exports = router;


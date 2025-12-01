const express = require('express');
const router = express.Router();

/**
 * DUMMY full-lesson endpoint
 *
 * - Gebruikt ALLEEN de bronnen die vanuit de frontend worden meegestuurd.
 * - Geen eigen Cito/Kleio-queries meer.
 * - Levert direct het FullLesson-object terug zoals LessonPage.tsx verwacht:
 *   { step1, step2, step3, step4 }
 */

router.post('/generate-lesson-v2/full', (req, res) => {
  try {
    console.log('[A40/full-DUMMY] ▶ POST /generate-lesson-v2/full hit');

    const body = req.body || {};

    const concept = body.concept || {};
    const sources = Array.isArray(body.sources) ? body.sources : [];

    const title = concept.title || 'Lesonderwerp';
    const hook =
      concept.hook ||
      'Hoe kan het dat mensen dit toen normaal vonden – en wij nu niet meer?';

    // STEP 1 – Docenteninstructie + lesplanning
    const step1 = {
      docentenInstructie: {
        wat: `De leerlingen onderzoeken: ${title}. (DUMMY-les, backend versie)`,
        hoe: 'Deze les is een dummy-voorbeeld zonder echte AI. De docent bespreekt de bronnen klassikaal en laat leerlingen in groepjes de bronnen analyseren aan de hand van observatie- en interpretatievragen.',
        waarom:
          'Deze dummy-les is bedoeld om de technische keten tussen Lessie-frontend en backend te testen. Als dit werkt, kunnen we later de echte Gemini-logica koppelen zonder dat de UI omvalt.',
      },
      lesPlanning: {
        tabelMarkdown: [
          '| Fase | Duur | Activiteit |',
          '|------|------|-----------|',
          '| Start | 5 min | Introductie van het onderwerp en de verwonderingsvraag. |',
          '| Verkennen | 15 min | Leerlingen lezen de bronnen en noteren eerste observaties. |',
          '| Analyseren | 20 min | In groepjes beantwoorden leerlingen de bronvragen. |',
          '| Plenair | 15 min | Bespreking van antwoorden en koppeling aan de hoofdvraag. |',
          '| Reflectie | 10 min | Leerlingen vullen kwadrant en reflectieopdracht in. |',
        ].join('\n'),
      },
    };

    // STEP 2 – Leerlinginleiding + hoofdvraag + kwadrant-assen
    const step2 = {
      hoofdvraag:
        'Hoezo deden ze zo geheimzinnig en dreigden ze elkaar constant met oorlog?',
      leerlingInleiding: [
        `Je gaat in deze les werken met verschillende bronnen over "${title}".`,
        '',
        'Eerst ga je goed observeren wat je precies ziet of leest.',
        'Daarna ga je interpreteren: wat betekent dit? Wat zegt dit over de tijd waarin de bron is gemaakt?',
        'Tot slot koppel je jouw bevindingen aan de hoofdvraag van de les.',
      ].join('\n'),
      kwadrantAsLabels: {
        X_links: 'Dicht bij het dagelijks leven van mensen',
        X_rechts: 'Ver van het dagelijks leven van mensen',
        Y_boven: 'Grote historische veranderingen',
        Y_onder: 'Kleine, geleidelijke veranderingen',
      },
    };

    // Helper om een nette label voor de bron in de vragen te hebben
    const labelForSource = (source, index) => {
      if (source && source.title) return source.title;
      return `bron ${index + 1}`;
    };

    // STEP 3 – Vragen per bron + lege tabellen + reflectie + BEGRIPPEN
    const bronVragen = sources.map((source, index) => {
      const bronNummer = index + 1;
      const label = labelForSource(source, index);

      return {
        bronNummer,
        observeren: `Wat zie je / lees je precies in ${label}? Noem minimaal drie concrete elementen.`,
        interpreteren: `Wat probeert de maker met ${label} duidelijk te maken? Leg uit wat de bron zegt over de tijd en de betrokken personen of landen.`,
        hoofdvraagRelatie: `Hoe helpt ${label} jou om de hoofdvraag van de les beter te beantwoorden?`,
      };
    });

    const samenwerkingTabelLeeg = [
      '| Groep | Bron(nen) | Belangrijkste observaties | Interpretatie | Link met hoofdvraag |',
      '|-------|-----------|---------------------------|--------------|----------------------|',
      '| A | ... | ... | ... | ... |',
      '| B | ... | ... | ... | ... |',
      '| C | ... | ... | ... | ... |',
    ].join('\n');

    const kwadrantLeeg = [
      '|                | Dicht bij dagelijks leven | Ver van dagelijks leven |',
      '|----------------|--------------------------|-------------------------|',
      '| Grote veranderingen | ... | ... |',
      '| Kleine veranderingen | ... | ... |',
    ].join('\n');

    const reflectieOpdracht = [
      '1. Wat vond je de meest verrassende bron en waarom?',
      '2. In welk vak van het kwadrant zou jij het onderwerp van deze les plaatsen? Licht je keuze toe.',
      '3. Wat zegt dit onderwerp volgens jou over de tijd waarin wij nu leven? Noem één overeenkomst en één verschil.',
    ].join('\n');

    // Nieuwe optionele "woordbanken" (begrippen) voor tabel & kwadrant
    const samenwerkingBegrippen = [
      'NAVO',
      'Warschaupact',
      'Cuba-crisis',
      'IJzeren Gordijn',
      'Kernwapenwedloop',
      'Propaganda',
      'Afschrikking',
      'Kernoorlog-angst',
    ];

    const kwadrantBegrippen = [
      'Grote verandering',
      'Kleine verandering',
      'Dicht bij dagelijks leven',
      'Ver van dagelijks leven',
      'Politiek besluit',
      'Maatschappelijke reactie',
    ];

    const step3 = {
      bronVragen,
      samenwerkingTabelLeeg,
      kwadrantLeeg,
      reflectieOpdracht,
      samenwerkingBegrippen,
      kwadrantBegrippen,
    };

    // STEP 4 – Voorbeeld-antwoorden + ingevulde tabellen
    const bronAntwoorden = sources.map((source, index) => {
      const bronNummer = index + 1;
      const label = labelForSource(source, index);

      return {
        bronNummer,
        observerenAntwoord: `Leerlingen benoemen concrete elementen uit ${label} (personen, jaartallen, symbolen, gebeurtenissen).`,
        interpreterenAntwoord:
          `Ze leggen uit wat ${label} duidelijk maakt over de Koude Oorlog, belangen van landen en de manier waarop angst/propaganda een rol speelt.`,
        hoofdvraagRelatieAntwoord:
          `Ze koppelen ${label} aan de hoofdvraag door uit te leggen hoe deze bron de spanning, dreiging of beleving van mensen in de Koude Oorlog laat zien.`,
      };
    });

    const samenwerkingTabelIngevuld = [
      '| Groep | Bron(nen) | Belangrijkste observaties | Interpretatie | Link met hoofdvraag |',
      '|-------|-----------|---------------------------|--------------|----------------------|',
      '| A | 1–2 | Leerlingen zien de rol van grootmachten en kernwapens. | De bronnen laten spanningen en belangen zien tussen blokken. | Laat zien hoe dreiging en machtspolitiek de Koude Oorlog vormgeven. |',
      '| B | 3–4 | Leerlingen zien protesten en reacties van burgers. | De samenleving reageert actief op beleid van machthebbers. | Verduidelijkt de impact op gewone mensen en hun angsten. |',
      '| C | 5–6 | Leerlingen zien beelden van muren, grenzen of acties. | De bron toont hoe het conflict het dagelijks leven binnendringt. | Maakt zichtbaar hoe ideologie en angst in het straatbeeld terechtkomen. |',
    ].join('\n');

    const kwadrantIngevuld = [
      '|                | Dicht bij dagelijks leven | Ver van dagelijks leven |',
      '|----------------|--------------------------|-------------------------|',
      '| Grote veranderingen | Val van de Berlijnse Muur, inzet kernwapens, internationale crises. | Wapenwedloop, strategische doctrine, diplomatieke topoverleggen. |',
      '| Kleine veranderingen | Veranderingen in mening of houding van mensen, protestbewegingen. | Langzame verschuiving van machtsverhoudingen tussen blokken. |',
    ].join('\n');

    const step4 = {
      samenwerkingTabelIngevuld,
      kwadrantIngevuld,
      bronAntwoorden,
    };

    return res.json({
      step1,
      step2,
      step3,
      step4,
    });
  } catch (err) {
    console.error('[A40/full-DUMMY] FOUT:', err);
    return res
      .status(500)
      .json({ error: 'Kon dummy full-lesson niet genereren.' });
  }
});

module.exports = router;


// routes/a40.lesson-full.cjs
// SUPER EENVOUDIGE DEBUG-STUB VOOR /api/generate-lesson-v2/full
// - GEEN Gemini
// - GEEN env-gedoe
// - GEEFT ALTIJD GELDIGE JSON TERUG

const express = require('express');
const router = express.Router();

router.post('/generate-lesson-v2/full', (req, res) => {
  try {
    const { concept = {}, sources = [] } = req.body || {};

    const title = concept.title || 'DEBUG-les (geen titel meegegeven)';
    const hook =
      concept.hook ||
      'DEBUG-verwonderingsvraag: waarom waren mensen zo bang / zo raar bezig?';

    console.log(
      '[A40/full DEBUG] full lesson request:',
      'titel =',
      title,
      '| hook =',
      hook,
      '| #bronnen =',
      Array.isArray(sources) ? sources.length : 0
    );

    const dummy = {
      step1: {
        docentenInstructie: {
          wat: `DEBUG-les op basis van concept: "${title}". Dit is een dummy-les om de keten proposals → lesson → backend → frontend te testen.`,
          hoe: 'Leerlingen lezen de gekozen bronnen, beantwoorden voorbeeldvragen en bespreken de hoofdvraag klassikaal.',
          waarom:
            'We testen alleen of de techniek werkt. Deze les is NIET inhoudelijk bedoeld, maar laat wel zien hoe de structuur eruitziet.',
        },
        lesPlanning: {
          tabelMarkdown:
            '| Fase | Tijd | Activiteit |\n' +
            '|---|---|---|\n' +
            '| 1 | 5 min | Uitleg dat dit een DEBUG-les is |\n' +
            '| 2 | 20 min | Leerlingen lezen de gekozen bronnen |\n' +
            '| 3 | 20 min | Leerlingen beantwoorden vragen per bron |\n' +
            '| 4 | 15 min | Klassengesprek over de verwonderingsvraag |\n' +
            '| 5 | 10 min | Reflectie & afronding |\n',
        },
      },
      step2: {
        hoofdvraag:
          hook ||
          'DEBUG-hoofdvraag: Waarom maakten mensen zich zo druk over dit onderwerp?',
        leerlingInleiding:
          'DIT IS EEN DEBUG-TEKST. Als je dit op de Lessie-lespagina ziet, dan werkt de hele keten: je koos een concept en bronnen, klikte op "Genereer volledige les", de frontend stuurde een POST naar /api/generate-lesson-v2/full, en de backend stuurde deze JSON terug. In een echte versie vult Gemini hier een echte historische inleiding in.',
        kwadrantAsLabels: {
          X_links: 'Meer dreiging',
          X_rechts: 'Minder dreiging',
          Y_boven: 'Meer confrontatie',
          Y_onder: 'Minder confrontatie',
        },
      },
      step3: {
        bronVragen: [
          {
            bronNummer: 1,
            observeren:
              'DEBUG: Wat zie/lees je letterlijk in Bron 1? Noem 2 concrete dingen.',
            interpreteren:
              'DEBUG: Wat denk je dat de maker met Bron 1 wil bereiken? (Bijv. overtuigen, waarschuwen, kritiek geven...)',
            hoofdvraagRelatie:
              'DEBUG: Hoe helpt Bron 1 om iets te zeggen over de (verwonderings)vraag?',
          },
        ],
        samenwerkingTabelLeeg:
          '| Bron | Wie spreekt/maakt? | Kerngevoel / Overtuiging | Gekozen Subdimensie | Twee Verklaringen (kort) |\n' +
          '|---|---|---|---|---|\n' +
          '| 1 |  |  |  |  |\n',
        kwadrantLeeg:
          '|  | Meer dreiging | Minder dreiging |\n' +
          '|---|---|---|\n' +
          '| Meer confrontatie |  |  |\n' +
          '| Minder confrontatie |  |  |\n',
        reflectieOpdracht:
          'DEBUG: Schrijf in 5–8 zinnen wat jou opvalt aan de spanning en emoties in de bronnen. Hoe zou jij reageren als je in die tijd had geleefd? Vergelijk dat met hoe jij nu tegen dit onderwerp aankijkt.',
      },
      step4: {
        samenwerkingTabelIngevuld:
          '| Bron | Wie spreekt/maakt? | Kerngevoel / Overtuiging | Gekozen Subdimensie | Twee Verklaringen (kort) |\n' +
          '|---|---|---|---|---|\n' +
          '| 1 | DEBUG | Angst / spanning | Meer dreiging | 1. Dummy-verklaring. 2. Nog een dummy-verklaring. |\n',
        kwadrantIngevuld:
          '|  | Meer dreiging | Minder dreiging |\n' +
          '|---|---|---|\n' +
          '| Meer confrontatie | Bron 1 (DEBUG) |  |\n' +
          '| Minder confrontatie |  |  |\n',
        bronAntwoorden: [
          {
            bronNummer: 1,
            observerenAntwoord:
              'DEBUG: voorbeeldobservatie bij Bron 1 (leerling noemt wat hij/zij letterlijk ziet/leest).',
            interpreterenAntwoord:
              'DEBUG: voorbeeldinterpretatie (wat wil de maker bereiken?).',
            hoofdvraagRelatieAntwoord:
              'DEBUG: voorbeeldlink tussen Bron 1 en de hoofdvraag.',
          },
        ],
      },
    };

    return res.json(dummy);
  } catch (err) {
    console.error('[A40/full DEBUG] onverwachte fout:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message || 'Onbekende fout in full-lesson DEBUG-route.',
    });
  }
});

module.exports = router;


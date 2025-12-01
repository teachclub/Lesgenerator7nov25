// routes/a35.proposals-v2.cjs
// -------------------------------------------
// LESVOORSTELLEN V2 (DUMMY-IMPLEMENTATIE)
// - Doel: stabiele, voorspelbare shape voor de frontend
// - Werkt met max 40 bronnen als context (allSources)
// - Per voorstel max 15 weloverwogen bronnen (subset via sourceIds)
// - LET OP: dit is nog geen echte Gemini-selectie, maar een
//   deterministische dummy op basis van meegegeven bronnen.
//
// Verwachte request-body (flexibel, geen harde verplichting):
// {
//   tv?: string | number,
//   ka?: string | number,
//   conceptHint?: string,
//   sources?: Source[]   // optioneel; als niet aanwezig, krijg je lege voorstellen
// }
//
// Response-shape:
//
// {
//   allSources: Source[];        // max 40
//   proposals: [
//     {
//       id: string;
//       concept: {
//         id: string;
//         title: string;
//         hook: string;
//         hoofdvraag: string;
//         tv?: string | number;
//         ka?: string | number;
//       };
//       sourceIds: string[];     // max 15, verwijzen naar allSources[*].id
//     },
//     ...
//   ],
//   meta: {
//     countAll: number;
//     countProposals: number;
//   }
// }
//
// Deze shape is bedoeld als stabiele basis. Later kan A35 intern
// Gemini aanroepen, maar de structuur naar de frontend blijft gelijk.

const express = require('express');

const router = express.Router();

/**
 * Helper: maak een nette string voor tijdvak/KA context.
 */
function buildContextLabel(tv, ka) {
  const tvPart = tv ? `Tijdvak ${tv}` : null;
  const kaPart = ka ? `KA${ka}` : null;

  if (tvPart && kaPart) return `${tvPart} – ${kaPart}`;
  if (tvPart) return tvPart;
  if (kaPart) return kaPart;
  return 'Geen specifieke TV/KA';
}

/**
 * Helper: bepaal een stabiel "id" voor een bron.
 * - Eerst source.id
 * - Anders source._id
 * - Anders index
 */
function ensureSourceIds(allSources) {
  return allSources.map((src, index) => {
    if (!src) return src;
    if (!src.id && !src._id) {
      return { ...src, id: String(index) };
    }
    // Zorg dat id altijd een string is
    const id = String(src.id || src._id);
    if (src.id !== id) {
      return { ...src, id };
    }
    return src;
  });
}

/**
 * Helper: kies unieke indices (maxCount) uit [0..length-1]
 * via een simpele Fisher–Yates shuffle.
 */
function pickUniqueIndices(maxCount, length) {
  if (!length || length <= 0) return [];
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  const limit = Math.min(maxCount, length);
  return indices.slice(0, limit);
}

/**
 * Bouw 3 dummy-lesvoorstellen op basis van allSources.
 * Dit is puur backend-logica; later kan Gemini hier "onder" gehangen worden.
 */
function buildDummyProposals(allSources, tv, ka, conceptHint) {
  const contextLabel = buildContextLabel(tv, ka);

  const baseTitles = [
    'Onderwerp – Concept 1',
    'Onderwerp – Concept 2',
    'Onderwerp – Concept 3',
  ];

  const baseHooks = [
    'Waarom vonden tijdgenoten dit zo vanzelfsprekend – en wij helemaal niet meer?',
    'Hoe kan het dat mensen dit toen normaal vonden?',
    'Wat zegt dit onderwerp over de angsten en hoop van mensen in die tijd?',
  ];

  const baseHoofdvraag = [
    'Hoe keken mensen in die tijd zelf naar dit onderwerp?',
    'Hoe kon dit onderwerp zo’n grote rol spelen in de geschiedenis?',
    'Wat leert dit onderwerp ons over macht, angst en verandering?',
  ];

  const proposals = [];

  for (let i = 0; i < 3; i++) {
    const proposalId = `p${i + 1}`;

    const title =
      conceptHint && typeof conceptHint === 'string' && conceptHint.trim().length > 0
        ? `${conceptHint} – voorstel ${i + 1}`
        : baseTitles[i];

    const hook = baseHooks[i];
    const hoofdvraag = baseHoofdvraag[i];

    // Kies per voorstel max 15 bronnen uit allSources
    const indices = pickUniqueIndices(15, allSources.length);
    const sourceIds = indices.map((idx) => {
      const src = allSources[idx];
      if (!src) return null;
      return String(src.id || src._id || idx);
    }).filter(Boolean);

    proposals.push({
      id: proposalId,
      concept: {
        id: proposalId,
        title,
        hook,
        hoofdvraag,
        tv: tv ?? null,
        ka: ka ?? null,
        contextLabel,
      },
      sourceIds,
    });
  }

  return proposals;
}

/**
 * Hoofdhandler voor lesvoorstellen (V2).
 * Probeert zo defensief mogelijk te zijn: geen harde aannames over de body.
 */
function handleProposals(req, res) {
  try {
    const body = req.body || {};
    const tv = body.tv ?? body.tijdvak ?? null;
    const ka = body.ka ?? body.kenmerkendAspect ?? null;
    const conceptHint = body.conceptHint || (body.concept && body.concept.title) || '';

    // Bronnen uit de request-body (optioneel).
    // Idee: de frontend kan hier de 40 contextbronnen instoppen.
    let incomingSources = Array.isArray(body.sources) ? body.sources : [];
    // Max 40 contextbronnen
    let allSources = incomingSources.slice(0, 40);
    allSources = ensureSourceIds(allSources);

    if (!allSources.length) {
      console.warn('[A35] ⚠️ Geen bronnen meegegeven in request-body voor proposals-v2.');
    }

    const proposals = buildDummyProposals(allSources, tv, ka, conceptHint);

    console.log(
      `[A35/DEBUG v2] propose-lessons-v2: tv=${tv ?? 'null'} ka=${ka ?? 'null'} #all=${allSources.length} #proposals=${proposals.length}`
    );

    return res.json({
      allSources,
      proposals,
      meta: {
        countAll: allSources.length,
        countProposals: proposals.length,
      },
    });
  } catch (err) {
    console.error('[A35] Fout in proposals-v2 handler:', err);
    return res.status(500).json({
      error: 'Er ging iets mis bij het genereren van lesvoorstellen (v2).',
    });
  }
}

// We weten niet exact welk pad de frontend nu gebruikt,
// dus we ondersteunen meerdere varianten om backwards compatible te zijn.
router.post('/generate-lesson-v2/proposals', handleProposals);
router.post('/propose-lessons-v2', handleProposals);
router.post('/proposals-v2', handleProposals);

// Voor debug / snelle tests ook een GET varianten (zonder body).
router.get('/generate-lesson-v2/proposals', handleProposals);
router.get('/propose-lessons-v2', handleProposals);
router.get('/proposals-v2', handleProposals);

module.exports = router;


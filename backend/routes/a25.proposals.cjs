// routes/a25.proposals.cjs
// -------------------------------------------
// LESVOORSTELLEN (DUMMY, ZONDER GEMINI)
// - oude route-pad blijft behouden: POST /api/propose-lessons
// - geen afhankelijkheid meer van GOOGLE_API_KEY (API is nu toch verlopen)
// - nieuwe response-shape:
//   {
//     allSources: Source[],           // max 40
//     proposals: LessonProposal[],    // 3 voorstellen, elk met max 15 sourceIds
//     meta: { countAll, countProposals }
//   }
//
// BACKWARDS COMPATIBLE INPUT:
// - oude frontend stuurde: { selectedSources, query }
// - nieuwe variant kan sturen: { sources, tv, ka, conceptHint }
//
// Wij ondersteunen beide vormen:
//   - allSources = selectedSources || sources || []
//   - conceptHint = conceptHint || query || (concept?.title)

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
 * Helper: zorg dat elke bron een string-id krijgt.
 * - Eerst source.id
 * - Anders source._id
 * - Anders index
 */
function ensureSourceIds(allSources) {
  return allSources.map((src, index) => {
    if (!src) return src;
    const id = String(src.id || src._id || index);
    return { ...src, id };
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
 * - max 15 bronnen per voorstel (via sourceIds)
 * - later kan hier een echte Gemini-call “onder” gehangen worden,
 *   zonder dat de frontend-structuur wijzigt.
 */
function buildDummyProposals(allSources, tv, ka, conceptHint, query) {
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
  const hint = (conceptHint && String(conceptHint).trim()) ||
               (query && String(query).trim()) ||
               '';

  for (let i = 0; i < 3; i++) {
    const proposalId = `p${i + 1}`;

    const title = hint
      ? `${hint} – voorstel ${i + 1}`
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
        targetAudience: 'Havo/Vwo Bovenbouw',
      },
      sourceIds,
    });
  }

  return proposals;
}

/**
 * HOOFDFUNCTIE: propose-lessons
 * Oude pad: POST /api/propose-lessons
 * - ondersteunt zowel oude body ({ selectedSources, query })
 *   als nieuwe body ({ sources, tv, ka, conceptHint })
 */
router.post('/propose-lessons', (req, res) => {
  try {
    const body = req.body || {};

    // Oud: { selectedSources, query }
    const selectedSources = Array.isArray(body.selectedSources)
      ? body.selectedSources
      : [];

    // Nieuw: { sources }
    const sources = Array.isArray(body.sources)
      ? body.sources
      : [];

    // Houd beide vormen in ere, voorkom dubbele logica.
    let allSources = selectedSources.length > 0 ? selectedSources : sources;
    // Max 40 contextbronnen
    allSources = (allSources || []).slice(0, 40);
    allSources = ensureSourceIds(allSources);

    const tv = body.tv ?? body.tijdvak ?? null;
    const ka = body.ka ?? body.kenmerkendAspect ?? null;
    const conceptHint =
      body.conceptHint ||
      (body.concept && body.concept.title) ||
      '';
    const query = body.query || '';

    if (!allSources.length) {
      console.warn('[A25] ⚠️ /propose-lessons: geen bronnen in request-body (selectedSources/sources leeg).');
    }

    const proposals = buildDummyProposals(
      allSources,
      tv,
      ka,
      conceptHint,
      query
    );

    console.log(
      `[A25/DEBUG] propose-lessons: tv=${tv ?? 'null'} ka=${ka ?? 'null'} query="${query}" #all=${allSources.length} #proposals=${proposals.length}`
    );

    return res.json({
      allSources,
      proposals,
      meta: {
        countAll: allSources.length,
        countProposals: proposals.length,
        inputShape: {
          selectedSources: selectedSources.length,
          sources: sources.length,
        },
      },
    });
  } catch (error) {
    console.error('[A25] Fout in /propose-lessons:', error);
    return res.status(500).json({
      error: 'Kon geen lesvoorstellen genereren (dummy A25).',
    });
  }
});

module.exports = router;


# Lessie2000 — Living Map (QL03 + Context_A + Matching)

Generated: 2026-01-03T13:39:35.147Z

## Guardrail (verplicht)

Voor alle wijzigingen geldt de harde scheiding tussen QuestionLab en Sourcegame:

- Zie: `docs/QUESTIONLAB_SOURCEGAME_BOUNDARY.md`

## Core (QL03) – belangrijke bestanden

- `app/backend/server.cjs`
  - mtime: **2026-01-03 10:25:29**
  - hint: _(geen header comment gevonden)_
- `app/backend/routes/a16.questionGen.cjs`
  - mtime: **2026-01-03 11:17:15**
  - hint: `// --- HOOFDVRAAG / STEP0: Presentisme AAN = Productief presentisme (F–N botsing, ZONDER C) --- // --- HOOFDVRAAG: Presentisme UIT = Neutraal/onderzoekend (mag wél analytischer) ---`
- `app/backend/routes/a17.contextGen.cjs`
  - mtime: **2026-01-03 10:38:26**
  - hint: `/* */`
- `app/backend/routes/searchMatch.cjs`
  - mtime: **2025-12-27 10:36:59**
  - hint: _(geen header comment gevonden)_
- `app/backend/routes/searchMatchV2.cjs`
  - mtime: **2026-01-02 19:34:59**
  - hint: _(geen header comment gevonden)_
- `app/backend/services/gemini.cjs`
  - mtime: **2025-12-27 09:14:18**
  - hint: _(geen header comment gevonden)_
- `app/frontend/src/pages/QuestionLabPage.tsx`
  - mtime: **2026-01-02 12:17:15**
  - hint: _(geen header comment gevonden)_
- `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
  - mtime: **2026-01-03 11:47:11**
  - hint: _(geen header comment gevonden)_

## Backend mounts (server.cjs → routes)

- base `/api` → `./routes/a06.chips.cjs`
  - file: `app/backend/routes/a06.chips.cjs` (mtime: **2025-12-22 22:12:42**)
  - endpoints in file: POST /chips, GET /image-proxy
- base `/api` → `./routes/a24.chipSuggest.cjs` (factory())
  - file: `app/backend/routes/a24.chipSuggest.cjs` (mtime: **2025-12-27 06:25:44**)
  - endpoints in file: POST /chips-suggest
- base `/api` → `./routes/a12.search.cjs`
  - file: `app/backend/routes/a12.search.cjs` (mtime: **2025-12-24 17:13:57**)
  - endpoints in file: POST /search
- base `/api` → `./routes/a13.searchPreset.cjs`
  - file: `app/backend/routes/a13.searchPreset.cjs` (mtime: **2025-12-22 22:12:42**)
  - endpoints in file: POST /search-preset
- base `/api` → `./routes/a22.thesaurus.cjs`
  - file: `app/backend/routes/a22.thesaurus.cjs` (mtime: **2025-12-22 22:12:42**)
  - endpoints in file: POST /thesaurus
- base `/api` → `./routes/a35.proposals-v2.cjs`
  - file: `app/backend/routes/a35.proposals-v2.cjs` (mtime: **2025-12-22 22:12:42**)
  - endpoints in file: POST /proposals-v2, POST /propose-lessons-v2
- base `/api` → `./routes/lessonV2.refineConcept.cjs`
  - file: `app/backend/routes/lessonV2.refineConcept.cjs` (mtime: **2025-12-22 22:12:42**)
  - endpoints in file: POST /generate-lesson-v2/refine-concept
- base `/api` → `./routes/a14.sourceDetail.cjs` (factory())
  - file: `app/backend/routes/a14.sourceDetail.cjs` (mtime: **2025-12-22 22:12:42**)
  - endpoints in file: (geen router.<method> hits)
- base `/api` → `./routes/a15.imageProxy.cjs` (factory())
  - file: `app/backend/routes/a15.imageProxy.cjs` (mtime: **2025-12-23 22:03:12**)
  - endpoints in file: GET /image-proxy
- base `/api` → `./routes/a16.questionGen.cjs` (factory())
  - file: `app/backend/routes/a16.questionGen.cjs` (mtime: **2026-01-03 11:17:15**)
  - endpoints in file: GET /question-gen/ping, POST /question-gen
- base `/api` → `./routes/a17.contextGen.cjs` (factory())
  - file: `app/backend/routes/a17.contextGen.cjs` (mtime: **2026-01-03 10:38:26**)
  - endpoints in file: POST /context-a
- base `/api` → `./routes/searchMatch.cjs` (factory())
  - file: `app/backend/routes/searchMatch.cjs` (mtime: **2025-12-27 10:36:59**)
  - endpoints in file: POST /search-match
- base `/` → `./routes/searchMatchV2.cjs`
  - file: `app/backend/routes/searchMatchV2.cjs` (mtime: **2026-01-02 19:34:59**)
  - endpoints in file: POST /api/searchMatchV2
- base `/api` → `./routes/a51.citoimg.cjs`
  - file: `app/backend/routes/a51.citoimg.cjs` (mtime: **2025-12-28 17:13:50**)
  - endpoints in file: GET /citoimg/:folder/:file

## Flow (QL03 → Context_A → Matching)

```mermaid
flowchart LR
  FE[🔵 Frontend\nQuestionLab]:::fe
  A16[🟣 a16.questionGen\nPOST /api/question-gen]:::route
  A17[🟣 a17.contextGen\nPOST /api/context-a]:::route
  SM[🟣 searchMatch / V2\n(bronmatching)]:::route
  GEM[🟢 services/gemini.cjs\nGemini call + parse]:::svc
  PG[(DB: PostgreSQL\nlessie.*)]:::db
  CSV[🟠 data/*.csv + caches]:::data

  FE --> A16 --> GEM
  FE --> A17 --> GEM
  A17 --> SM
  SM --> PG
  SM --> CSV

  classDef fe fill:#dbeafe,stroke:#1d4ed8,stroke-width:1px,color:#0f172a
  classDef route fill:#f3e8ff,stroke:#7c3aed,stroke-width:1px,color:#0f172a
  classDef svc fill:#dcfce7,stroke:#16a34a,stroke-width:1px,color:#0f172a
  classDef data fill:#ffedd5,stroke:#ea580c,stroke-width:1px,color:#0f172a
  classDef db fill:#e5e7eb,stroke:#374151,stroke-width:1px,color:#0f172a
```

## Frontend → /api/* references (scan)

- `/api/chips`
  - in: `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
- `/api/chips`
  - in: `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
- `/api/chips`
  - in: `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
- `/api/generate-lesson-v2/refine-concept`
  - in: `app/frontend/src/pages/ProposalsPage.tsx`
- `/api/generate-lesson-v2/render`
  - in: `app/frontend/src/pages/GeneratorPage.tsx`
- `/api/generate-lesson-v2/render`
  - in: `app/frontend/src/pages/GeneratorPage.tsx`
- `/api/generate-lesson-v2/render`
  - in: `app/frontend/src/pages/LesGoPreviewPage.tsx`
- `/api/generate-lesson-v2/render`
  - in: `app/frontend/src/pages/LesGoPreviewPage.tsx`
- `/api/generate-lesson-v2/step1`
  - in: `app/frontend/src/pages/LessonStep1Page.tsx`
- `/api/generate-lesson-v2/step2`
  - in: `app/frontend/src/pages/LessonStep2Page.tsx`
- `/api/generate-lesson-v2/step3`
  - in: `app/frontend/src/pages/LessonStep3Page.tsx`
- `/api/generate-lesson-v2/step4`
  - in: `app/frontend/src/pages/LessonStep4Page.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/components/A18.SelectionPanel.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/components/common/ResilientImage.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/components/common/ResilientImage.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/components/lesson/LessonPrintV5.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/pages/lessonV2/Step3View.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/pages/MatchTabPage.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/pages/ProposalsPage.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/pages/ProposalsPage.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/pages/ProposalsPage.tsx`
- `/api/image-proxy`
  - in: `app/frontend/src/pages/quarantine-step2/LessonStep2aPage.tsx`
- `/api/proposals-v2`
  - in: `app/frontend/src/pages/ProposalsPage.tsx`
- `/api/proposals-v2`
  - in: `app/frontend/src/pages/ProposalsPage.tsx`
- `/api/question-gen`
  - in: `app/frontend/src/hooks/useQuestionGen.ts`
- `/api/question-gen`
  - in: `app/frontend/src/pages/LabSourcesByDimensionPage.tsx`
- `/api/question-gen`
  - in: `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
- `/api/question-gen`
  - in: `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
- `/api/question-gen`
  - in: `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
- `/api/search`
  - in: `app/frontend/src/hooks/sourceService.ts`
- `/api/search`
  - in: `app/frontend/src/pages/LabSourcesByDimensionPage.tsx`
- `/api/search`
  - in: `app/frontend/src/pages/PresetZoekerPage.tsx`
- `/api/search`
  - in: `app/frontend/src/pages/PresetZoekerPage.tsx`
- `/api/search`
  - in: `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
- `/api/search`
  - in: `app/frontend/src/pages/questionlab/QuestionLabPage.tsx`
- `/api/search-match`
  - in: `app/frontend/src/hooks/useSearchMatch.ts`
- `/api/source-detail`
  - in: `app/frontend/src/hooks/sourceService.ts`
- `/api/source-detail`
  - in: `app/frontend/src/pages/LabSourcesByDimensionPage.tsx`

## Backend inventaris

### Routes (44)
- `app/backend/routes/a01.health.cjs` (mtime: **2025-12-26 20:42:48**)
- `app/backend/routes/a05.chips.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a06.chips.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a08.chips.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a11.pingEuropeana.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a12.search.cjs` (mtime: **2025-12-24 17:13:57**)
- `app/backend/routes/a13.searchPreset.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a14.presets.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a14.sourceDetail.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a15.imageProxy.cjs` (mtime: **2025-12-23 22:03:12**)
- `app/backend/routes/a16.questionGen.cjs` (mtime: **2026-01-03 11:17:15**)
- `app/backend/routes/a17.contextGen.cjs` (mtime: **2026-01-03 10:38:26**)
- `app/backend/routes/a17.questionFlow.cjs` (mtime: **2026-01-02 21:32:39**)
- `app/backend/routes/a17.questionProfile.cjs` (mtime: **2026-01-03 08:49:45**)
- `app/backend/routes/a22.thesaurus.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a23.facets.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a23.kaLookup.cjs` (mtime: **2025-12-26 15:37:43**)
- `app/backend/routes/a23.searchRaw.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a24.chipSuggest.cjs` (mtime: **2025-12-27 06:25:44**)
- `app/backend/routes/a24.item.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a26.sources.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a27.imageProxy.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a29.tvKa.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a30.lesson.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a35.proposals-v2.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a36.refine.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a40.lesson-full.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a40.lesson-v2.backup.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a40.lesson-v2.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a41.labQuestions.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/a50.dbBrowser.cjs` (mtime: **2025-12-26 16:00:59**)
- `app/backend/routes/a51.citoimg.cjs` (mtime: **2025-12-28 17:13:50**)
- `app/backend/routes/a90.admin.cjs` (mtime: **2025-12-26 11:35:32**)
- `app/backend/routes/admin.kleio.cjs` (mtime: **2025-12-26 11:22:54**)
- `app/backend/routes/bronselectie.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/image-proxy.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/lessonV2.refineConcept.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/lessonV2.step1.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/lessonV2.step2.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/lessonV2.step3.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/lessonV2.step4.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/proposals-v2.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/routes/searchMatch.cjs` (mtime: **2025-12-27 10:36:59**)
- `app/backend/routes/searchMatchV2.cjs` (mtime: **2026-01-02 19:34:59**)

### Services (19)
- `app/backend/services/a05.gemini.cjs` (mtime: **2025-12-27 09:01:39**)
- `app/backend/services/a06.chips.cjs` (mtime: **2025-12-27 08:57:46**)
- `app/backend/services/a12.search.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/services/a22.ka-mapping.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/services/a22.thesaurus.cjs` (mtime: **2026-01-02 20:58:37**)
- `app/backend/services/a23.facets.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/services/a24.item.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/services/a26.sources.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/services/a27.kleio.cjs` (mtime: **2025-12-24 14:25:09**)
- `app/backend/services/a28.cito.cjs` (mtime: **2025-12-26 21:40:35**)
- `app/backend/services/a29.historiek.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/services/entitiesStore.cjs` (mtime: **2025-12-27 06:34:35**)
- `app/backend/services/gemini.cjs` (mtime: **2025-12-27 09:14:18**)
- `app/backend/services/kleioCache.cjs` (mtime: **2025-12-24 16:47:44**)
- `app/backend/services/kleioCache.gcs.cjs` (mtime: **2025-12-24 13:58:55**)
- `app/backend/services/kleioCache.local.cjs` (mtime: **2025-12-24 14:15:53**)
- `app/backend/services/matchScore.cjs` (mtime: **2026-01-02 17:13:30**)
- `app/backend/services/questionEntities.cjs` (mtime: **2026-01-02 19:43:44**)
- `app/backend/services/sourceFilter.cjs` (mtime: **2025-12-22 22:12:42**)

### Prompts (11)
- `app/backend/prompts/lesgoPrompt.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/lessonV2.base.cjs` (mtime: **2025-12-29 12:08:16**)
- `app/backend/prompts/lessonV2.proposals.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/lessonV2.refineConcept.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/lessonV2.step1.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/lessonV2.step2.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/lessonV2.step2.hoofdvraag.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/lessonV2.step3.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/lessonV2.step4.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/masterprompt-history.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/prompts/questionFlow.prompts.cjs` (mtime: **2026-01-02 21:41:35**)

### Data (47)
- `app/backend/data/cito_bronnen.csv` (mtime: **2025-12-22 22:12:42**)
- `app/backend/data/cito_docx_runs/run_20251228_205511/cito_sources.csv` (mtime: **2025-12-28 19:55:12**)
- `app/backend/data/cito_docx_runs/run_20251228_205511/report.json` (mtime: **2025-12-28 19:55:12**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_210344.csv` (mtime: **2025-12-28 20:03:44**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_211300.csv` (mtime: **2025-12-28 20:13:00**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_213743.csv` (mtime: **2025-12-28 20:37:43**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_215612.csv` (mtime: **2025-12-28 20:56:13**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_220017.csv` (mtime: **2025-12-28 21:00:18**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_220608.csv` (mtime: **2025-12-28 21:06:09**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_221252.csv` (mtime: **2025-12-28 21:12:53**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_222906.csv` (mtime: **2025-12-28 21:29:06**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_225445.csv` (mtime: **2025-12-28 21:54:45**)
- `app/backend/data/cito_exam_sources_import_from_docx_20251228_233725.csv` (mtime: **2025-12-28 22:37:25**)
- `app/backend/data/cito_exam_sources_import_from_docx_LATEST.csv` (mtime: **2025-12-28 22:37:25**)
- `app/backend/data/cito_exam_sources_import_from_docx_LATEST_pg.csv` (mtime: **2025-12-28 22:42:46**)
- `app/backend/data/cito_exam_sources_import_from_docx_VWO_20251228_234859.csv` (mtime: **2025-12-28 22:49:00**)
- `app/backend/data/cito_exam_sources_import_v10_from_docx.csv` (mtime: **2025-12-28 19:40:08**)
- `app/backend/data/cito_exam_sources_import_v10_from_docx_citoimg_fixed.csv` (mtime: **2025-12-28 18:34:02**)
- `app/backend/data/cito_exam_sources_import_v10_from_docx_fulltext_fixed.csv` (mtime: **2025-12-28 18:39:17**)
- `app/backend/data/cito_exam_sources_import_v21_from_docx.csv` (mtime: **2025-12-28 17:37:53**)
- `app/backend/data/cito_exam_sources_import_v22_from_docx_clean.csv` (mtime: **2025-12-28 18:04:37**)
- `app/backend/data/cito_exam_sources_import_v23_dedupe_sentences.csv` (mtime: **2025-12-28 18:08:21**)
- `app/backend/data/cito_exam_sources_import_v24_havo_plus_vwo.csv` (mtime: **2025-12-28 14:17:20**)
- `app/backend/data/cito_exam_sources_import_v24_sentlines_dedupe.csv` (mtime: **2025-12-28 18:10:46**)
- `app/backend/data/cito_exam_sources_import_v25_block_dedupe.csv` (mtime: **2025-12-28 18:13:09**)
- `app/backend/data/cito_exam_sources_import_v28_from_docx_folder_textboxes_dedupe.csv` (mtime: **2025-12-28 18:22:23**)
- `app/backend/data/cito_exam_sources_import_v29_from_docx_folder_textboxes_dedupe.csv` (mtime: **2025-12-28 20:32:26**)
- `app/backend/data/cito_ka_diff_top30.csv` (mtime: **2025-12-31 19:49:59**)
- `app/backend/data/geheugennl_cache.csv` (mtime: **2025-12-29 17:03:55**)
- `app/backend/data/geheugennl_cache_full.csv` (mtime: **2025-12-29 17:29:12**)
- `app/backend/data/historiek_begrippen_omzet.csv` (mtime: **2025-12-22 22:12:42**)
- `app/backend/data/historiek_personen_omzet.csv` (mtime: **2025-12-22 22:12:42**)
- `app/backend/data/historiek_personen_omzet_final.csv` (mtime: **2025-12-22 22:12:42**)
- `app/backend/data/historiek_personen_omzet_wiki.csv` (mtime: **2025-12-22 22:12:42**)
- `app/backend/data/ka-trefwoorden.cjs` (mtime: **2026-01-01 10:12:04**)
- `app/backend/data/kaMap.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/data/kleio_cache.bak.csv` (mtime: **2025-12-29 18:55:18**)
- `app/backend/data/kleio_cache.csv` (mtime: **2026-01-01 18:51:12**)
- `app/backend/data/kleio_cache_full.bak.csv` (mtime: **2025-12-29 18:51:54**)
- `app/backend/data/kleio_cache_full.csv` (mtime: **2025-12-29 19:30:20**)
- `app/backend/data/kleio_cache_full_dedup.csv` (mtime: **2025-12-29 19:29:37**)
- `app/backend/data/kleio_cache_tvfilled.csv` (mtime: **2025-12-29 18:55:18**)
- `app/backend/data/kleio_crabby.csv` (mtime: **2025-12-24 16:49:00**)
- `app/backend/data/tijdvakken.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/data/tv-ka.cjs` (mtime: **2025-12-22 22:12:42**)
- `app/backend/data/tv_guess_report.csv` (mtime: **2025-12-29 18:46:15**)
- `app/backend/data/tvka_allow.json` (mtime: **2025-12-30 15:13:02**)

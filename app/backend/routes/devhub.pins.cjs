"use strict";

// Top 20 (ALL) = “Lessie 2000 old backend” + QL + lessonV2 + dev tooling
const TOP20_ALL = [
  "server.cjs",

  "routes/a03.devHub.cjs",
  "routes/a02.devTree.cjs",
  "routes/a04.devDbStatus.cjs",
  "routes/a09.devSnapshots.cjs",

  "routes/a12.search.cjs",
  "routes/a13.searchPreset.cjs",
  "routes/a14.sourceDetail.cjs",
  "routes/a15.imageProxy.cjs",
  "routes/a16.questionGen.cjs",
  "routes/a17.contextGen.cjs",

  "routes/searchMatch.cjs",
  "routes/searchMatchV2.cjs",
  "routes/a35.proposals-v2.cjs",

  "routes/lessonV2.step1.cjs",
  "routes/lessonV2.step2.cjs",
  "routes/lessonV2.step3.cjs",
  "routes/lessonV2.step4.cjs",
  "routes/lessonV2.refineConcept.cjs",
];

// Top 20 (QL) = alleen QuestionLab + matching + dev tooling
const TOP20_QL = [
  "server.cjs",

  "routes/a03.devHub.cjs",
  "routes/a02.devTree.cjs",
  "routes/a04.devDbStatus.cjs",
  "routes/a09.devSnapshots.cjs",

  "routes/a12.search.cjs",
  "routes/a13.searchPreset.cjs",
  "routes/a14.sourceDetail.cjs",
  "routes/a15.imageProxy.cjs",

  "routes/a16.questionGen.cjs",
  "routes/a17.contextGen.cjs",

  "routes/a06.chips.cjs",
  "routes/a07.usageEvents.cjs",
  "routes/a24.chipSuggest.cjs",

  "routes/searchMatch.cjs",
  "routes/searchMatchV2.cjs",
  "routes/a35.proposals-v2.cjs",

  "routes/a22.thesaurus.cjs",
];

module.exports = { TOP20_ALL, TOP20_QL };


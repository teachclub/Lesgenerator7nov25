"use strict";

const express = require("express");

module.exports = function a03DevHubFactory() {
  const router = express.Router();

  const isRunAppDefault = "https://kleio9nov-578e4.web.app";

  const FRONTEND_BASE_OLD =
    (process.env.LESSIE_FRONTEND_BASE_OLD || process.env.LESSIE_FRONTEND_BASE || "").trim();

  const FRONTEND_BASE_QL =
    (process.env.LESSIE_FRONTEND_BASE_QL || process.env.LESSIE_FRONTEND_BASE || "").trim();

  // Top20 Lessie 2000 (ALL) + Top20 QL (curated)
  // Paths zijn repo-root relatief zoals a09.devSnapshots verwacht (dus zonder "app/backend/").
  const TOP20_ALL = [
    "server.cjs",
    "routes/a01.health.cjs",
    "routes/a02.devTree.cjs",
    "routes/a03.devHub.cjs",
    "routes/a04.devDbStatus.cjs",
    "routes/a06.chips.cjs",
    "routes/a07.usageEvents.cjs",
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
    "routes/lessonV2.step4.cjs",
  ];

  const TOP20_QL = [
    "server.cjs",
    "routes/a03.devHub.cjs",
    "routes/a02.devTree.cjs",
    "routes/a09.devSnapshots.cjs",
    "routes/a04.devDbStatus.cjs",
    "routes/a07.usageEvents.cjs",
    "routes/a14.sourceDetail.cjs",
    "routes/a15.imageProxy.cjs",
    "routes/a16.questionGen.cjs",
    "routes/a17.contextGen.cjs",
    "routes/searchMatch.cjs",
    "routes/searchMatchV2.cjs",
    "routes/a12.search.cjs",
    "routes/a13.searchPreset.cjs",
    "routes/a35.proposals-v2.cjs",
    "routes/a22.thesaurus.cjs",
    "routes/a24.chipSuggest.cjs",
    "routes/a50.dbBrowser.cjs",
    "routes/a06.chips.cjs",
    "routes/a01.health.cjs",
  ];

  router.get("/dev", (req, res) => {
        frame.src = jurl;
    return;
    }

    if (mode === "live") {
      const base = (target === "ql") ? FRONTEND_QL : FRONTEND_OLD;
      setStatus(base);
      frame.src = base;
    }
  }

  btns.forEach(b => {
    b.addEventListener("click", () => {
      const mode = b.getAttribute("data-mode");
      const scope = b.getAttribute("data-scope");
      const target = b.getAttribute("data-target");
      setActive(b);
      go(mode, scope, target);
    });
  });

  withHints.addEventListener("change", () => {
    if (current.mode === "tree") go("tree", current.scope);
  });
  withNotes.addEventListener("change", () => {
    if (current.mode === "tree") go("tree", current.scope);
  });
  includeMin.addEventListener("change", () => {
    if (current.mode === "tree") go("tree", current.scope);
  });

  updatePill();
<\/script>

</body>
</html>`;
    res.set("Cache-Control", "no-store");
    res.type("html").send(html);
  });

  return router;
};


// backend/routes/a40.lesson-v2.cjs

const express = require("express");
const router = express.Router();

// Zorg dat de CITO-bank wordt ingeladen (logging: [a28.cito] ...)
try {
  require("../services/a28.cito.cjs");
} catch (err) {
  console.error("[a40.lesson-v2] Kon CITO-service niet laden:", err?.message);
}

/**
 * Helper: koppel een submodule aan deze router.
 *
 * Ondersteunt:
 * 1) module.exports = express.Router()
 * 2) module.exports = function (router) { ... }
 * 3) module.exports = { registerX: function (router) { ... } }
 * 4) module.exports = { default: function (router) { ... } }
 */
function attachModule(baseRouter, path, exportName) {
  const mod = require(path);

  // Case 1: direct een functie
  if (typeof mod === "function") {
    // Is het een Express-router? (heeft .use en .stack)
    if (mod.stack && Array.isArray(mod.stack) && typeof mod.use === "function") {
      console.log(`[a40.lesson-v2] 🔗 Gebruik Express-router uit ${path}`);
      baseRouter.use(mod);
    } else {
      console.log(`[a40.lesson-v2] 🔧 Roep anonieme register-functie uit ${path} aan`);
      mod(baseRouter);
    }
    return;
  }

  // Case 2: named export, bv { registerLessonV2Step1Routes }
  if (mod && typeof mod[exportName] === "function") {
    console.log(
      `[a40.lesson-v2] 🔧 Roep named register-functie "${exportName}" uit ${path} aan`
    );
    mod[exportName](baseRouter);
    return;
  }

  // Case 3: default export als functie
  if (mod && typeof mod.default === "function") {
    console.log(
      `[a40.lesson-v2] 🔧 Roep default register-functie uit ${path} aan`
    );
    mod.default(baseRouter);
    return;
  }

  console.warn(
    `[a40.lesson-v2] ⚠️ Geen bruikbare export gevonden in ${path} (verwacht router of functie "${exportName}")`
  );
}

// Alle deelroutes ophangen aan deze router
attachModule(router, "./lessonV2.step1.cjs", "registerLessonV2Step1Routes");
attachModule(router, "./lessonV2.step2.cjs", "registerLessonV2Step2Routes");
attachModule(router, "./lessonV2.step3.cjs", "registerLessonV2Step3Routes");
attachModule(router, "./lessonV2.step4.cjs", "registerLessonV2Step4Routes");
attachModule(router, "./a35.proposals-v2.cjs", "registerProposalsV2Routes");

module.exports = router;


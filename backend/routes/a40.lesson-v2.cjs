// routes/a40.lesson-v2.cjs
// Oude step-endpoints voor generate-lesson-v2 zijn uitgefaseerd.
// Deze router geeft nu expliciet 410 GONE terug op alle step-routes.

const express = require('express');
const router = express.Router();

const sendGone = (req, res) => {
  res.status(410).json({
    error: 'generate-lesson-v2 step-endpoints are no longer supported. Gebruik /api/generate-lesson-v2/full.'
  });
};

router.post('/generate-lesson-v2/step1', sendGone);
router.post('/generate-lesson-v2/step2', sendGone);
router.post('/generate-lesson-v2/step3', sendGone);
router.post('/generate-lesson-v2/step4', sendGone);

module.exports = router;


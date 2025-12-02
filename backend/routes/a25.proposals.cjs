const express = require('express');
const router = express.Router();

/**
 * A25 — Dummy KA-lesvoorstellen
 * ---------------------------------------
 * Deze route is expres SUPER-stabiel gemaakt:
 * - Geen externe API-calls
 * - Geen Kleio
 * - Geen Cito
 * - Geen Gemini
 * - Géén CPU-zware loops
 * - 100% async-safe en crash-proof
 *
 * Doel:
 * Vanuit de frontend proposals-page kan de gebruiker altijd
 * drie KA-lesvoorstellen krijgen zonder dat de backend wegvalt.
 */

router.post('/propose-lessons', async (req, res) => {
  try {
    const { query = "KA-lessen" } = req.body || {};

    // Simpele dummy-data, altijd geldig
    const proposals = [
      {
        id: 1,
        titel: "KA-les – voorstel 1",
        vraag: "Wat zette dit onderwerp over de angsten en hoop van mensen in die tijd?",
        bronnenAantal: 3,
        categorie: "Havo/Vwo Bovenbouw"
      },
      {
        id: 2,
        titel: "KA-les – voorstel 2",
        vraag: "Waarom zagen tijdgenoten dit als een logische ontwikkeling?",
        bronnenAantal: 4,
        categorie: "Havo/Vwo Bovenbouw"
      },
      {
        id: 3,
        titel: "KA-les – voorstel 3",
        vraag: "Hoe verklaar je het verschil tussen toen en nu in de manier waarop mensen hierover dachten?",
        bronnenAantal: 5,
        categorie: "Havo/Vwo Bovenbouw"
      }
    ];

    return res.json({
      ok: true,
      query,
      proposals
    });

  } catch (err) {
    console.error("[A25] FOUT:", err);
    return res.status(500).json({ error: "Interne fout in A25.proposals" });
  }
});

module.exports = router;


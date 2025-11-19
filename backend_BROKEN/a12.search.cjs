const express = require("express");
const router = express.Router();
const fetch = require('node-fetch');

// Importeer de 'sanitizer'-functie die we EERDER hebben gerepareerd [1]
// Deze functie voorkomt de Europeana 400 Bad Request-fout.[1]
const { buildEuropeanaRequestParams } = require("../services/a23.europeana.cjs");

const API_KEY = process.env.EUROPEANA_WSKEY;
const BASE_URL = 'https://api.europeana.eu/record/v2/search.json';

/**
 * (BACKWIJ.B03) De "Treffers"-controller (Kolom 2)
 * Deze route wordt aangeroepen door de useSearchApi (F15) hook.
 */
router.post("/search", async (req, res) => {
  if (!API_KEY) {
    console.error("[routes/a12.search] Fout: EUROPEANA_WSKEY is niet ingesteld.");
    return res.status(500).json({ ok: false, error: "Server configuratiefout." });
  }

  try {
    // --- HIER IS DE DEFINITIEVE FIX ---
    // Het is nu '||' (twee pipes, logische OR)
    const payload = req.body |

| {}; // { query, rows, start,... }

    // STAP 1: Bouw de veilige URL met de gepatchte service [1]
    // Dit past de fix toe voor 'rows=0' en 'query=*:*' [1]
    const sanitizedApiParams = buildEuropeanaRequestParams(API_KEY, payload);

    // STAP 2: Voer de daadwerkelijke API-aanroep uit (backend-naar-backend)
    const response = await fetch(
      `${BASE_URL}?${sanitizedApiParams.toString()}`
    );

    if (!response.ok) {
      // Vang fouten van Europeana af
      console.error(`[routes/a12.search] Europeana API Fout: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        ok: false,
        error: `Europeana API Fout: ${response.statusText}`,
      });
    }

    const data = await response.json();
    res.json(data); // Stuur de 'totalResults', 'items', etc. terug
  
  } catch (e) {
    console.error("[routes/a12.search] Onverwachte error:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;

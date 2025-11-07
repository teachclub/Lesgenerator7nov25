function warn(msg) {
  console.warn(`[env] WAARSCHUWING: ${msg}`);
}

function loadEnv() {
  const requiredKeys = ["EUROPEANA_WSKEY", "GEMINI_API_KEY", "GEMINI_MODEL_CHIPS"];
  let allOk = true;

  for (const k of requiredKeys) {
    if (!process.env[k] || String(process.env[k]).trim() === "") {
      warn(`${k} ontbreekt of is leeg. Bepaalde routes (Europeana/Chips) zullen falen.`);
      allOk = false;
    }
  }

  // Normaliseer GEMINI_MODEL_CHIPS (moet *zonder* "models/" prefix zijn)
  const modelEnv = process.env.GEMINI_MODEL_CHIPS;
  if (modelEnv && modelEnv.startsWith("models/")) {
    const normalizedModel = modelEnv.replace(/^models\//, "");
    process.env.GEMINI_MODEL_CHIPS = normalizedModel;
    warn(`GEMINI_MODEL_CHIPS genormaliseerd van "${modelEnv}" naar "${normalizedModel}"`);
  }

  if (allOk) {
    console.log("[env] Alle vereiste API keys (Europeana, Gemini) zijn geladen.");
  }

  return process.env;
}

module.exports = { loadEnv };

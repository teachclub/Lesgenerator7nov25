// prompts/lessonV2.step3.cjs
// Step3 is puur server-side: bronnenblad op basis van bestaande data.

function buildStep3Data(body) {
  const { concept = {}, sources = [] } = body;

  return {
    step: 3,
    data: {
      inleiding:
        "In dit bronnenblad vind je alle bronnen met nummer. Gebruik de bronverwijzingen in je antwoorden.",
      bronnen: sources.map((s, idx) => ({
        id: s.id,
        nummer: idx + 1,
        titel: s.title || s.description || `Bron ${idx + 1}`,
        type: s.type || "TEXT",
        provider: s.provider || "",
        url: s.url || null,
        imageUrl: s.imageUrl || null,
        fullText: s.fullText || s.content || s.description || "",
      })),
      concept,
    },
  };
}

module.exports = {
  buildStep3Data,
};


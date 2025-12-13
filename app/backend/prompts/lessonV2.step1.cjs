"use strict";

const { MASTER_SIGNATURE } = require("../config/masterSignature.cjs");

function safeStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

function extractDeelvragen(concept) {
  const dv = concept && Array.isArray(concept.deelvragen) ? concept.deelvragen : [];
  const out = [];
  for (const item of dv) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
    else if (item && typeof item === "object" && typeof item.vraag === "string" && item.vraag.trim())
      out.push(item.vraag.trim());
  }
  return out.slice(0, 4);
}

function buildSourcesBlock(sources) {
  const lines = [];
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i] || {};
    const title = safeStr(s.title) || safeStr(s.description) || "Naamloze bron";
    const provider = safeStr(s.provider) || "-";
    const type = safeStr(s.type) || "-";
    lines.push(`${i + 1}. [${provider} | ${type} | ${safeStr(s.id) || "-"}] ${title}`);
  }
  return lines.join("\n");
}

function buildStep1Prompt(body) {
  const concept = body && body.concept ? body.concept : {};
  const sources = Array.isArray(body && body.sources) ? body.sources : [];

  const expected = safeStr(concept.masterSignature) || MASTER_SIGNATURE;
  const hoofdvraag = safeStr(concept.hoofdvraag);
  const hook = safeStr(concept.hook);
  const title = safeStr(concept.title);
  const deelvragen = extractDeelvragen(concept);

  const dv1 = deelvragen[0] || "Deelvraag 1 (formuleer passend bij de hoofdvraag)";
  const dv2 = deelvragen[1] || "Deelvraag 2 (formuleer passend bij de hoofdvraag)";
  const dv3 = deelvragen[2] || "Deelvraag 3 (formuleer passend bij de hoofdvraag)";
  const dv4 = deelvragen[3] || "Deelvraag 4 (formuleer passend bij de hoofdvraag)";

  const N = sources.length;

  return `
CHAIN_SIGNATURE: ${expected}

Je bent een ervaren docent geschiedenis (NL VO). Anti-presentisme: formuleer verklaringen vanuit het verleden zelf, zonder moreel oordeel vanuit het heden.

JE OUTPUT MOET PURE JSON ZIJN
- Geen markdown
- Geen \`\`\` fences
- Geen extra tekst

Je krijgt ${N} bronnen. Geldige bronverwijzingen zijn gehele getallen 1 t/m ${N}.
ELKE deelvraag/antwoord MUST minstens 1 geldige bronverwijzing hebben (dus nooit [] en nooit 0 of >${N}).

CONCEPT
- Titel: ${title || "-"}
- Hook: ${hook || "-"}
- Hoofdvraag: ${hoofdvraag}

DEELVRAGEN (exact deze teksten gebruiken)
1) ${dv1}
2) ${dv2}
3) ${dv3}
4) ${dv4}

BRONNEN (genummerd 1..${N})
${buildSourcesBlock(sources)}

VEREIST JSON-SCHEMA (exact deze keys; strings invullen; arrays op lengte-eisen)
{
  "step": "step1",
  "data": {
    "chainSignature": "${expected}",
    "docent": {
      "wat": "…",
      "hoe": "…",
      "waarom": "…",
      "deelvragen": [
        "${dv1}",
        "${dv2}",
        "${dv3}",
        "${dv4}"
      ],
      "hoofdvraagAntwoord": {
        "vraag": "${hoofdvraag}",
        "antwoord": "…",
        "gebruikteBronNummers": [1]
      },
      "deelantwoorden": [
        {
          "vraag": "${dv1}",
          "antwoord": "…",
          "gebruikteBronNummers": [1]
        },
        {
          "vraag": "${dv2}",
          "antwoord": "…",
          "gebruikteBronNummers": [2]
        },
        {
          "vraag": "${dv3}",
          "antwoord": "…",
          "gebruikteBronNummers": [3]
        },
        {
          "vraag": "${dv4}",
          "antwoord": "…",
          "gebruikteBronNummers": [4]
        }
      ],
      "bronverwijzingenPerDeelvraag": [
        { "deelvraag": "${dv1}", "bronnen": [1] },
        { "deelvraag": "${dv2}", "bronnen": [2] },
        { "deelvraag": "${dv3}", "bronnen": [3] },
        { "deelvraag": "${dv4}", "bronnen": [4] }
      ],
      "lesfasen": [
        {
          "fase": "Instructie",
          "tijd": "10 min",
          "doel": "…",
          "activiteit": "…",
          "werkvorm": "…"
        },
        {
          "fase": "Verwerking",
          "tijd": "30 min",
          "doel": "…",
          "activiteit": "…",
          "werkvorm": "…"
        },
        {
          "fase": "Evaluatie/reflectie",
          "tijd": "10 min",
          "doel": "…",
          "activiteit": "…",
          "werkvorm": "…"
        }
      ]
    }
  }
}

HARD RULES (anders is het fout):
- gebruikteBronNummers/bronnen: minimaal 1 integer binnen 1..${N}
- deelantwoorden[i].vraag en bronverwijzingenPerDeelvraag[i].deelvraag moeten EXACT gelijk zijn aan docent.deelvragen[i]
- lesfasen tijden exact: 10,30,10 (totaal 50) met "min"
- chainSignature exact "${expected}"

Geef nu alleen de JSON-output volgens schema.
`.trim();
}

module.exports = {
  buildStep1Prompt,
};


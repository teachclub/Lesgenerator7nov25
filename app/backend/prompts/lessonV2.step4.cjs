"use strict";

// prompts/lessonV2.step4.cjs
// Step 4 = Step 2 + antwoorden (zonder vragen te veranderen)

const { buildBasePreamble, resolveChainSignature } = require("./lessonV2.base.cjs");

function normStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

function clip(s, n) {
  const t = normStr(s);
  if (!t) return "";
  if (t.length <= n) return t;
  return t.slice(0, n).trim() + "…";
}

function pickTextFromSource(s) {
  if (!s || typeof s !== "object") return "";
  return (
    normStr(s.fullText) ||
    normStr(s.content) ||
    normStr(s.description) ||
    normStr(s.snippet) ||
    ""
  );
}

function buildSourcesPack(sources, step2Leerling) {
  const nummering = Array.isArray(step2Leerling?.bronnenblad?.bronNummering)
    ? step2Leerling.bronnenblad.bronNummering
    : [];

  const byId = new Map();
  for (const s of Array.isArray(sources) ? sources : []) {
    if (!s) continue;
    byId.set(String(s.id), s);
  }

  const pack = [];
  if (nummering.length) {
    for (const b of nummering) {
      const idKey = String(b.id);
      const src = byId.get(idKey) || null;

      pack.push({
        bronNummer: b.nummer,
        id: b.id,
        label: normStr(b.label) || normStr(src?.title) || "",
        provider: normStr(b.provider) || normStr(src?.provider) || "",
        type: normStr(b.type) || normStr(src?.type) || "",
        tekst: clip(pickTextFromSource(src), 1400),
      });
    }
    return pack;
  }

  const arr = Array.isArray(sources) ? sources : [];
  for (let i = 0; i < arr.length; i++) {
    const s = arr[i];
    pack.push({
      bronNummer: i + 1,
      id: s.id,
      label: normStr(s.title) || "",
      provider: normStr(s.provider) || "",
      type: normStr(s.type) || "",
      tekst: clip(pickTextFromSource(s), 1400),
    });
  }
  return pack;
}

function buildStep4Prompt(payload) {
  const concept = payload.concept || {};
  const tvKa = payload.tvKa || {};
  const step2Leerling = payload.step2 || {};
  const meta = payload._step4Meta || {};

  const sig = resolveChainSignature(payload);
  const preamble = buildBasePreamble(sig);

  const sourcesPack = buildSourcesPack(payload.sources || [], step2Leerling);

  const flatQuestions = Array.isArray(meta.flatQuestions) ? meta.flatQuestions : [];
  const reflectieVragen = Array.isArray(meta.reflectieVragen) ? meta.reflectieVragen : [];

  return `
${preamble}

TAK: STEP 4 = STEP 2 MET INTEGRAAL ANTWOORDMODEL

BELANGRIJK
- Je MAG GEEN vragen herschrijven of opnieuw ordenen.
- Je geeft ALLEEN antwoorden.
- Als een antwoord niet stevig uit de gegeven bronnen te halen is, zeg je dat kort en neutraal.
- Schrijf in het Nederlands.
- GEEN markdown, GEEN codefences, ALLEEN geldig JSON.

CONCEPT
${JSON.stringify(
  {
    hoofdvraag: concept.hoofdvraag || "",
    tv: tvKa.tv || concept.tv || "",
    tvLabel: tvKa.tvLabel || concept.tvLabel || "",
    ka: tvKa.ka || concept.ka || "",
    kaLabel: tvKa.kaLabel || concept.kaLabel || "",
  },
  null,
  2
)}

BRONNEN (met nummering; baseer je antwoorden op deze tekstsnippers)
${JSON.stringify(sourcesPack, null, 2)}

BRONVRAGEN (doorlopend genummerd)
${JSON.stringify(flatQuestions, null, 2)}

REFLECTIEVRAGEN (nummering start opnieuw bij 1)
${JSON.stringify(reflectieVragen.map((v, i) => ({ nummer: i + 1, vraag: v })), null, 2)}

INVULTABEL-KOLOMMEN (gebruik deze velden in je rijen)
${JSON.stringify(
  Array.isArray(step2Leerling?.samenwerkingstabel?.kolommen)
    ? step2Leerling.samenwerkingstabel.kolommen
    : ["Bron", "Wie spreekt", "Observatie", "Interpretatie", "Dimensie", "Subdimensie"],
  null,
  2
)}

JSON-OUTPUT (STRICT)
Geef EXACT dit JSON-object terug, niets eromheen:

{
  "data": {
    "chainSignature": "${sig}",
    "bronvragenAntwoorden": [
      {
        "bronNummer": 1,
        "antwoorden": [
          { "nummer": 1, "antwoord": "..." }
        ]
      }
    ],
    "samenwerkingstabel": {
      "rijen": [
        {
          "bron": "Bron 1",
          "wieSpreekt": "...",
          "observatie": "...",
          "interpretatie": "...",
          "dimensie": "...",
          "subdimensie": "..."
        }
      ]
    },
    "reflectieAntwoorden": [
      { "nummer": 1, "antwoord": "..." }
    ]
  }
}

EISEN
- Voor ELKE bronvraag (uit BRONVRAGEN) moet een antwoord aanwezig zijn met hetzelfde "nummer".
- Groepeer antwoorden per bronNummer zoals in de bronvragen (dus bron 1 antwoorden bij bronNummer 1, enz).
- samenwerkingstabel.rijen: maak minimaal 1 rij per bron (Bron 1..N).
- reflectieAntwoorden: geef een antwoord op ELKE reflectievraag (nummer 1..M).
`;
}

module.exports = { buildStep4Prompt };


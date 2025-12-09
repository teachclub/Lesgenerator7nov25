// backend/utils/formatLessonMarkdown.cjs
// Zet de vier LesGo-JSON-stappen + bronnen om in één Canvas-klaar Markdown-document.

function safeTrim(str) {
  if (!str) return '';
  return String(str).trim();
}

/**
 * Bouwt één Markdown-lesdocument op basis van concept, sources en step1..4 JSON.
 *
 * @param {Object} lesson
 * @param {string} lesson.concept
 * @param {Array}  lesson.sources
 * @param {Object} lesson.step1
 * @param {Object} lesson.step2
 * @param {Object} lesson.step3
 * @param {Object} lesson.step4
 * @returns {string} markdown
 */
function buildLessonMarkdown(lesson) {
  const {
    concept = '',
    sources = [],
    step1 = {},
    step2 = {},
    step3 = {},
    step4 = {},
  } = lesson;

  const lines = [];

  // ===== DOCENTVERSIE =====
  lines.push('# Docentversie');
  lines.push('');
  lines.push('## 1. Concept / thema');
  lines.push('');
  if (concept) {
    lines.push(concept);
  } else {
    lines.push('_Geen concepttekst meegegeven._');
  }
  lines.push('');

  // Docenteninstructie
  lines.push('## 2. Docenteninstructie – wat / hoe / waarom');
  lines.push('');
  if (step1.docentenInstructie) {
    const { wat, hoe, waarom } = step1.docentenInstructie;
    lines.push('**Wat**  ');
    lines.push(safeTrim(wat));
    lines.push('');
    lines.push('**Hoe**  ');
    lines.push(safeTrim(hoe));
    lines.push('');
    lines.push('**Waarom**  ');
    lines.push(safeTrim(waarom));
    lines.push('');
  } else {
    lines.push('_Geen docenteninstructie beschikbaar._');
    lines.push('');
  }

  // Lesplanning
  lines.push('## 3. Lesplanning');
  lines.push('');
  if (step1.lesPlanning && step1.lesPlanning.tabelMarkdown) {
    lines.push(safeTrim(step1.lesPlanning.tabelMarkdown));
    lines.push('');
  } else {
    lines.push('_Geen lesplanning-tabel beschikbaar._');
    lines.push('');
  }

  // Bronnenoverzicht
  lines.push('## 4. Bronnenoverzicht (alleen docent)');
  lines.push('');
  if (sources.length === 0) {
    lines.push('_Geen bronnen meegegeven._');
    lines.push('');
  } else {
    sources.forEach((src, idx) => {
      const nr = idx + 1;
      const title = src.title || `Bron ${nr}`;
      lines.push(`### Bron ${nr} – ${title}`);
      lines.push('');
      if (src.imageUrl) {
        lines.push(`![Bron ${nr}](${src.imageUrl})`);
        lines.push('');
      }
      if (src.caption) {
        lines.push(src.caption);
        lines.push('');
      }
      if (src.sourceInfo) {
        lines.push(`*Herkomst:* ${src.sourceInfo}`);
        lines.push('');
      }
    });
  }

  // Antwoordmodel per bron
  lines.push('## 5. Antwoordmodel per bron');
  lines.push('');
  if (Array.isArray(step4.bronAntwoorden) && step4.bronAntwoorden.length > 0) {
    step4.bronAntwoorden.forEach((ba) => {
      const nr = ba.bronNummer;
      lines.push(`### Bron ${nr}`);
      lines.push('');
      lines.push('**Observeren (voorbeeldantwoord)**  ');
      lines.push(safeTrim(ba.observerenAntwoord));
      lines.push('');
      lines.push('**Interpreteren (voorbeeldantwoord)**  ');
      lines.push(safeTrim(ba.interpreterenAntwoord));
      lines.push('');
      lines.push('**Relatie met de hoofdvraag (voorbeeld)**  ');
      lines.push(safeTrim(ba.hoofdvraagRelatieAntwoord));
      lines.push('');
      if (ba.stereotyperingAnalyseAntwoord) {
        lines.push('**Stereotypering (indien van toepassing)**  ');
        lines.push(safeTrim(ba.stereotyperingAnalyseAntwoord));
        lines.push('');
      }
    });
  } else {
    lines.push('_Geen antwoorden per bron beschikbaar._');
    lines.push('');
  }

  // Samenwerkingstabel ingevuld
  lines.push('## 6. Samenwerkingstabel – ingevuld (voorbeeld)');
  lines.push('');
  if (step4.samenwerkingTabelIngevuld) {
    lines.push(safeTrim(step4.samenwerkingTabelIngevuld));
    lines.push('');
  } else {
    lines.push('_Geen ingevulde samenwerkingstabel beschikbaar._');
    lines.push('');
  }

  // Kwadrant ingevuld
  lines.push('## 7. Kwadrant – ingevuld (voorbeeld)');
  lines.push('');
  if (step4.kwadrantIngevuld) {
    lines.push(safeTrim(step4.kwadrantIngevuld));
    lines.push('');
  } else {
    lines.push('_Geen ingevuld kwadrant beschikbaar._');
    lines.push('');
  }

  // Reflectie – richtantwoorden
  lines.push('## 8. Reflectie – richtantwoorden');
  lines.push('');
  if (Array.isArray(step4.reflectieAntwoorden) && step4.reflectieAntwoorden.length > 0) {
    step4.reflectieAntwoorden.forEach((ans, i) => {
      lines.push(`**${i + 1}.** ${safeTrim(ans)}`);
      lines.push('');
    });
  } else {
    lines.push('_Geen richtantwoorden voor reflectie beschikbaar._');
    lines.push('');
  }

  // ===== LEERLINGVERSIE =====
  lines.push('# Leerlingversie');
  lines.push('');

  // Inleiding & hoofdvraag
  lines.push('## 1. Inleiding & hoofdvraag');
  lines.push('');
  if (step2.leerlingInleiding) {
    lines.push(safeTrim(step2.leerlingInleiding));
    lines.push('');
  } else {
    lines.push('_Geen leerlinginleiding beschikbaar._');
    lines.push('');
  }

  if (step2.hoofdvraag) {
    lines.push('**Hoofdvraag**  ');
    lines.push(safeTrim(step2.hoofdvraag));
    lines.push('');
  }

  // Bronnen en vragen
  lines.push('## 2. Bronnen en vragen');
  lines.push('');
  if (Array.isArray(step3.bronVragen) && step3.bronVragen.length > 0) {
    step3.bronVragen.forEach((bv) => {
      const nr = bv.bronNummer;
      const src = sources[nr - 1] || {};
      lines.push(`### Bron ${nr}`);
      lines.push('');
      if (src.imageUrl) {
        lines.push(`![Bron ${nr}](${src.imageUrl})`);
        lines.push('');
      }
      if (src.leerlingCaption) {
        lines.push(src.leerlingCaption);
        lines.push('');
      }

      lines.push('1. **Observeren**  ');
      lines.push(safeTrim(bv.observeren));
      lines.push('');
      lines.push('2. **Interpreteren**  ');
      lines.push(safeTrim(bv.interpreteren));
      lines.push('');
      lines.push('3. **Hoofdvraag**  ');
      lines.push(safeTrim(bv.hoofdvraagRelatie));
      lines.push('');
      if (bv.stereotyperingAnalyse) {
        lines.push('4. **Beeldvorming / stereotypering**  ');
        lines.push(safeTrim(bv.stereotyperingAnalyse));
        lines.push('');
      }
    });
  } else {
    lines.push('_Geen bronvragen beschikbaar._');
    lines.push('');
  }

  // Samenwerkingstabel leeg
  lines.push('## 3. Samenwerking in je groep');
  lines.push('');
  if (step3.samenwerkingTabelLeeg) {
    lines.push(safeTrim(step3.samenwerkingTabelLeeg));
    lines.push('');
  } else {
    lines.push('_Geen lege samenwerkingstabel beschikbaar._');
    lines.push('');
  }

  // Kwadrant leeg
  lines.push('## 4. Kwadrant-opdracht');
  lines.push('');
  if (step3.kwadrantLeeg) {
    lines.push(safeTrim(step3.kwadrantLeeg));
    lines.push('');
  } else {
    lines.push('_Geen leeg kwadrant beschikbaar._');
    lines.push('');
  }

  // Reflectie-opdracht
  lines.push('## 5. Reflectie');
  lines.push('');
  if (step3.reflectieOpdracht) {
    lines.push(safeTrim(step3.reflectieOpdracht));
    lines.push('');
  } else {
    lines.push('_Geen reflectie-opdracht beschikbaar._');
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  buildLessonMarkdown,
};


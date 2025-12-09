// backend/prompts/lesgoPrompt.cjs
// Laadt lesgo.masterprompt.md en splitst op [GLOBAL], [STEP1]..[STEP4].

const fs = require('fs');
const path = require('path');

function loadLesgoPrompt() {
  const filePath = path.join(process.cwd(), 'prompts', 'lesgo.masterprompt.md');
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error('[LesGo] Kon prompts/lesgo.masterprompt.md niet lezen:', err.message);
    return {
      GLOBAL: '',
      STEP1: '',
      STEP2: '',
      STEP3: '',
      STEP4: '',
    };
  }

  const sections = {};
  let current = 'GLOBAL';
  sections[current] = '';

  const lines = raw.split('\n');
  for (const line of lines) {
    const match = line.match(/^\[(GLOBAL|STEP1|STEP2|STEP3|STEP4)\]\s*$/);
    if (match) {
      current = match[1];
      if (!sections[current]) sections[current] = '';
    } else {
      sections[current] += line + '\n';
    }
  }

  return sections;
}

const lesgoPrompts = loadLesgoPrompt();

/**
 * Bouwt de systemprompt voor een bepaalde stap.
 * @param {'STEP1'|'STEP2'|'STEP3'|'STEP4'} stepName
 * @returns {string}
 */
function buildSystemPrompt(stepName) {
  const globalPart = lesgoPrompts.GLOBAL || '';
  const stepPart = lesgoPrompts[stepName] || '';
  return `${globalPart}\n\n${stepPart}`.trim();
}

module.exports = {
  lesgoPrompts,
  buildSystemPrompt,
};


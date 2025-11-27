const { token_set_ratio } = require('fuzzball');
const { remove } = require('remove-accents');

const ALIAS_MAP = {
  'karel v': 'karel v',
  'charles v': 'karel v',
  'carlos v': 'karel v',
};

function canon(s) {
  if (!s) return '';
  let str = remove(String(s).toLowerCase());
  str = str.replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim();
  
  const aliased = ALIAS_MAP[str];
  if (aliased) return aliased;
  
  return str;
}

function score(aiLabel, facet, maxCount, ignoreRegex) {
  const normA = canon(aiLabel);
  const normB = canon(facet.label);
  
  if (ignoreRegex && ignoreRegex.test(normB)) {
    return 0;
  }
  
  const sim = token_set_ratio(normA, normB) / 100;
  const starts = normB.startsWith(normA) ? 1.0 : 0;
  const cnt = Math.log10((facet.count || 0) + 1) / Math.log10((maxCount || 1) + 1);
  
  return 0.65 * sim + 0.25 * starts + 0.10 * cnt;
}

module.exports = { canon, score };

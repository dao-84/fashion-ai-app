const bannedKeywords = [
  'nude',
  'nudity',
  'nsfw',
  'sex',
  'sexual',
  'porn',
  'explicit',
  'violent',
  'violence',
  'gore',
  'bloody',
  'weapon',
  'gun',
  'rifle',
  'knife',
  'politic',
  'president',
  'hate',
  'racist',
  'terror',
  'nudo',
  'nudità',
  'violento',
  'violenza',
  'arma',
  'pistola',
  'fucile',
  'coltello',
  'politica',
  'odio',
  'razzista',
];

const minorPatterns = [
  /\bminor\b/i,
  /\bminorenne\b/i,
  /\bunder\s*18\b/i,
  /<\s*18/i,
  /\bchild\b/i,
  /\bchildren\b/i,
  /\bkid\b/i,
  /\bteenager\b/i,
  /\bteen\b/i,
  /\b17\s*(years|yo)?\b/i,
  /\b16\s*(years|yo)?\b/i,
  /\b15\s*(years|yo)?\b/i,
  /\b14\s*(years|yo)?\b/i,
  /\b13\s*(years|yo)?\b/i,
];

function hasBannedKeyword(prompt) {
  return bannedKeywords.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(prompt));
}

function mentionsMinor(prompt) {
  return minorPatterns.some((re) => re.test(prompt));
}

module.exports = {
  hasBannedKeyword,
  mentionsMinor,
};

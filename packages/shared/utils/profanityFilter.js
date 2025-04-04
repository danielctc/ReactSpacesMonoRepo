/**
 * profanityFilter.js
 * 
 * Utility for filtering profanity and inappropriate content from usernames
 * and other user-generated content.
 * 
 * TEMPORARILY DISABLED due to regex error in production.
 */

// Common English profanities and offensive terms
// This is a basic list and should be expanded based on your community needs
const PROFANITY_LIST = [
   'asshole', 'bastard', 'bitch', 'bullshit', 'cock', 'crap', 
  'cunt',  'dick', 'douche', 'fag', 'fuck', 'fucking', 'shit', 
  'slut', 'tits', 'twat', 'whore', 'piss', 'penis', 'pussy', 'vagina',
  'nazi', 'Hitler', 'kike', 'nigger', 'nigga', 'spic', 'chink',
  // Religion-based slurs
  'allah', 'jesus', 'christ',  'goddamn', 'goy', 'jew', 'jihad', 'muslim',
  // Sexual terms
   'blowjob', 'cumshot', 'dildo', 'handjob', 'hentai', 'milf', 'porn',
  // Disability/medical slurs
  'retard', 'retarded', 'tard', 'aids', 'autistic', 'schizo',
  // Additional racial/ethnic slurs
  'beaner', 'coon', 'dyke', 'gook', 'gringo', 'jap', 'negro', 'paki', 'wetback',
  // Common compound words or phrases
  'fcuk', 'fuk', 'f*ck', 'f**k', 'a$$', 'a$$hole', 's**t', 'sh*t', 'b*tch',
  // Additional common profanities
   'damn', 'hoe', 'skank', 'stfu', 'wtf',
  // Harmful content
  'suicide', 'terrorist', 'kkk', 'rape', 'rapist',
];

// List of common deliberate character substitutions to catch
const SUBSTITUTIONS = {
  'a': ['@', '4', 'â', 'á', 'à', 'ä', 'å', 'α'],
  'b': ['8', '6', 'ß', 'Б', 'б'],
  'e': ['3', '€', 'ë', 'ê', 'é', 'è', 'ε'],
  'i': ['1', '!', '|', 'ï', 'î', 'í', 'ì', 'ι'],
  'l': ['1', '|', 'ł', 'λ'],
  'o': ['0', 'ö', 'ô', 'ò', 'ó', 'ø', 'ο'],
  's': ['5', '$', 'ś', 'š'],
  't': ['7', '+'],
  'u': ['µ', 'ü', 'û', 'ú', 'ù'],
  'v': ['\\/', '√'],
  'x': ['×', '✗'],
  'z': ['2'],
  // Additional substitutions
  'c': ['(', '{', '[', '<', 'ç', 'ć', 'č'],
  'k': ['к'],
  'n': ['η', 'ñ'],
  'p': ['р'],
  'w': ['ш', 'ω'],
  'y': ['ý', 'ÿ', 'у'],
};

/**
 * Escapes special regex characters in a string
 * @param {string} string - The string to escape
 * @returns {string} - Escaped string safe for regex
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

/**
 * Normalizes text to make evasion techniques detectable
 * @param {string} text - The text to normalize
 * @returns {string} - Normalized text
 */
const normalizeText = (text) => {
  if (!text) return '';
  
  // Convert to lowercase
  let normalized = text.toLowerCase();
  
  // Remove symbols, spaces and numbers
  normalized = normalized.replace(/[\s_\-\.]/g, '');
  
  // Replace common character substitutions
  for (const [char, substitutes] of Object.entries(SUBSTITUTIONS)) {
    const pattern = new RegExp(`[${substitutes.join('')}]`, 'g');
    normalized = normalized.replace(pattern, char);
  }
  
  return normalized;
};

/**
 * Checks if a string contains profanity
 * @param {string} text - The text to check
 * @returns {boolean} - True if profanity is found
 */
const containsProfanity = (text) => {
  // TEMPORARILY DISABLED: returning false for all inputs
  return false;
  
  /*
  if (!text) return false;
  
  const normalizedText = normalizeText(text);
  
  // Check if the text contains any profanity from our list
  for (const word of PROFANITY_LIST) {
    if (normalizedText.includes(word)) {
      return true;
    }
  }
  
  // The previous regex had an issue with special characters. 
  // Fixed approach with properly escaped terms:
  const escapedTerms = PROFANITY_LIST.map(term => escapeRegExp(term));
  const profanityPattern = new RegExp(`(^|[^a-z])(${escapedTerms.join('|')})($|[^a-z])`, 'i');
  return profanityPattern.test(normalizedText);
  */
};

/**
 * Validates a username for profanity and returns true if valid
 * @param {string} username - The username to validate
 * @returns {boolean} - True if the username is safe (no profanity)
 */
const isUsernameSafe = (username) => {
  // TEMPORARILY DISABLED: Always return true to allow registration to proceed
  return true;
  
  // When re-enabling, use this:
  // return !containsProfanity(username);
};

export {
  isUsernameSafe,
  containsProfanity,
  normalizeText,
  escapeRegExp,
  PROFANITY_LIST
}; 
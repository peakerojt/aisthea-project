const SEARCH_SPACING_PATTERN = /\s+/g;
const DIACRITIC_PATTERN = /[\u0300-\u036f]/g;
const SEARCH_TOKEN_STOP_WORDS = new Set([
  'cho',
  'cua',
  'của',
  'voi',
  'với',
  'va',
  'và',
  'la',
  'là',
  'de',
  'để',
  'toi',
  'tôi',
  'muon',
  'muốn',
  'can',
  'cần',
  'tim',
  'tìm',
  'mua',
  'shop',
]);

export const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(DIACRITIC_PATTERN, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'd')
    .toLowerCase()
    .replace(SEARCH_SPACING_PATTERN, ' ')
    .trim();

const toSearchTokens = (value: string): string[] =>
  normalizeSearchText(value)
    .split(' ')
    .filter((token) => token && !SEARCH_TOKEN_STOP_WORDS.has(token));

export const matchesSearchQuery = (
  query: string,
  candidates: Array<string | null | undefined>,
): boolean => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const normalizedCandidates = candidates.map((candidate) => normalizeSearchText(candidate ?? ''));

  if (normalizedCandidates.some((candidate) => candidate.includes(normalizedQuery))) {
    return true;
  }

  const queryTokens = toSearchTokens(query);
  if (queryTokens.length === 0) {
    return true;
  }

  const haystack = normalizedCandidates.join(' ');
  return queryTokens.every((token) => haystack.includes(token));
};

const SEARCH_SPACING_PATTERN = /\s+/g;
const DIACRITIC_PATTERN = /[\u0300-\u036f]/g;

export const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(DIACRITIC_PATTERN, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'd')
    .toLowerCase()
    .replace(SEARCH_SPACING_PATTERN, ' ')
    .trim();

export const matchesSearchQuery = (
  query: string,
  candidates: Array<string | null | undefined>,
): boolean => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return candidates.some((candidate) =>
    normalizeSearchText(candidate ?? '').includes(normalizedQuery),
  );
};

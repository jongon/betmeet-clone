function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchesFlexibleSearch(query: string, ...values: string[]): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchValue(values.join(" "));
  return normalizedQuery.split(/\s+/).every((token) => haystack.includes(token));
}

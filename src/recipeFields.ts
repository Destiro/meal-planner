/** "Quick, #Vegetarian , quick" becomes ['quick', 'vegetarian']. */
export function parseTags(text: string): string[] {
  const tags = text
    .split(',')
    .map((t) => t.trim().replace(/^#+/, '').toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

/**
 * Cleans up a pasted link. Adds https:// when there is no scheme.
 * Returns undefined for empty or unusable input (only http and https links with a real host are kept).
 */
export function normalizeUrl(text: string): string | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  return /^https?:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/i.test(url) ? url : undefined;
}

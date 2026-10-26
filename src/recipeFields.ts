import { Recipe } from './types';

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

/**
 * Recipes matching `query` and, if given, carrying `tag` and (with `favouritesOnly`) marked as favourites.
 * Every word you type must appear somewhere in the recipe's name, ingredients or tags (any case, partial
 * words are fine).
 */
export function searchRecipes(
  recipes: Recipe[],
  query: string,
  tag: string | null = null,
  favouritesOnly = false,
): Recipe[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return recipes.filter((recipe) => {
    if (tag && !recipe.tags?.includes(tag)) return false;
    if (favouritesOnly && !recipe.favourite) return false;
    if (terms.length === 0) return true;
    const haystack = [recipe.name, ...recipe.ingredients.map((i) => i.name), ...(recipe.tags ?? [])]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** The same recipes with favourites first. Otherwise the order is kept as it was. */
export function favouritesFirst(recipes: Recipe[]): Recipe[] {
  return [...recipes.filter((r) => r.favourite), ...recipes.filter((r) => !r.favourite)];
}

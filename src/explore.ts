import { formatQuantity, parseIngredient } from './ingredients';
import { DEFAULT_SERVINGS } from './migrate';
import { normalizeUrl, parseTags } from './recipeFields';
import { RecipeInput } from './store';

export interface ExploreIngredient {
  name: string;
  amount?: number;
  unit?: string;
}

/** A recipe from the online service, shaped by the Worker (see worker/src/index.ts). */
export interface ExploreRecipe {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  /** The site the recipe originally came from, which we have to credit. */
  sourceName?: string;
  sourceUrl?: string;
  /** The recipe's page on spoonacular itself. */
  spoonacularSourceUrl?: string;
  diets: string[];
  dishTypes: string[];
  ingredients: ExploreIngredient[];
  steps: string[];
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
const positive = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.flatMap((v) => text(v) ?? []) : [];

/** Reads one recipe from the Worker's reply. Returns null if it has no id or title. */
export function parseExploreRecipe(raw: unknown): ExploreRecipe | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const title = text(r.title);
  if (typeof r.id !== 'number' || !title) return null;

  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : []).flatMap((i): ExploreIngredient[] => {
    const name = text((i as Record<string, unknown> | null)?.name);
    if (!name) return [];
    const { amount, unit } = i as Record<string, unknown>;
    return [{ name, amount: positive(amount), unit: text(unit) }];
  });

  return {
    id: r.id,
    title,
    image: text(r.image),
    readyInMinutes: positive(r.readyInMinutes),
    servings: positive(r.servings),
    sourceName: text(r.sourceName),
    sourceUrl: normalizeUrl(text(r.sourceUrl) ?? ''),
    spoonacularSourceUrl: normalizeUrl(text(r.spoonacularSourceUrl) ?? ''),
    diets: strings(r.diets),
    dishTypes: strings(r.dishTypes),
    ingredients,
    steps: strings(r.steps),
  };
}

/** Reads the Worker's `{ recipes: [...] }` reply, skipping anything unusable. */
export function parseExploreResponse(raw: unknown): ExploreRecipe[] {
  const recipes = (raw as { recipes?: unknown } | null)?.recipes;
  return (Array.isArray(recipes) ? recipes : []).flatMap((r) => parseExploreRecipe(r) ?? []);
}

/** "2 tbsp olive oil", written so parseIngredient can read it back. */
export function ingredientLine({ amount, unit, name }: ExploreIngredient): string {
  return [amount ? formatQuantity(amount) : '', unit ?? '', name].filter(Boolean).join(' ');
}

/** Where the recipe really came from: the original site if known, otherwise spoonacular's page. */
export function creditFor(recipe: ExploreRecipe): { label: string; url?: string } {
  if (recipe.sourceName || recipe.sourceUrl) {
    return { label: recipe.sourceName ?? recipe.sourceUrl ?? '', url: recipe.sourceUrl };
  }
  return { label: 'spoonacular', url: recipe.spoonacularSourceUrl };
}

const MAX_TAGS = 4;

/** A starting point for the Add Recipe form. You review and edit it before it is saved. */
export function toRecipeInput(recipe: ExploreRecipe): RecipeInput {
  const credit = creditFor(recipe);
  return {
    name: recipe.title,
    servings: recipe.servings ?? DEFAULT_SERVINGS,
    ingredients: recipe.ingredients.map((i) => parseIngredient(ingredientLine(i))),
    notes: recipe.steps.length ? recipe.steps.map((step, i) => `${i + 1}. ${step}`).join('\n') : undefined,
    sourceUrl: credit.url,
    tags: parseTags([...recipe.diets, ...recipe.dishTypes.slice(0, 1)].join(',')).slice(0, MAX_TAGS),
    photo: recipe.image,
  };
}

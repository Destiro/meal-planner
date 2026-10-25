import { parseIngredient } from './ingredients';
import { MealPlan, Recipe, Settings } from './types';

/** Bump when the saved shape changes, and teach `migrate` how to upgrade the old one. */
export const DATA_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = { household: 2 };
export const DEFAULT_SERVINGS = 2;

export interface StoredData {
  version: number;
  recipes: Recipe[];
  plan: MealPlan;
  settings: Settings;
}

/** Brings anything we have ever saved up to the current shape. Throws if it isn't recognisable. */
export function migrate(raw: unknown): StoredData {
  if (typeof raw !== 'object' || raw === null) throw new Error('Saved data is not an object');
  const data = raw as Record<string, unknown>;
  const version = typeof data.version === 'number' ? data.version : 1;
  if (version > DATA_VERSION) throw new Error(`Saved data is from a newer app version (${version})`);

  const recipes = Array.isArray(data.recipes) ? data.recipes : [];
  const plan = typeof data.plan === 'object' && data.plan !== null ? (data.plan as MealPlan) : {};

  return {
    version: DATA_VERSION,
    // v1 stored ingredients as plain strings.
    recipes: recipes.map((r) => ({
      ...r,
      servings: typeof r.servings === 'number' && r.servings > 0 ? r.servings : DEFAULT_SERVINGS,
      ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map((i: unknown) =>
        typeof i === 'string' ? parseIngredient(i) : i,
      ),
    })),
    plan,
    settings: { ...DEFAULT_SETTINGS, ...(typeof data.settings === 'object' ? (data.settings as object) : {}) },
  };
}

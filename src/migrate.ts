import { parseIngredient } from './ingredients';
import { DEFAULT_SLOTS, isValidSlots } from './slots';
import { MealPlan, Recipe, Settings, ShoppingEdits } from './types';

/** Bump when the saved shape changes, and teach `migrate` how to upgrade the old one. */
export const DATA_VERSION = 3;

export const DEFAULT_SETTINGS: Settings = { household: 2, groupByAisle: true, mealSlots: DEFAULT_SLOTS };
export const DEFAULT_SERVINGS = 2;

export interface StoredData {
  version: number;
  recipes: Recipe[];
  plan: MealPlan;
  settings: Settings;
  /** Added in v3: hand edits and ticks on each week's shopping list. */
  shoppingEdits: ShoppingEdits;
}

/** Brings anything we have ever saved up to the current shape. Throws if it isn't recognisable. */
export function migrate(raw: unknown): StoredData {
  if (typeof raw !== 'object' || raw === null) throw new Error('Saved data is not an object');
  const data = raw as Record<string, unknown>;
  const version = typeof data.version === 'number' ? data.version : 1;
  if (version > DATA_VERSION) throw new Error(`Saved data is from a newer app version (${version})`);

  const recipes = Array.isArray(data.recipes) ? data.recipes : [];
  const plan = typeof data.plan === 'object' && data.plan !== null ? (data.plan as MealPlan) : {};

  const saved = typeof data.settings === 'object' && data.settings !== null ? (data.settings as Partial<Settings>) : {};
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...saved,
    mealSlots: isValidSlots(saved.mealSlots) ? saved.mealSlots : DEFAULT_SLOTS,
  };

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
    settings,
    shoppingEdits:
      typeof data.shoppingEdits === 'object' && data.shoppingEdits !== null && !Array.isArray(data.shoppingEdits)
        ? (data.shoppingEdits as ShoppingEdits)
        : {},
  };
}

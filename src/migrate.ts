import { parseIngredient } from './ingredients';
import { DEFAULT_SLOTS, isValidSlots } from './slots';
import { MealPlan, PantryItem, Recipe, Settings, ShoppingEdits } from './types';

/** Bump when the saved shape changes, and teach `migrate` how to upgrade the old one. */
export const DATA_VERSION = 5;

/**
 * Before v5, an amount you changed by hand on a line from your recipes was saved as a fixed number, so the line
 * stopped following the recipes (4 stir-fries, 8 broccoli reduced to 7, still 7 after changing Cooking for).
 * Those old changes are now made to follow the recipes again. Your names stay; the amount is whatever the recipes
 * need, because there is no record of what they needed when you made the change.
 */
export function unfreezeOverrides(edits: ShoppingEdits): ShoppingEdits {
  return Object.fromEntries(
    Object.entries(edits).map(([weekKey, week]) => {
      if (typeof week !== 'object' || week === null || typeof week.overrides !== 'object' || week.overrides === null) {
        return [weekKey, week];
      }
      const overrides = Object.fromEntries(
        Object.entries(week.overrides).map(([key, o]) => [key, o && o.base === undefined ? { ...o, base: o.quantity } : o]),
      );
      return [weekKey, { ...week, overrides }];
    }),
  );
}

export const DEFAULT_SETTINGS: Settings = { household: 2, groupByAisle: true, mealSlots: DEFAULT_SLOTS };
export const DEFAULT_SERVINGS = 2;

export interface StoredData {
  version: number;
  recipes: Recipe[];
  plan: MealPlan;
  settings: Settings;
  /** Added in v3: hand edits and ticks on each week's shopping list. */
  shoppingEdits: ShoppingEdits;
  /** Added in v4: what you already have at home. */
  pantry: PantryItem[];
}

/** The saved shopping edits, upgraded from `version`. Anything unusable becomes "no edits". */
function shoppingEdits(raw: unknown, version: number): ShoppingEdits {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  return version < 5 ? unfreezeOverrides(raw as ShoppingEdits) : (raw as ShoppingEdits);
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
    shoppingEdits: shoppingEdits(data.shoppingEdits, version),
    pantry: Array.isArray(data.pantry)
      ? data.pantry.filter((p): p is PantryItem => typeof p?.id === 'string' && typeof p?.name === 'string')
      : [],
  };
}

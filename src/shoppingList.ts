import { applyPantry } from './pantry';
import { buildShoppingList, ShoppingItem } from './shopping';
import { applyEdits, EMPTY_WEEK, ListRow } from './shoppingEdits';
import { MealPlan, PantryItem, Recipe, Settings, ShoppingEdits } from './types';

export interface ShoppingInputs {
  recipes: Recipe[];
  plan: MealPlan;
  settings: Settings;
  pantry: PantryItem[];
  edits: ShoppingEdits;
}

/**
 * Everything on the shopping list for the week starting `weekStart`, in the order it is worked out:
 * what the planned meals need, minus what is in the pantry, with hand edits applied on top.
 * `needed` is the list before hand edits, which the screen uses to count removed items.
 */
export function shoppingRows(
  { recipes, plan, settings, pantry, edits }: ShoppingInputs,
  weekKey: string,
  weekStart: Date,
): { rows: ListRow[]; needed: ShoppingItem[]; covered: number } {
  const planned = buildShoppingList(
    recipes,
    plan,
    weekStart,
    settings.household,
    settings.mealSlots.map((slot) => slot.id),
  );
  const { items: needed, covered } = applyPantry(planned, pantry);
  return { rows: applyEdits(needed, edits[weekKey] ?? EMPTY_WEEK), needed, covered };
}

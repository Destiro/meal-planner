import { Aisle, AISLES, aisleFor, matchKey } from './aisles';
import { addDays, toKey } from './dates';
import { formatAmount, toBaseUnit } from './ingredients';
import { MealPlan, Recipe } from './types';

export interface ShoppingItem {
  /** As first written in a recipe, e.g. "tomatoes". */
  name: string;
  /** Total to buy. For items without a unit this is a count, e.g. 3 eggs. */
  quantity: number;
  /** '' for plain counts. */
  unit: string;
  aisle: Aisle;
}

/** Stable id for an item: the same ingredient in different units is listed separately. */
export const itemKey = (item: ShoppingItem) => `${matchKey(item.name)}|${item.unit}`;

const byName = (a: ShoppingItem, b: ShoppingItem) => a.name.localeCompare(b.name) || a.unit.localeCompare(b.unit);

/**
 * Ingredients for every meal planned in the 7 days starting at `weekStart`, merged by name and unit
 * ("tomato" and "Tomatoes" are one item). Quantities are scaled from each recipe's servings to
 * `household` people. An ingredient with no quantity (like "salt") counts as one each time it
 * appears and isn't scaled. Meals in slots not listed in `slotIds` (when given) are skipped. Sorted by name.
 */
export function buildShoppingList(
  recipes: Recipe[],
  plan: MealPlan,
  weekStart: Date,
  household: number,
  slotIds?: string[],
): ShoppingItem[] {
  const totals = new Map<string, ShoppingItem>();
  for (let i = 0; i < 7; i++) {
    const day = plan[toKey(addDays(weekStart, i))];
    if (!day) continue;
    for (const [slotId, recipeId] of Object.entries(day)) {
      if (slotIds && !slotIds.includes(slotId)) continue;
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) continue;
      const scale = recipe.servings > 0 ? household / recipe.servings : 1;
      for (const ing of recipe.ingredients) {
        const name = ing.name.toLowerCase();
        const { quantity, unit } =
          ing.quantity === undefined
            ? { quantity: 1, unit: '' }
            : toBaseUnit(ing.quantity * scale, ing.unit ?? '');
        const item: ShoppingItem = { name, quantity, unit, aisle: aisleFor(name) };
        const existing = totals.get(itemKey(item));
        if (existing) existing.quantity += quantity;
        else totals.set(itemKey(item), item);
      }
    }
  }
  return [...totals.values()].sort(byName);
}

export interface AisleSection {
  aisle: Aisle;
  data: ShoppingItem[];
}

/** Splits items into aisles (in walking order), leaving out aisles with nothing in them. */
export function groupByAisle(items: ShoppingItem[]): AisleSection[] {
  return AISLES.map((aisle) => ({ aisle, data: items.filter((i) => i.aisle === aisle).sort(byName) })).filter(
    (section) => section.data.length > 0,
  );
}

/** "200 g", "3 cups", "×2", or '' when there is nothing worth showing. */
export const formatItemAmount = (item: ShoppingItem) => formatAmount(item.quantity, item.unit);

/** Plain-text version of the list, suitable for pasting into a messaging app or notes. */
export function formatShoppingText(items: ShoppingItem[], title: string): string {
  const lines = items.map((item) => {
    const amount = formatItemAmount(item);
    return `• ${item.name}${amount ? ` ${amount}` : ''}`;
  });
  return [title, ...lines].join('\n');
}

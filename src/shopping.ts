import { addDays, toKey } from './dates';
import { MealPlan, Recipe } from './types';

export interface ShoppingItem {
  name: string;
  count: number;
}

/** Ingredients for every meal planned in the 7 days starting at `weekStart`, merged by name. */
export function buildShoppingList(recipes: Recipe[], plan: MealPlan, weekStart: Date): ShoppingItem[] {
  const counts = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const day = plan[toKey(addDays(weekStart, i))];
    if (!day) continue;
    for (const recipeId of Object.values(day)) {
      const recipe = recipes.find((r) => r.id === recipeId);
      recipe?.ingredients.forEach((ing) => {
        const name = ing.toLowerCase();
        counts.set(name, (counts.get(name) ?? 0) + 1);
      });
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

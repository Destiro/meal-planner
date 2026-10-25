import { buildShoppingList } from '../shopping';
import { MealPlan, Recipe } from '../types';

const recipes: Recipe[] = [
  { id: 'a', name: 'A', ingredients: ['Rice', 'Tofu'] },
  { id: 'b', name: 'B', ingredients: ['rice', 'Egg'] },
];
const monday = new Date(2026, 9, 12);

describe('buildShoppingList', () => {
  it('merges ingredients across meals, ignoring case, sorted by name', () => {
    const plan: MealPlan = { '2026-10-12': { lunch: 'a' }, '2026-10-14': { dinner: 'b' } };
    expect(buildShoppingList(recipes, plan, monday)).toEqual([
      { name: 'egg', count: 1 },
      { name: 'rice', count: 2 },
      { name: 'tofu', count: 1 },
    ]);
  });

  it('only includes the requested week', () => {
    const plan: MealPlan = { '2026-10-11': { lunch: 'a' }, '2026-10-19': { lunch: 'b' } };
    expect(buildShoppingList(recipes, plan, monday)).toEqual([]);
  });

  it('ignores meals whose recipe no longer exists', () => {
    expect(buildShoppingList(recipes, { '2026-10-12': { lunch: 'gone' } }, monday)).toEqual([]);
  });
});

import { buildShoppingList, formatItemAmount, formatShoppingText } from '../shopping';
import { MealPlan, Recipe } from '../types';

const recipes: Recipe[] = [
  { id: 'a', name: 'A', servings: 2, ingredients: [{ name: 'Rice', quantity: 200, unit: 'g' }, { name: 'Tofu' }] },
  { id: 'b', name: 'B', servings: 2, ingredients: [{ name: 'rice', quantity: 0.5, unit: 'kg' }, { name: 'Egg', quantity: 2 }] },
];
const monday = new Date(2026, 9, 12);
const meals: MealPlan = { '2026-10-12': { lunch: 'a' }, '2026-10-14': { dinner: 'b' } };

describe('buildShoppingList', () => {
  it('adds up amounts across meals, ignoring case and converting kg to g', () => {
    expect(buildShoppingList(recipes, meals, monday, 2)).toEqual([
      { name: 'egg', quantity: 2, unit: '' },
      { name: 'rice', quantity: 700, unit: 'g' },
      { name: 'tofu', quantity: 1, unit: '' },
    ]);
  });

  it('scales quantities to the household size but leaves unmeasured items alone', () => {
    const list = buildShoppingList(recipes, { '2026-10-12': { lunch: 'a' } }, monday, 4);
    expect(list).toContainEqual({ name: 'rice', quantity: 400, unit: 'g' });
    expect(list).toContainEqual({ name: 'tofu', quantity: 1, unit: '' });
  });

  it('counts an ingredient without a quantity once per meal', () => {
    const plan: MealPlan = { '2026-10-12': { lunch: 'a', dinner: 'a' } };
    expect(buildShoppingList(recipes, plan, monday, 2)).toContainEqual({ name: 'tofu', quantity: 2, unit: '' });
  });

  it('keeps different units of the same ingredient apart', () => {
    const mixed: Recipe[] = [
      {
        id: 'c',
        name: 'C',
        servings: 1,
        ingredients: [
          { name: 'milk', quantity: 1, unit: 'cup' },
          { name: 'milk', quantity: 200, unit: 'ml' },
        ],
      },
    ];
    expect(buildShoppingList(mixed, { '2026-10-12': { lunch: 'c' } }, monday, 1)).toHaveLength(2);
  });

  it('only includes the requested week', () => {
    const plan: MealPlan = { '2026-10-11': { lunch: 'a' }, '2026-10-19': { lunch: 'b' } };
    expect(buildShoppingList(recipes, plan, monday, 2)).toEqual([]);
  });

  it('ignores meals whose recipe no longer exists', () => {
    expect(buildShoppingList(recipes, { '2026-10-12': { lunch: 'gone' } }, monday, 2)).toEqual([]);
  });
});

describe('formatItemAmount', () => {
  it('shows large weights and volumes in kg and l', () => {
    expect(formatItemAmount({ name: 'rice', quantity: 1500, unit: 'g' })).toBe('1.5 kg');
    expect(formatItemAmount({ name: 'milk', quantity: 2000, unit: 'ml' })).toBe('2 l');
  });

  it('shows counts, and nothing for a single unmeasured item', () => {
    expect(formatItemAmount({ name: 'egg', quantity: 6, unit: '' })).toBe('×6');
    expect(formatItemAmount({ name: 'tofu', quantity: 1, unit: '' })).toBe('');
  });
});

describe('formatShoppingText', () => {
  it('writes a title followed by one bullet per item', () => {
    expect(
      formatShoppingText(
        [
          { name: 'rice', quantity: 700, unit: 'g' },
          { name: 'tofu', quantity: 1, unit: '' },
        ],
        'Shopping list',
      ),
    ).toBe('Shopping list\n• rice 700 g\n• tofu');
  });
});

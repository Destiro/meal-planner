import { buildShoppingList, formatItemAmount, formatShoppingText, groupByAisle, ShoppingItem } from '../shopping';
import { MealPlan, Recipe } from '../types';

const recipes: Recipe[] = [
  { id: 'a', name: 'A', servings: 2, ingredients: [{ name: 'Rice', quantity: 200, unit: 'g' }, { name: 'Tofu' }] },
  { id: 'b', name: 'B', servings: 2, ingredients: [{ name: 'rice', quantity: 0.5, unit: 'kg' }, { name: 'Egg', quantity: 2 }] },
];
const monday = new Date(2026, 9, 12);
const meals: MealPlan = { '2026-10-12': { lunch: 'a' }, '2026-10-14': { dinner: 'b' } };

const item = (name: string, quantity: number, unit = '', aisle: ShoppingItem['aisle'] = 'Other'): ShoppingItem => ({
  name,
  quantity,
  unit,
  aisle,
});

describe('buildShoppingList', () => {
  it('adds up amounts across meals, ignoring case and converting kg to g', () => {
    expect(buildShoppingList(recipes, meals, monday, 2)).toEqual([
      item('egg', 2, '', 'Dairy & chilled'),
      item('rice', 700, 'g', 'Pantry'),
      item('tofu', 1, '', 'Dairy & chilled'),
    ]);
  });

  it('treats singular and plural names as the same ingredient', () => {
    const veg: Recipe[] = [
      { id: 'v', name: 'V', servings: 1, ingredients: [{ name: 'tomato', quantity: 2 }, { name: 'Tomatoes', quantity: 3 }] },
    ];
    expect(buildShoppingList(veg, { '2026-10-12': { lunch: 'v' } }, monday, 1)).toEqual([
      item('tomato', 5, '', 'Produce'),
    ]);
  });

  it('scales quantities to the household size but leaves unmeasured items alone', () => {
    const list = buildShoppingList(recipes, { '2026-10-12': { lunch: 'a' } }, monday, 4);
    expect(list).toContainEqual(item('rice', 400, 'g', 'Pantry'));
    expect(list).toContainEqual(item('tofu', 1, '', 'Dairy & chilled'));
  });

  it('counts an ingredient without a quantity once per meal', () => {
    const plan: MealPlan = { '2026-10-12': { lunch: 'a', dinner: 'a' } };
    expect(buildShoppingList(recipes, plan, monday, 2)).toContainEqual(item('tofu', 2, '', 'Dairy & chilled'));
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

  it('skips meals in slots that are no longer used', () => {
    const plan: MealPlan = { '2026-10-12': { lunch: 'a', snack: 'b' } };
    const names = buildShoppingList(recipes, plan, monday, 2, ['lunch']).map((i) => i.name);
    expect(names).toEqual(['rice', 'tofu']);
  });

  it('ignores meals whose recipe no longer exists', () => {
    expect(buildShoppingList(recipes, { '2026-10-12': { lunch: 'gone' } }, monday, 2)).toEqual([]);
  });
});

describe('groupByAisle', () => {
  it('orders aisles as you walk the shop, sorts within them and skips empty ones', () => {
    const sections = groupByAisle([
      item('rice', 1, '', 'Pantry'),
      item('tomato', 1, '', 'Produce'),
      item('apple', 1, '', 'Produce'),
    ]);
    expect(sections.map((s) => s.aisle)).toEqual(['Produce', 'Pantry']);
    expect(sections[0].data.map((i) => i.name)).toEqual(['apple', 'tomato']);
  });
});

describe('formatItemAmount', () => {
  it('shows large weights and volumes in kg and l', () => {
    expect(formatItemAmount(item('rice', 1500, 'g'))).toBe('1.5 kg');
    expect(formatItemAmount(item('milk', 2000, 'ml'))).toBe('2 l');
  });

  it('shows counts, and nothing for a single unmeasured item', () => {
    expect(formatItemAmount(item('egg', 6))).toBe('×6');
    expect(formatItemAmount(item('tofu', 1))).toBe('');
  });
});

describe('formatShoppingText', () => {
  it('writes a title followed by one bullet per item', () => {
    expect(formatShoppingText([item('rice', 700, 'g'), item('tofu', 1)], 'Shopping list')).toBe(
      'Shopping list\n• rice 700 g\n• tofu',
    );
  });
});

import { parsePantryBlock, parsePlanBlock, parseRecipeBlock, parseReply, planToMeals } from '../chatFormat';
import { Recipe } from '../types';

const SOUP = `[[RECIPE]]
Title: Lentil soup
Serves: 4
Ingredients:
- 200 g red lentils
- 1 onion
- 2 tbsp olive oil
Method:
1. Chop the onion and soften it in the oil.
2. Add the lentils and water and simmer for 25 minutes.
[[/RECIPE]]`;

describe('parseRecipeBlock', () => {
  it('reads title, servings, ingredients and numbered method', () => {
    const recipe = parseRecipeBlock(SOUP.replace(/\[\[\/?RECIPE\]\]/g, ''))!;
    expect(recipe).toEqual({
      name: 'Lentil soup',
      servings: 4,
      ingredients: [
        { name: 'red lentils', quantity: 200, unit: 'g' },
        { name: 'onion', quantity: 1 },
        { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      ],
      notes: '1. Chop the onion and soften it in the oil.\n2. Add the lentils and water and simmer for 25 minutes.',
    });
  });

  it('copes with markdown, odd bullets, extra fields and a missing servings line', () => {
    const recipe = parseRecipeBlock(`**Title:** Egg fried rice
Time: 15 minutes
**Ingredients:**
* 2 cups cooked rice
• 2 eggs
**Method:**
1) Scramble the eggs.
2) Fry the rice.`)!;
    expect(recipe.name).toBe('Egg fried rice');
    expect(recipe.servings).toBe(2);
    expect(recipe.ingredients.map((i) => i.name)).toEqual(['cooked rice', 'eggs']);
    expect(recipe.notes).toBe('1. Scramble the eggs.\n2. Fry the rice.');
  });

  it('gives up on blocks with no title or no content', () => {
    expect(parseRecipeBlock('Ingredients:\n- rice')).toBeNull();
    expect(parseRecipeBlock('Title: Empty')).toBeNull();
  });
});

describe('parsePlanBlock', () => {
  it('reads Day | Meal | Recipe lines and skips the rest', () => {
    expect(parsePlanBlock('Monday | Dinner | Veggie stir fry\n- Tuesday | Lunch | Wrap\nnot a line\nWed | | x')).toEqual([
      { day: 'Monday', meal: 'Dinner', recipe: 'Veggie stir fry' },
      { day: 'Tuesday', meal: 'Lunch', recipe: 'Wrap' },
    ]);
  });
});

describe('parseReply', () => {
  it('splits text, recipe and plan, keeping their order', () => {
    const segments = parseReply(`Here you go!\n\n${SOUP}\n\nAnd a plan:\n[[PLAN]]\nMonday | Dinner | Lentil soup\n[[/PLAN]]\nEnjoy.`);
    expect(segments.map((s) => s.kind)).toEqual(['text', 'recipe', 'text', 'plan', 'text']);
    expect(segments[0]).toEqual({ kind: 'text', text: 'Here you go!' });
    expect(segments[4]).toEqual({ kind: 'text', text: 'Enjoy.' });
  });

  it('returns plain text unchanged apart from stray markdown', () => {
    expect(parseReply('Try **fresh** basil.')).toEqual([{ kind: 'text', text: 'Try fresh basil.' }]);
    expect(parseReply('   ')).toEqual([]);
  });

  it('treats a block with no closing marker as running to the end', () => {
    const segments = parseReply('Sure:\n[[RECIPE]]\nTitle: Toast\nIngredients:\n- 2 slices bread\nMethod:\n1. Toast it.');
    expect(segments.map((s) => s.kind)).toEqual(['text', 'recipe']);
  });

  it('keeps an unreadable block as text instead of losing it', () => {
    const segments = parseReply('[[RECIPE]]\nsomething odd\n[[/RECIPE]]');
    expect(segments).toEqual([{ kind: 'text', text: 'something odd' }]);
  });

  it('accepts lower-case markers', () => {
    expect(parseReply('[[plan]]\nMon | Lunch | A\n[[/plan]]')[0].kind).toBe('plan');
  });
});

describe('planToMeals', () => {
  const recipes: Recipe[] = [
    { id: 'r1', name: 'Veggie stir fry', servings: 2, ingredients: [] },
    { id: 'r2', name: 'Chicken salad wrap', servings: 2, ingredients: [] },
  ];
  const slots = [
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
  ];
  const monday = new Date(2026, 9, 26);

  it('maps days to the given week and matches names and meals loosely', () => {
    const { meals, skipped } = planToMeals(
      [
        { day: 'Monday', meal: 'dinner', recipe: 'veggie stir-fry' },
        { day: 'Sun', meal: 'Lunch', recipe: 'Chicken Salad Wrap' },
      ],
      recipes,
      slots,
      monday,
    );
    expect(skipped).toEqual([]);
    expect(meals).toEqual([
      { dateKey: '2026-10-26', slotId: 'dinner', recipeId: 'r1', recipeName: 'Veggie stir fry' },
      { dateKey: '2026-11-01', slotId: 'lunch', recipeId: 'r2', recipeName: 'Chicken salad wrap' },
    ]);
  });

  it('skips unknown recipes, meals you do not plan and unreadable days', () => {
    const entries = [
      { day: 'Monday', meal: 'Dinner', recipe: 'Mystery stew' },
      { day: 'Monday', meal: 'Breakfast', recipe: 'Veggie stir fry' },
      { day: 'Someday', meal: 'Dinner', recipe: 'Veggie stir fry' },
    ];
    const { meals, skipped } = planToMeals(entries, recipes, slots, monday);
    expect(meals).toEqual([]);
    expect(skipped).toEqual(entries);
  });
});

describe('pantry blocks', () => {
  it('reads Add and Remove lines and ignores anything else', () => {
    expect(parsePantryBlock('Add | 500 g rice\n- add | 6 eggs\nRemove | milk\nBuy | bread\nAdd |\nnonsense')).toEqual([
      { action: 'add', text: '500 g rice' },
      { action: 'add', text: '6 eggs' },
      { action: 'remove', text: 'milk' },
    ]);
  });

  it('becomes a pantry segment in a reply', () => {
    const segments = parseReply('Done!\n[[PANTRY]]\nAdd | 500 g rice\n[[/PANTRY]]');
    expect(segments.map((s) => s.kind)).toEqual(['text', 'pantry']);
    expect(segments[1]).toEqual({ kind: 'pantry', actions: [{ action: 'add', text: '500 g rice' }] });
  });
});

describe('shopping blocks', () => {
  it('become a shopping segment, separate from the pantry', () => {
    const segments = parseReply('Sure.\n[[SHOPPING]]\nAdd | sunblock\nRemove | milk\n[[/SHOPPING]]');
    expect(segments.map((s) => s.kind)).toEqual(['text', 'shopping']);
    expect(segments[1]).toEqual({
      kind: 'shopping',
      actions: [
        { action: 'add', text: 'sunblock' },
        { action: 'remove', text: 'milk' },
      ],
    });
  });

  it('keeps a reply with both a pantry and a shopping block in order', () => {
    const reply = '[[PANTRY]]\nAdd | rice\n[[/PANTRY]]\n[[SHOPPING]]\nAdd | eggs\n[[/SHOPPING]]';
    expect(parseReply(reply).map((s) => s.kind)).toEqual(['pantry', 'shopping']);
  });
});

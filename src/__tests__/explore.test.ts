import { creditFor, ExploreRecipe, ingredientLine, parseExploreRecipe, parseExploreResponse, toRecipeInput } from '../explore';

const raw = {
  id: 657933,
  title: ' Ratatouille Pasta ',
  image: 'https://img.spoonacular.com/recipes/657933-312x231.jpg',
  readyInMinutes: 45,
  servings: 4,
  sourceName: 'foodista.com',
  sourceUrl: 'https://www.foodista.com/recipe/RH3DM545/ratatouille-pasta',
  spoonacularSourceUrl: 'https://spoonacular.com/ratatouille-pasta-657933',
  diets: ['lacto ovo vegetarian'],
  dishTypes: ['side dish', 'lunch'],
  ingredients: [
    { name: 'olive oil', amount: 2, unit: 'Tbsps', original: '2 Tbsps olive oil' },
    { name: 'pasta', amount: 200, unit: 'g' },
    { name: 'eggplant', amount: 1, unit: '' },
    { name: 'salt', amount: 0, unit: '' },
    { amount: 3 },
  ],
  steps: ['Saute the onion.', '  ', 'Add garlic.'],
};

describe('parseExploreRecipe', () => {
  it('cleans up a full recipe', () => {
    const r = parseExploreRecipe(raw)!;
    expect(r.title).toBe('Ratatouille Pasta');
    expect(r.steps).toEqual(['Saute the onion.', 'Add garlic.']);
    expect(r.ingredients).toEqual([
      { name: 'olive oil', amount: 2, unit: 'Tbsps' },
      { name: 'pasta', amount: 200, unit: 'g' },
      { name: 'eggplant', amount: 1, unit: undefined },
      { name: 'salt', amount: undefined, unit: undefined },
    ]);
  });

  it('copes with a bare recipe and rejects ones without an id or title', () => {
    expect(parseExploreRecipe({ id: 2, title: 'Bare' })).toMatchObject({ diets: [], ingredients: [], steps: [] });
    expect(parseExploreRecipe({ title: 'No id' })).toBeNull();
    expect(parseExploreRecipe({ id: 3, title: '  ' })).toBeNull();
    expect(parseExploreRecipe(null)).toBeNull();
    expect(parseExploreRecipe('x')).toBeNull();
  });

  it('drops links that are not web links', () => {
    expect(parseExploreRecipe({ id: 1, title: 'x', sourceUrl: 'javascript://alert(1)' })!.sourceUrl).toBeUndefined();
  });
});

describe('parseExploreResponse', () => {
  it('keeps the usable recipes and ignores the rest', () => {
    expect(parseExploreResponse({ recipes: [raw, { nope: 1 }, null] })).toHaveLength(1);
    expect(parseExploreResponse({})).toEqual([]);
    expect(parseExploreResponse(null)).toEqual([]);
  });
});

describe('ingredientLine', () => {
  it('writes amount, unit and name, leaving out what is missing', () => {
    expect(ingredientLine({ name: 'olive oil', amount: 2, unit: 'Tbsps' })).toBe('2 Tbsps olive oil');
    expect(ingredientLine({ name: 'eggplant', amount: 1 })).toBe('1 eggplant');
    expect(ingredientLine({ name: 'salt' })).toBe('salt');
  });
});

describe('creditFor', () => {
  it('prefers the original site, then spoonacular', () => {
    expect(creditFor(parseExploreRecipe(raw)!)).toEqual({ label: 'foodista.com', url: raw.sourceUrl });
    const bare = parseExploreRecipe({ id: 1, title: 'x', spoonacularSourceUrl: raw.spoonacularSourceUrl })!;
    expect(creditFor(bare)).toEqual({ label: 'spoonacular', url: raw.spoonacularSourceUrl });
  });
});

describe('toRecipeInput', () => {
  const input = toRecipeInput(parseExploreRecipe(raw) as ExploreRecipe);

  it('maps the basics and keeps the photo and original source link', () => {
    expect(input).toMatchObject({
      name: 'Ratatouille Pasta',
      servings: 4,
      sourceUrl: raw.sourceUrl,
      photo: raw.image,
    });
  });

  it('turns ingredients into amounts and units the shopping list understands', () => {
    expect(input.ingredients).toEqual([
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'pasta', quantity: 200, unit: 'g' },
      { name: 'eggplant', quantity: 1 },
      { name: 'salt' },
    ]);
  });

  it('numbers the steps into the notes and picks a few tags', () => {
    expect(input.notes).toBe('1. Saute the onion.\n2. Add garlic.');
    expect(input.tags).toEqual(['lacto ovo vegetarian', 'side dish']);
  });

  it('defaults servings and omits notes when the recipe has none', () => {
    const bare = toRecipeInput(parseExploreRecipe({ id: 2, title: 'Bare' })!);
    expect(bare.servings).toBe(2);
    expect(bare.notes).toBeUndefined();
  });
});

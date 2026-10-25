import { formatAmount, formatIngredient, parseIngredient } from '../ingredients';

describe('parseIngredient', () => {
  it.each([
    ['200g rice', { name: 'rice', quantity: 200, unit: 'g' }],
    ['200 grams rice', { name: 'rice', quantity: 200, unit: 'g' }],
    ['1.5 cups of milk', { name: 'milk', quantity: 1.5, unit: 'cup' }],
    ['1 1/2 tbsp. olive oil', { name: 'olive oil', quantity: 1.5, unit: 'tbsp' }],
    ['1/2 tsp salt', { name: 'salt', quantity: 0.5, unit: 'tsp' }],
    ['2 eggs', { name: 'eggs', quantity: 2 }],
    ['3 large eggs', { name: 'large eggs', quantity: 3 }],
    ['rolled oats', { name: 'rolled oats' }],
    ['  salt  ', { name: 'salt' }],
  ])('%s', (line, expected) => {
    expect(parseIngredient(line)).toEqual(expected);
  });

  it('keeps a bare number as the name rather than losing the line', () => {
    expect(parseIngredient('200g')).toEqual({ name: '200g' });
    expect(parseIngredient('0 eggs')).toEqual({ name: '0 eggs' });
  });
});

describe('formatIngredient', () => {
  it('round-trips with parseIngredient', () => {
    for (const line of ['200 g rice', '2 eggs', '1.5 cups milk', '1 cup flour', 'salt']) {
      expect(formatIngredient(parseIngredient(line))).toBe(line);
    }
  });
});

describe('formatAmount', () => {
  it('rounds to two decimals', () => {
    expect(formatAmount(0.3333333, 'cup')).toBe('0.33 cups');
  });
});

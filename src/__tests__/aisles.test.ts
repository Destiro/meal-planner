import { aisleFor, matchKey, singularize } from '../aisles';

describe('singularize', () => {
  it.each([
    ['tomatoes', 'tomato'],
    ['potatoes', 'potato'],
    ['berries', 'berry'],
    ['peaches', 'peach'],
    ['eggs', 'egg'],
    ['onions', 'onion'],
    ['oats', 'oat'],
    ['tomato', 'tomato'],
    ['hummus', 'hummus'],
    ['asparagus', 'asparagus'],
    ['couscous', 'couscous'],
  ])('%s -> %s', (word, expected) => {
    expect(singularize(word)).toBe(expected);
  });
});

describe('matchKey', () => {
  it('ignores case and only changes the last word', () => {
    expect(matchKey('Red Tomatoes')).toBe('red tomato');
    expect(matchKey('Rolled Oats')).toBe('rolled oat');
    expect(matchKey('tomato')).toBe(matchKey('TOMATOES'));
  });
});

describe('aisleFor', () => {
  it.each([
    ['tomatoes', 'Produce'],
    ['chicken breast', 'Meat & fish'],
    ['milk', 'Dairy & chilled'],
    ['tortilla wraps', 'Bakery'],
    ['rolled oats', 'Pantry'],
    ['chicken stock', 'Pantry'],
    ['soy sauce', 'Pantry'],
    ['dragonfruit jelly', 'Other'],
  ])('%s -> %s', (name, aisle) => {
    expect(aisleFor(name)).toBe(aisle);
  });
});

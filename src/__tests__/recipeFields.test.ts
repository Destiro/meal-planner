import { normalizeUrl, parseTags, searchRecipes } from '../recipeFields';
import { Recipe } from '../types';

describe('parseTags', () => {
  it('trims, lower-cases, strips # and removes duplicates', () => {
    expect(parseTags('Quick, #Vegetarian ,quick,, ')).toEqual(['quick', 'vegetarian']);
    expect(parseTags('')).toEqual([]);
  });
});

describe('normalizeUrl', () => {
  it('adds https when there is no scheme', () => {
    expect(normalizeUrl('example.com/recipe')).toBe('https://example.com/recipe');
    expect(normalizeUrl('  http://example.com ')).toBe('http://example.com');
  });

  it('rejects empty, non-web and malformed links', () => {
    expect(normalizeUrl('')).toBeUndefined();
    expect(normalizeUrl('javascript://alert(1)')).toBeUndefined();
    expect(normalizeUrl('not a link')).toBeUndefined();
    expect(normalizeUrl('localhost')).toBeUndefined();
  });
});

describe('searchRecipes', () => {
  const recipes: Recipe[] = [
    { id: '1', name: 'Veggie stir fry', servings: 2, ingredients: [{ name: 'rice' }, { name: 'tofu' }], tags: ['quick', 'vegetarian'] },
    { id: '2', name: 'Chicken wrap', servings: 2, ingredients: [{ name: 'chicken breast' }, { name: 'Tomatoes' }], tags: ['quick'] },
    { id: '3', name: 'Lentil soup', servings: 4, ingredients: [{ name: 'red lentils' }] },
  ];
  const ids = (list: Recipe[]) => list.map((r) => r.id);

  it('returns everything for an empty search', () => {
    expect(ids(searchRecipes(recipes, '  '))).toEqual(['1', '2', '3']);
  });

  it('matches names, ingredients and tags, ignoring case and partial words', () => {
    expect(ids(searchRecipes(recipes, 'STIR'))).toEqual(['1']);
    expect(ids(searchRecipes(recipes, 'tomato'))).toEqual(['2']);
    expect(ids(searchRecipes(recipes, 'vegetar'))).toEqual(['1']);
  });

  it('needs every word to match', () => {
    expect(ids(searchRecipes(recipes, 'chicken tomato'))).toEqual(['2']);
    expect(ids(searchRecipes(recipes, 'chicken rice'))).toEqual([]);
  });

  it('combines with a tag filter and copes with recipes that have no tags', () => {
    expect(ids(searchRecipes(recipes, '', 'quick'))).toEqual(['1', '2']);
    expect(ids(searchRecipes(recipes, 'soup', 'quick'))).toEqual([]);
  });
});

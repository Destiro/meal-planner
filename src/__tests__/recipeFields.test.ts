import { normalizeUrl, parseTags } from '../recipeFields';

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

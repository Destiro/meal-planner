import { Ingredient } from './types';

/** Spellings people type, mapped to the unit we store. */
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  tsp: 'tsp', tsps: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tbsps: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  cup: 'cup', cups: 'cup',
  oz: 'oz', ozs: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
};

/**
 * Containers and portions, kept as units so "3 bags of flour" is 3 bags of flour, and "1 more bag of flour"
 * adds to it. Stored in the singular.
 */
const CONTAINER_UNITS = ['bag', 'pack', 'packet', 'can', 'tin', 'jar', 'bottle', 'box', 'carton', 'bunch', 'loaf', 'tub', 'clove', 'slice', 'head'];

const IRREGULAR_PLURALS: Record<string, string> = { box: 'boxes', bunch: 'bunches', loaf: 'loaves' };

/** The plural of a unit when the amount isn't one: "bag" becomes "bags", "cup" becomes "cups". */
export function pluralUnit(unit: string): string {
  if (IRREGULAR_PLURALS[unit]) return IRREGULAR_PLURALS[unit];
  return CONTAINER_UNITS.includes(unit) || unit === 'cup' ? `${unit}s` : unit;
}

for (const unit of CONTAINER_UNITS) {
  UNIT_ALIASES[unit] = unit;
  UNIT_ALIASES[pluralUnit(unit)] = unit;
}

/** True for plain counts and containers, which can be added together ("3 bags" and "1 more flour"). */
export const isCountLike = (unit: string): boolean => unit === '' || CONTAINER_UNITS.includes(unit);

/** Weights and volumes are added up in g / ml, then shown as kg / l when large. */
const BASE_UNITS: Record<string, { base: string; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
};

const round = (n: number) => Math.round(n * 100) / 100;

/** "1.5", "1,5", "1/2" and "1 1/2" to a number. */
function parseNumber(text: string): number | undefined {
  const t = text.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) return Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && t !== '' ? n : undefined;
}

// An amount after the name, set off by a space, comma, dash or bracket: "flour 2 bags", "eggs x6", "pasta, 500g".
const TRAILING_AMOUNT =
  /^(.*?\S)(?:\s+|\s*[,:(–-]\s*)(?:[x×]\s*)?(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*[x×]?\s*([a-zA-Z.]*)\s*\)?$/i;

/**
 * Reads an amount written after the name: "flour 2 bags", "flour x2", "flour (2 bags)", "pasta 500g".
 * Returns null unless it is clearly an amount: the word after the number must be a unit we know, or there must
 * be none, and the number must be sensible. So "vitamin b12" and "pasta 2 large" are left as plain names.
 */
function parseTrailingAmount(text: string): Ingredient | null {
  const m = text.match(TRAILING_AMOUNT);
  if (!m) return null;
  const name = m[1].trim();
  const quantity = parseNumber(m[2]);
  const word = m[3].toLowerCase().replace(/\.$/, '');
  const unit = word ? UNIT_ALIASES[word] : undefined;
  if (quantity === undefined || quantity <= 0 || quantity > 999 || !/[a-z]/i.test(name)) return null;
  if (word && !unit) return null;
  return { name, quantity, ...(unit ? { unit } : {}) };
}

/**
 * Reads one line such as "200g rice", "2 eggs", "1 1/2 cups of milk", "flour 2 bags" or "salt".
 * A word after the number only counts as a unit if we recognise it, so "2 eggs" stays a count of eggs.
 */
export function parseIngredient(line: string): Ingredient {
  const text = line.trim();
  // "a bag of flour" has no number but means one bag.
  const bare = text.match(/^(?:an?\s+|one\s+)?([a-z]+)\s+of\s+(.+)$/i);
  const bareUnit = bare ? UNIT_ALIASES[bare[1].toLowerCase()] : undefined;
  if (bare && bareUnit && CONTAINER_UNITS.includes(bareUnit)) return { name: bare[2].trim(), quantity: 1, unit: bareUnit };

  // The number, any space after it, the next word, and everything else.
  const m = text.match(/^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)(\s*)([^\s\d]*)\s*(.*)$/);
  const quantity = m ? parseNumber(m[1]) : undefined;
  if (!m || quantity === undefined || quantity <= 0) return parseTrailingAmount(text) ?? { name: text };

  const [, , space, word, remainder] = m;
  const unit = UNIT_ALIASES[word.toLowerCase().replace(/\.$/, '')];
  // "2x flour" and "3 × eggs": the x is a times sign, not part of the name.
  const times = /^[x×]$/i.test(word);
  // A word stuck to the number that isn't a unit is part of a name, like "7up".
  if (!unit && !times && word && !space) return { name: text };
  if (times) {
    // "2x bags of flour" is two bags of flour: let the rest say what the 2 counts.
    const inner = parseIngredient(remainder);
    if (inner.unit && inner.quantity === 1) return { name: inner.name, quantity, unit: inner.unit };
  }
  // Without a unit, the word we just read is the start of the name ("2 eggs").
  const rest = unit || times ? remainder : `${word} ${remainder}`;
  const name = rest.replace(/^of\s+/i, '').trim();
  return name ? { name, quantity, ...(unit ? { unit } : {}) } : { name: text };
}

export function formatQuantity(n: number): string {
  return String(round(n));
}

/** Amount with its unit, e.g. "200 g" or "2 cups". Empty for a plain count of one. */
export function formatAmount(quantity: number, unit: string): string {
  let q = quantity;
  let u = unit;
  const base = BASE_UNITS[unit];
  if (base && base.factor === 1 && quantity >= 1000) {
    q = quantity / 1000;
    u = unit === 'g' ? 'kg' : 'l';
  }
  if (!u) return q === 1 ? '' : `×${formatQuantity(q)}`;
  if (q !== 1) u = pluralUnit(u);
  return `${formatQuantity(q)} ${u}`;
}

/** The text form of an ingredient, the inverse of parseIngredient. */
export function formatIngredient(ing: Ingredient): string {
  if (ing.quantity === undefined) return ing.name;
  const unit = ing.unit && ing.quantity !== 1 ? pluralUnit(ing.unit) : ing.unit;
  return [formatQuantity(ing.quantity), unit, ing.name].filter(Boolean).join(' ');
}

/** Converts to the unit used for adding amounts up (kg becomes g, l becomes ml). */
export function toBaseUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  const base = BASE_UNITS[unit];
  return base ? { quantity: quantity * base.factor, unit: base.base } : { quantity, unit };
}

/** An ingredient with its amount multiplied, for example to cook for more people. One with no amount is unchanged. */
export function scaleIngredient(ing: Ingredient, factor: number): Ingredient {
  return ing.quantity === undefined ? ing : { ...ing, quantity: round(ing.quantity * factor) };
}

/** Like formatIngredient, but large weights and volumes read as kg and l: "1.5 kg rice". */
export function formatIngredientFriendly(ing: Ingredient): string {
  if (ing.quantity === undefined || !ing.unit) return formatIngredient(ing);
  return `${formatAmount(ing.quantity, ing.unit)} ${ing.name}`;
}

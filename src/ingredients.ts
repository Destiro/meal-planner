import { Ingredient } from './types';

/** Spellings people type, mapped to the unit we store. */
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  cup: 'cup', cups: 'cup',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
};

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

/**
 * Reads one line such as "200g rice", "2 eggs", "1 1/2 cups of milk" or "salt".
 * A word after the number only counts as a unit if we recognise it, so "2 eggs" stays a count of eggs.
 */
export function parseIngredient(line: string): Ingredient {
  const text = line.trim();
  const m = text.match(/^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)\s*([^\s\d]*)\s*(.*)$/);
  const quantity = m ? parseNumber(m[1]) : undefined;
  if (!m || quantity === undefined || quantity <= 0) return { name: text };

  const unit = UNIT_ALIASES[m[2].toLowerCase().replace(/\.$/, '')];
  // Without a unit, the word we just read is the start of the name ("2 eggs").
  const rest = unit ? m[3] : `${m[2]} ${m[3]}`;
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
  if (u === 'cup' && q !== 1) u = 'cups';
  return `${formatQuantity(q)} ${u}`;
}

/** The text form of an ingredient, the inverse of parseIngredient. */
export function formatIngredient(ing: Ingredient): string {
  if (ing.quantity === undefined) return ing.name;
  const unit = ing.unit === 'cup' && ing.quantity !== 1 ? 'cups' : ing.unit;
  return [formatQuantity(ing.quantity), unit, ing.name].filter(Boolean).join(' ');
}

/** Converts to the unit used for adding amounts up (kg becomes g, l becomes ml). */
export function toBaseUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  const base = BASE_UNITS[unit];
  return base ? { quantity: quantity * base.factor, unit: base.base } : { quantity, unit };
}

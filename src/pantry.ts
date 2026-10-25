import { matchKey } from './aisles';
import { formatIngredient, isCountLike, parseIngredient, toBaseUnit } from './ingredients';
import { ShoppingItem } from './shopping';
import { PantryItem } from './types';

export type PantryEntry = Omit<PantryItem, 'id'>;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Reads "500 g rice" or "6 eggs" into a pantry entry. A line with no amount ("salt") means a staple
 * you always have, so it has no quantity. Blank text gives null.
 */
export function pantryEntryFromText(text: string): PantryEntry | null {
  if (!text.trim()) return null;
  const ing = parseIngredient(text);
  if (ing.quantity === undefined) return { name: ing.name, unit: '' };
  const { quantity, unit } = toBaseUnit(ing.quantity, ing.unit ?? '');
  return { name: ing.name, quantity, unit };
}

/** The text form of an item, the inverse of pantryEntryFromText. */
export function pantryToText(item: PantryEntry): string {
  if (item.quantity === undefined) return item.name;
  return formatIngredient({ name: item.name, quantity: item.quantity, unit: item.unit || undefined });
}

/**
 * Adds to the pantry. If you already have the same thing in the same unit, the amounts are added up
 * ("tomato" and "Tomatoes" count as the same thing). Otherwise it becomes a new item.
 */
export function addToPantry(pantry: PantryItem[], entry: PantryEntry, id: string): PantryItem[] {
  const key = matchKey(entry.name);
  const sameName = pantry.filter((p) => matchKey(p.name) === key);
  // Plain counts and containers add together, so "2 more eggs" joins "6 eggs" and "1 flour" joins "2 bags of flour".
  const existing =
    sameName.find((p) => p.unit === entry.unit) ??
    sameName.find((p) => p.quantity !== undefined && isCountLike(p.unit) && isCountLike(entry.unit));
  if (existing && existing.quantity !== undefined && entry.quantity !== undefined) {
    const total = round(existing.quantity + entry.quantity);
    return pantry.map((p) => (p === existing ? { ...p, quantity: total } : p));
  }
  if (existing) return pantry; // already there (a staple, or you gave no amount)
  return [...pantry, { ...entry, id }];
}

export const sortPantry = (pantry: PantryItem[]): PantryItem[] =>
  [...pantry].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Takes what you already have off a shopping list. Staples (no amount) hide an item whatever unit it
 * is in. Otherwise the amount you have is subtracted when the unit matches, hiding the item if that
 * covers all of it. Amounts in a different unit (cups against grams) can't be compared and are ignored.
 * `covered` counts the items that disappeared.
 */
export function applyPantry(items: ShoppingItem[], pantry: PantryItem[]): { items: ShoppingItem[]; covered: number } {
  const staples = new Set(pantry.filter((p) => p.quantity === undefined).map((p) => matchKey(p.name)));
  const stock = new Map<string, number>();
  for (const p of pantry) {
    if (p.quantity === undefined) continue;
    const key = `${matchKey(p.name)}|${p.unit}`;
    stock.set(key, (stock.get(key) ?? 0) + p.quantity);
  }

  const remaining: ShoppingItem[] = [];
  let covered = 0;
  for (const item of items) {
    const name = matchKey(item.name);
    const have = stock.get(`${name}|${item.unit}`) ?? 0;
    if (staples.has(name) || have >= item.quantity - 0.005) covered++;
    else remaining.push(have > 0 ? { ...item, quantity: round(item.quantity - have) } : item);
  }
  return { items: remaining, covered };
}

/**
 * Applies pantry changes suggested by the assistant.
 *
 * - "Add" goes through addToPantry, so amounts add up.
 * - "Remove" with an amount ("200 g rice") uses that much up, and takes the item out once it is all gone.
 *   An amount in a different unit, or against something you always have (like salt), is left alone.
 * - "Remove" with no amount ("rice") takes the whole item out.
 *
 * Plurals count as the same thing. Lines that can't be read are ignored. `added`, `removed` (taken out
 * entirely) and `reduced` (lowered but still there) count what actually changed.
 */
export function applyPantryActions(
  pantry: PantryItem[],
  actions: { action: 'add' | 'remove'; text: string }[],
  makeId: () => string,
): { pantry: PantryItem[]; added: number; removed: number; reduced: number } {
  let result = pantry;
  let added = 0;
  let removed = 0;
  let reduced = 0;
  for (const { action, text } of actions) {
    const entry = pantryEntryFromText(text);
    if (!entry) continue;
    if (action === 'add') {
      result = addToPantry(result, entry, makeId());
      added++;
      continue;
    }

    const key = matchKey(entry.name);
    if (entry.quantity === undefined) {
      const kept = result.filter((p) => matchKey(p.name) !== key);
      if (kept.length !== result.length) removed++;
      result = kept;
      continue;
    }

    const have = result.find((p) => matchKey(p.name) === key && p.unit === entry.unit && p.quantity !== undefined);
    if (!have || have.quantity === undefined) continue;
    const left = round(have.quantity - entry.quantity);
    if (left <= 0.005) {
      result = result.filter((p) => p !== have);
      removed++;
    } else {
      result = result.map((p) => (p === have ? { ...p, quantity: left } : p));
      reduced++;
    }
  }
  return { pantry: result, added, removed, reduced };
}

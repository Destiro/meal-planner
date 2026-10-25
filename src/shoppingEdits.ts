import { aisleFor } from './aisles';
import { formatIngredient, parseIngredient, toBaseUnit } from './ingredients';
import { byName, itemKey, ShoppingItem } from './shopping';
import { ListEntry, ShoppingEdits, WeekList } from './types';

export const EMPTY_WEEK: WeekList = { extras: [], overrides: {}, checked: {} };

/** A line on the shopping list: either planned from recipes or added by hand, possibly edited. */
export interface ListRow extends ShoppingItem {
  /** Planned items keep the key they were generated with, even after being renamed. */
  key: string;
  kind: 'planned' | 'extra';
  /** True for a planned item whose name or amount you changed. */
  edited: boolean;
}

const weekOf = (edits: ShoppingEdits, weekKey: string): WeekList => edits[weekKey] ?? EMPTY_WEEK;
const withWeek = (edits: ShoppingEdits, weekKey: string, week: WeekList): ShoppingEdits => ({
  ...edits,
  [weekKey]: week,
});

/** Reads "2 kg rice", "bin bags" or "3 eggs" into a list entry. Blank text gives null. */
export function entryFromText(text: string): ListEntry | null {
  if (!text.trim()) return null;
  const ing = parseIngredient(text);
  const { quantity, unit } = toBaseUnit(ing.quantity ?? 1, ing.unit ?? '');
  return { name: ing.name, quantity, unit };
}

/** The text form of an entry, the inverse of entryFromText. */
export function entryToText(entry: ListEntry): string {
  if (!entry.unit && entry.quantity === 1) return entry.name;
  return formatIngredient({ name: entry.name, quantity: entry.quantity, unit: entry.unit || undefined });
}

/** The planned shopping list with this week's hand edits applied, sorted by name. */
export function applyEdits(planned: ShoppingItem[], week: WeekList = EMPTY_WEEK): ListRow[] {
  const rows: ListRow[] = [];
  for (const item of planned) {
    const key = itemKey(item);
    const override = week.overrides[key];
    if (override === null) continue; // removed
    if (override) rows.push({ ...override, aisle: aisleFor(override.name), key, kind: 'planned', edited: true });
    else rows.push({ ...item, key, kind: 'planned', edited: false });
  }
  for (const extra of week.extras) {
    rows.push({
      name: extra.name,
      quantity: extra.quantity,
      unit: extra.unit,
      aisle: aisleFor(extra.name),
      key: `extra:${extra.id}`,
      kind: 'extra',
      edited: false,
    });
  }
  return rows.sort(byName);
}

/** How many planned items you have removed from this week's list. */
export const removedCount = (planned: ShoppingItem[], week: WeekList = EMPTY_WEEK): number =>
  planned.filter((item) => week.overrides[itemKey(item)] === null).length;

export function addExtra(edits: ShoppingEdits, weekKey: string, entry: ListEntry, id: string): ShoppingEdits {
  const week = weekOf(edits, weekKey);
  return withWeek(edits, weekKey, { ...week, extras: [...week.extras, { ...entry, id }] });
}

/** Changes a row's name and amount. For a planned item this is remembered as an override. */
export function editRow(
  edits: ShoppingEdits,
  weekKey: string,
  row: Pick<ListRow, 'key' | 'kind'>,
  entry: ListEntry,
): ShoppingEdits {
  const week = weekOf(edits, weekKey);
  if (row.kind === 'extra') {
    const id = row.key.slice('extra:'.length);
    return withWeek(edits, weekKey, { ...week, extras: week.extras.map((e) => (e.id === id ? { ...entry, id } : e)) });
  }
  return withWeek(edits, weekKey, { ...week, overrides: { ...week.overrides, [row.key]: entry } });
}

/** Removes a row: hand-added items are deleted, planned items are hidden (and can be restored). */
export function removeRow(edits: ShoppingEdits, weekKey: string, row: Pick<ListRow, 'key' | 'kind'>): ShoppingEdits {
  const week = weekOf(edits, weekKey);
  const { [row.key]: _ticked, ...checked } = week.checked;
  if (row.kind === 'extra') {
    const id = row.key.slice('extra:'.length);
    return withWeek(edits, weekKey, { ...week, extras: week.extras.filter((e) => e.id !== id), checked });
  }
  return withWeek(edits, weekKey, { ...week, overrides: { ...week.overrides, [row.key]: null }, checked });
}

/** Puts a planned item back to what the recipes say. */
export function resetRow(edits: ShoppingEdits, weekKey: string, key: string): ShoppingEdits {
  const week = weekOf(edits, weekKey);
  const { [key]: _gone, ...overrides } = week.overrides;
  return withWeek(edits, weekKey, { ...week, overrides });
}

/** Brings back every planned item you removed from this week's list. */
export function restoreRemoved(edits: ShoppingEdits, weekKey: string): ShoppingEdits {
  const week = weekOf(edits, weekKey);
  const overrides = Object.fromEntries(Object.entries(week.overrides).filter(([, value]) => value !== null));
  return withWeek(edits, weekKey, { ...week, overrides });
}

export function setChecked(edits: ShoppingEdits, weekKey: string, key: string, checked: boolean): ShoppingEdits {
  const week = weekOf(edits, weekKey);
  const { [key]: _old, ...rest } = week.checked;
  return withWeek(edits, weekKey, { ...week, checked: checked ? { ...rest, [key]: true } : rest });
}

/** Drops edits for weeks that start before `keepFromWeekKey` (YYYY-MM-DD), so saved data doesn't grow forever. */
export function pruneWeeks(edits: ShoppingEdits, keepFromWeekKey: string): ShoppingEdits {
  return Object.fromEntries(Object.entries(edits).filter(([weekKey]) => weekKey >= keepFromWeekKey));
}

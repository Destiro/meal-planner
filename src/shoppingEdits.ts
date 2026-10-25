import { aisleFor, matchKey } from './aisles';
import { formatIngredient, isCountLike, parseIngredient, toBaseUnit } from './ingredients';
import { byName, itemKey, ShoppingItem } from './shopping';
import { ListEntry, ShoppingEdits, WeekList } from './types';

const round = (n: number) => Math.round(n * 100) / 100;

export const EMPTY_WEEK: WeekList = { extras: [], overrides: {}, checked: {} };

/** A line on the shopping list: either planned from recipes or added by hand, possibly edited. */
export interface ListRow extends ShoppingItem {
  /** Planned items keep the key they were generated with, even after being renamed. */
  key: string;
  kind: 'planned' | 'extra';
  /** True for a planned item whose name or amount you changed. */
  edited: boolean;
}

/** A week's hand-added lines, shaped like list rows. */
const extraRows = (week: WeekList): ListRow[] =>
  week.extras.map((e) => ({
    name: e.name,
    quantity: e.quantity,
    unit: e.unit,
    aisle: aisleFor(e.name),
    key: `extra:${e.id}`,
    kind: 'extra',
    edited: false,
  }));

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

/**
 * Applies shopping list changes suggested by the assistant to one week's list.
 *
 * - "Add" puts the item on as a hand-added line. If the item is already on the list (from your recipes or added
 *   by hand) the amount is added to that line instead, so "1 more bag of flour" makes 3 bags into 4.
 * - "Remove" with an amount ("2 bin bags") takes off just that much, and takes the line off once nothing is
 *   left. Hand-added lines are reduced before planned ones. An amount in a different unit is left alone,
 *   since the two can't be compared.
 * - "Remove" with no amount ("bin bags") takes every line with that name off the list.
 *
 * Plurals count as the same item. Lines that can't be read are ignored. `added`, `removed` (taken off
 * entirely) and `reduced` (lowered but still on the list) count what actually changed. `added` counts new lines
 * and `increased` counts existing lines that went up.
 */
export function applyShoppingActions(
  edits: ShoppingEdits,
  weekKey: string,
  rows: ListRow[],
  actions: { action: 'add' | 'remove' | 'clear'; text: string }[],
  makeId: () => string,
): { edits: ShoppingEdits; added: number; increased: number; removed: number; reduced: number } {
  let result = edits;
  let added = 0;
  let increased = 0;
  let removed = 0;
  let reduced = 0;
  // The planned lines as they are right now, since earlier actions in the same reply may have changed them.
  const planned = rows.filter((row) => row.kind === 'planned').map((row) => ({ ...row }));
  const gone = new Set<string>();

  for (const { action, text } of actions) {
    if (action === 'clear') {
      // Everything on the list now: lines from recipes, hand-added lines, and anything added earlier in this reply.
      const live = [...extraRows(weekOf(result, weekKey)), ...planned.filter((row) => !gone.has(row.key))];
      for (const row of live) {
        result = removeRow(result, weekKey, row);
        gone.add(row.key);
      }
      removed += live.length;
      continue;
    }

    const entry = entryFromText(text);
    if (!entry) continue;
    const key = matchKey(entry.name);

    const extras = extraRows(weekOf(result, weekKey));
    const matches = [...extras, ...planned.filter((row) => !gone.has(row.key))].filter((row) => matchKey(row.name) === key);

    if (action === 'add') {
      // More of something already on the list goes onto that line. Plain counts and containers add together,
      // so "1 more flour" joins "3 bags of flour".
      const target =
        matches.find((row) => row.unit === entry.unit) ??
        matches.find((row) => isCountLike(row.unit) && isCountLike(entry.unit));
      if (target) {
        const quantity = round(target.quantity + entry.quantity);
        result = editRow(result, weekKey, target, { name: target.name, quantity, unit: target.unit });
        const live = planned.find((p) => p.key === target.key);
        if (live) live.quantity = quantity;
        increased++;
      } else {
        result = addExtra(result, weekKey, entry, makeId());
        added++;
      }
      continue;
    }


    if (parseIngredient(text).quantity === undefined) {
      for (const row of matches) {
        result = removeRow(result, weekKey, row);
        gone.add(row.key);
      }
      if (matches.length) removed++;
      continue;
    }

    let left = entry.quantity;
    let touched = false;
    let partial = false;
    for (const row of matches.filter((r) => r.unit === entry.unit)) {
      if (left <= 0.005) break;
      touched = true;
      if (row.quantity <= left + 0.005) {
        result = removeRow(result, weekKey, row);
        gone.add(row.key);
        left = round(left - row.quantity);
      } else {
        const quantity = round(row.quantity - left);
        result = editRow(result, weekKey, row, { name: row.name, quantity, unit: row.unit });
        const live = planned.find((p) => p.key === row.key);
        if (live) live.quantity = quantity;
        left = 0;
        partial = true;
      }
    }
    if (touched && partial) reduced++;
    else if (touched) removed++;
  }
  return { edits: result, added, increased, removed, reduced };
}

/**
 * Empties a week's shopping list: hand-added lines are deleted and lines from your recipes are hidden (they
 * can be brought back with "Restore removed items"). Ticks on those lines are cleared too.
 */
export function clearWeek(edits: ShoppingEdits, weekKey: string, rows: ListRow[]): ShoppingEdits {
  return rows.reduce((acc, row) => removeRow(acc, weekKey, row), edits);
}

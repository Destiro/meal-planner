import { MealSlot } from './types';

export const DEFAULT_SLOTS: MealSlot[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
];

export const SNACK_LABEL = 'Snack';

const newId = (label: string) =>
  `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 6)}`;

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Adds a slot at the end. A blank or already-used name is ignored. */
export function addSlot(slots: MealSlot[], label: string, makeId: (label: string) => string = newId): MealSlot[] {
  const clean = label.trim();
  if (!clean || slots.some((s) => sameLabel(s.label, clean))) return slots;
  return [...slots, { id: makeId(clean), label: clean }];
}

/** Renames a slot. A blank name, or one another slot already has, is ignored. */
export function renameSlot(slots: MealSlot[], id: string, label: string): MealSlot[] {
  const clean = label.trim();
  if (!clean || slots.some((s) => s.id !== id && sameLabel(s.label, clean))) return slots;
  return slots.map((s) => (s.id === id ? { ...s, label: clean } : s));
}

/** Removes a slot, but never the last one. */
export function removeSlot(slots: MealSlot[], id: string): MealSlot[] {
  return slots.length > 1 ? slots.filter((s) => s.id !== id) : slots;
}

export function moveSlot(slots: MealSlot[], id: string, direction: -1 | 1): MealSlot[] {
  const from = slots.findIndex((s) => s.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= slots.length) return slots;
  const next = [...slots];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** True if `value` looks like a list of slots we can use. */
export function isValidSlots(value: unknown): value is MealSlot[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((s) => typeof s?.id === 'string' && typeof s?.label === 'string' && s.label.trim() !== '')
  );
}

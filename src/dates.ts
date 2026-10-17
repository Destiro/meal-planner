export const toKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (d: Date, n: number): Date => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

/** Monday of the week containing `d`. */
export const startOfWeek = (d: Date): Date => {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
};

export const weekDays = (start: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => addDays(start, i));

export const formatDay = (d: Date): string =>
  d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

export const formatRange = (start: Date): string => {
  const end = addDays(start, 6);
  const opts = { day: 'numeric', month: 'short' } as const;
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
};

export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

export const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const formatMonth = (d: Date): string =>
  d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** All days to draw for a month grid: whole weeks, Monday first. */
export const monthGrid = (month: Date): Date[] => {
  const first = startOfMonth(month);
  const gridStart = startOfWeek(first);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weeks = Math.ceil(((last.getTime() - gridStart.getTime()) / 86400000 + 1) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
};

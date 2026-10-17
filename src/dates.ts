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

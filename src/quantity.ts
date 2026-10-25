import { formatAmount, formatQuantity } from './ingredients';

const round = (n: number) => Math.round(n * 100) / 100;

/** The smallest change the + and − buttons make for a unit. Counts go by one, grams and millilitres by fifty. */
function smallestStep(unit: string): number {
  if (unit === 'g' || unit === 'ml') return 50;
  if (unit === 'cup' || unit === 'lb') return 0.5;
  return 1;
}

/** How much one tap of + or − changes a quantity. Big amounts move in bigger steps, so 1 kg isn't twenty taps. */
export function quantityStep(unit: string, quantity: number): number {
  if (unit === 'g' || unit === 'ml') return quantity >= 1000 ? 250 : quantity >= 300 ? 100 : 50;
  return smallestStep(unit);
}

/**
 * The quantity after tapping + (direction 1) or − (direction -1). It never goes below the smallest step for
 * the unit, so − can't reach zero; removing an item is a separate action.
 */
export function nextQuantity(quantity: number, unit: string, direction: 1 | -1): number {
  const min = smallestStep(unit);
  const step = quantityStep(unit, direction === 1 ? quantity : quantity - 1e-9);
  return Math.max(min, round(quantity + direction * step));
}

/** True if tapping − would change the quantity. */
export const canDecrease = (quantity: number, unit: string): boolean => nextQuantity(quantity, unit, -1) < quantity;

/** What to show between the + and − buttons: "3", "700 g", "1.5 kg", "2 cups". */
export function formatQuantityLabel(quantity: number, unit: string): string {
  return unit ? formatAmount(quantity, unit) : formatQuantity(quantity);
}

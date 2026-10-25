/** Words that look plural but aren't. */
const NOT_PLURAL = new Set(['hummus', 'couscous', 'asparagus', 'molasses', 'watercress', 'swiss', 'lemongrass']);

/** Rough singular form of one word, so "tomatoes" and "tomato" are treated as the same thing. */
export function singularize(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3 || NOT_PLURAL.has(w)) return w;
  if (w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (/(oes|ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
  if (/(ss|us|is)$/.test(w) || !w.endsWith('s')) return w;
  return w.slice(0, -1);
}

/** "bags of", "a can of" and the like at the start of a name. They describe the container, not the food. */
const CONTAINER_PREFIX =
  /^(?:(?:an?|one)\s+)?(?:bags?|packs?|packets?|cans?|tins?|jars?|bottles?|boxe?s?|cartons?|bunch(?:es)?|loaf|loaves|tubs?|cloves?|slices?|heads?)\s+of\s+/;

/**
 * Lower-cased name with its last word made singular: "Red Tomatoes" becomes "red tomato". A container at the
 * start is ignored, so "bags of flour" and "flour" are the same thing.
 */
export function matchKey(name: string): string {
  const words = name.toLowerCase().trim().replace(CONTAINER_PREFIX, '').split(/\s+/);
  words[words.length - 1] = singularize(words[words.length - 1]);
  return words.join(' ');
}

/** Aisles in the order you'd walk a typical supermarket. */
export const AISLES = ['Produce', 'Meat & fish', 'Dairy & chilled', 'Bakery', 'Pantry', 'Other'] as const;
export type Aisle = (typeof AISLES)[number];

// Checked top to bottom, so "chicken stock" lands in Pantry (stock) rather than Meat (chicken).
const KEYWORDS: [Aisle, string[]][] = [
  ['Pantry', [
    'rice', 'pasta', 'noodle', 'oat', 'flour', 'sugar', 'salt', 'oil', 'sauce', 'soy', 'chia', 'seed', 'lentil',
    'chickpea', 'stock', 'spice', 'cumin', 'paprika', 'honey', 'vinegar', 'paste', 'powder', 'cereal', 'nut',
    'quinoa', 'couscous', 'syrup', 'mustard', 'ketchup',
  ]],
  ['Meat & fish', [
    'chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'ham', 'steak', 'fish', 'salmon', 'tuna',
    'prawn', 'shrimp', 'turkey',
  ]],
  ['Dairy & chilled', [
    'milk', 'cheese', 'egg', 'butter', 'yoghurt', 'yogurt', 'cream', 'parmesan', 'feta', 'mozzarella', 'tofu',
    'hummus',
  ]],
  ['Bakery', ['bread', 'tortilla', 'wrap', 'bun', 'pita', 'naan', 'bagel', 'croissant']],
  ['Produce', [
    'tomato', 'lettuce', 'broccoli', 'capsicum', 'pepper', 'onion', 'garlic', 'carrot', 'potato', 'spinach',
    'cucumber', 'mushroom', 'zucchini', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'blueberry', 'berry',
    'strawberry', 'basil', 'parsley', 'coriander', 'cilantro', 'ginger', 'celery', 'cabbage', 'pumpkin', 'corn',
    'kale', 'salad', 'fruit', 'vegetable', 'mint', 'chilli', 'leek', 'cauliflower', 'eggplant', 'orange', 'herb',
  ]],
];

/** Best-guess aisle for an ingredient name. Anything unrecognised goes under Other. */
export function aisleFor(name: string): Aisle {
  const words = name.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const forms = new Set([...words, ...words.map(singularize)]);
  for (const [aisle, keywords] of KEYWORDS) {
    if (keywords.some((k) => forms.has(k))) return aisle;
  }
  return 'Other';
}

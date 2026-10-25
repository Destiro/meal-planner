/**
 * The pure parts of the chat route: checking what the app sends and building the instructions for the
 * model. No Cloudflare types are used here so the app's test suite can import and test this file.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  /** Things the person has at home, e.g. "500 g rice" or "salt". */
  pantry: string[];
  /** Names of the person's saved recipes. */
  recipes: string[];
  /** Names of the meals planned each day, e.g. "Breakfast". */
  slots: string[];
  household: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context: ChatContext;
}

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_LIST_ITEMS = 80;
const MAX_ITEM_LENGTH = 80;
const MAX_SLOTS = 8;

const cleanList = (value: unknown, max: number): string[] =>
  (Array.isArray(value) ? value : [])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .slice(0, max)
    .map((v) => v.trim().slice(0, MAX_ITEM_LENGTH));

/** Checks the request body. Returns the cleaned request, or a message explaining what is wrong. */
export function parseChatRequest(body: unknown): ChatRequest | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Send a JSON body.' };
  const { messages, context } = body as { messages?: unknown; context?: unknown };

  if (!Array.isArray(messages) || messages.length === 0) return { error: 'Send at least one message.' };
  const recent = messages.slice(-MAX_MESSAGES);
  const cleaned: ChatMessage[] = [];
  for (const m of recent) {
    const role = (m as { role?: unknown } | null)?.role;
    const content = (m as { content?: unknown } | null)?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || content.trim() === '') {
      return { error: 'Each message needs a role of user or assistant, and some text.' };
    }
    cleaned.push({ role, content: content.trim().slice(0, MAX_MESSAGE_LENGTH) });
  }
  if (cleaned[cleaned.length - 1].role !== 'user') return { error: 'The last message must be from the user.' };

  const ctx = (typeof context === 'object' && context !== null ? context : {}) as Record<string, unknown>;
  const household = typeof ctx.household === 'number' && ctx.household >= 1 ? Math.min(Math.round(ctx.household), 20) : 2;
  return {
    messages: cleaned,
    context: {
      pantry: cleanList(ctx.pantry, MAX_LIST_ITEMS),
      recipes: cleanList(ctx.recipes, MAX_LIST_ITEMS),
      slots: cleanList(ctx.slots, MAX_SLOTS),
      household,
    },
  };
}

/** Longest voice clip accepted, as base64 text. About a minute of speech is far below this. */
const MAX_AUDIO_BASE64 = 2_500_000;

/** Checks a voice clip sent for transcription. Returns the base64 audio, or a message explaining what is wrong. */
export function parseTranscribeRequest(body: unknown): { audio: string } | { error: string } {
  const audio = (body as { audio?: unknown } | null)?.audio;
  if (typeof audio !== 'string' || audio.length < 100 || !/^[A-Za-z0-9+/=\s]+$/.test(audio)) {
    return { error: 'Send the recording as base64 audio.' };
  }
  if (audio.length > MAX_AUDIO_BASE64) return { error: 'That recording is too long. Keep it under a minute.' };
  return { audio: audio.replace(/\s/g, '') };
}

const list = (items: string[], empty: string) => (items.length ? items.map((i) => `- ${i}`).join('\n') : empty);

/** The instructions the model gets before the conversation. The app's reply parser relies on the formats below. */
export function buildSystemPrompt(context: ChatContext): string {
  const slots = context.slots.length ? context.slots.join(', ') : 'Breakfast, Lunch, Dinner';
  return `You are a friendly cooking assistant inside a meal planning app. Keep replies short and practical. Use plain text only: no markdown, no asterisks, no headings.

You can help with cooking questions, suggest recipes, say what can be made from the pantry, and suggest meal plans.

When you suggest a recipe, write it in EXACTLY this format, and say nothing else inside the block:
[[RECIPE]]
Title: Lentil soup
Serves: 4
Ingredients:
- 200 g red lentils
- 1 onion
- 2 tbsp olive oil
Method:
1. Chop the onion and soften it in the oil.
2. Add the lentils and water and simmer for 25 minutes.
[[/RECIPE]]
Put each ingredient on its own line with the amount first (grams, ml, tsp, tbsp, cups or a plain count). Suggest at most 3 recipes in one reply, with a sentence or two of normal text before or after.

When the person asks you to plan meals, suggest a plan in EXACTLY this format, one meal per line as Day | Meal | Recipe name:
[[PLAN]]
Monday | Dinner | Veggie stir fry
Tuesday | Lunch | Chicken salad wrap
[[/PLAN]]
When the person asks you to add things to their pantry, or says they have bought or used something up, list the changes in EXACTLY this format, one per line as Add | amount and item, or Remove | item:
[[PANTRY]]
Add | 500 g rice
Add | 6 eggs
Remove | milk
[[/PANTRY]]
The app then shows a button for the person to confirm. You cannot change the pantry, the saved recipes or the meal plan yourself, so NEVER say you have added, saved or changed anything. Say you have suggested it and they can tap the button.

In a plan, use ONLY recipe names from the saved recipes list below, spelled exactly as listed, and only these meals: ${slots}. If there are not enough saved recipes, say so and offer new recipes in the recipe format instead.

The person cooks for ${context.household} ${context.household === 1 ? 'person' : 'people'}.

Saved recipes:
${list(context.recipes, '(none yet)')}

Pantry (what they already have at home):
${list(context.pantry, '(empty)')}

If asked about something unrelated to food, cooking or meal planning, politely say you can only help with that.`;
}

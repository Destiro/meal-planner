import { ExploreRecipe, parseExploreResponse } from './explore';

/** The Cloudflare Worker in worker/. The address isn't secret; the API keys live only on Cloudflare. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://meal-planner-api.connordebruyn234.workers.dev';

const TIMEOUT_MS = 20000;
// The assistant can take a while to write a recipe.
const CHAT_TIMEOUT_MS = 60000;

/** An error whose message is fine to show to the person using the app. */
export class ApiError extends Error {}

/** Calls the Worker and returns its JSON reply, turning every kind of failure into an ApiError. */
async function callApi(path: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(new URL(path, API_URL).toString(), { ...init, signal: controller.signal });
  } catch (e) {
    const timedOut = controller.signal.aborted;
    throw new ApiError(
      timedOut ? 'That took too long. Try again.' : "Can't reach the service. Check your connection.",
      { cause: e },
    );
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Handled below: an unreadable reply is treated like any other failure.
  }

  if (!response.ok) {
    const message = (body as { error?: unknown } | null)?.error;
    throw new ApiError(typeof message === 'string' ? message : 'The service is unavailable right now.');
  }
  return body;
}

async function getRecipes(path: string, params: Record<string, string | number>): Promise<ExploreRecipe[]> {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return parseExploreResponse(await callApi(`${url.pathname}${url.search}`, {}, TIMEOUT_MS));
}

/** Recipes matching `query`, each with its ingredients and steps. */
export const searchOnline = (query: string, number = 10) => getRecipes('/recipes/search', { q: query.trim(), number });

/** A few random recipes for inspiration. */
export const randomOnline = (number = 6) => getRecipes('/recipes/random', { number });

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** What the assistant is told about you, so it can suggest things from your own pantry and recipes. */
export interface ChatContext {
  pantry: string[];
  recipes: string[];
  slots: string[];
  household: number;
}

/** Sends the conversation to the assistant and returns its reply text. */
export async function chatOnline(messages: ChatTurn[], context: ChatContext): Promise<string> {
  const body = await callApi(
    '/chat',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages, context }) },
    CHAT_TIMEOUT_MS,
  );
  const reply = (body as { reply?: unknown } | null)?.reply;
  if (typeof reply !== 'string' || !reply.trim()) throw new ApiError('The assistant had nothing to say. Try again.');
  return reply;
}

/** Turns a voice recording (base64 audio) into text. */
export async function transcribeOnline(audioBase64: string): Promise<string> {
  const body = await callApi(
    '/transcribe',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audio: audioBase64 }) },
    CHAT_TIMEOUT_MS,
  );
  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== 'string' || !text.trim()) throw new ApiError('I could not hear anything. Try again.');
  return text.trim();
}

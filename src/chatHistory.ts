import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Kept apart from the main app data so a long chat never makes saving recipes and plans slower.
const CHAT_KEY = 'mealplanner:chat';

/** How many messages are kept on the phone. Older ones are dropped. */
export const MAX_STORED_MESSAGES = 40;

/** Keeps only the messages that look right, and only the most recent ones. */
export function sanitizeHistory(raw: unknown): StoredMessage[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.flatMap((m): StoredMessage[] => {
    const { id, role, content } = (m ?? {}) as Record<string, unknown>;
    const goodRole = role === 'user' || role === 'assistant';
    return typeof id === 'string' && goodRole && typeof content === 'string' && content.trim() !== ''
      ? [{ id, role, content }]
      : [];
  });
  return valid.slice(-MAX_STORED_MESSAGES);
}

export async function loadChat(): Promise<StoredMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_KEY);
    return raw ? sanitizeHistory(JSON.parse(raw)) : [];
  } catch (e) {
    console.warn('Could not load chat', e);
    return [];
  }
}

export async function saveChat(messages: StoredMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  } catch (e) {
    console.warn('Could not save chat', e);
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadChat, MAX_STORED_MESSAGES, sanitizeHistory, saveChat } from '../chatHistory';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(() => AsyncStorage.clear());

const msg = (id: string, role: string, content: string) => ({ id, role, content });

describe('sanitizeHistory', () => {
  it('keeps well-formed messages in order', () => {
    const history = [msg('1', 'user', 'hi'), msg('2', 'assistant', 'hello')];
    expect(sanitizeHistory(history)).toEqual(history);
  });

  it('drops anything malformed rather than failing', () => {
    expect(
      sanitizeHistory([msg('1', 'system', 'x'), msg('2', 'user', '  '), { id: 3 }, null, 'x', msg('4', 'user', 'ok')]),
    ).toEqual([msg('4', 'user', 'ok')]);
    expect(sanitizeHistory(null)).toEqual([]);
    expect(sanitizeHistory({})).toEqual([]);
  });

  it('keeps only the most recent messages', () => {
    const many = Array.from({ length: MAX_STORED_MESSAGES + 10 }, (_, i) => msg(String(i), 'user', `m${i}`));
    const result = sanitizeHistory(many);
    expect(result).toHaveLength(MAX_STORED_MESSAGES);
    expect(result[0].id).toBe('10');
  });
});

describe('loadChat / saveChat', () => {
  it('round-trips a conversation', async () => {
    const history = [msg('1', 'user', 'hi') as never, msg('2', 'assistant', 'hello') as never];
    await saveChat(history);
    expect(await loadChat()).toEqual(history);
  });

  it('starts empty when nothing is saved or the saved data is unreadable', async () => {
    expect(await loadChat()).toEqual([]);
    await AsyncStorage.setItem('mealplanner:chat', '{not json');
    expect(await loadChat()).toEqual([]);
  });
});

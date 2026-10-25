import { ApiError, chatOnline, randomOnline, searchOnline, transcribeOnline } from '../api';

const reply = (status: number, body: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('searchOnline', () => {
  it('asks the worker for the trimmed query and returns the recipes', async () => {
    fetchMock.mockReturnValue(reply(200, { recipes: [{ id: 1, title: 'Pasta' }] }));
    const recipes = await searchOnline('  pasta ', 5);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/recipes/search');
    expect(url.searchParams.get('q')).toBe('pasta');
    expect(url.searchParams.get('number')).toBe('5');
    expect(recipes.map((r) => r.title)).toEqual(['Pasta']);
  });

  it('shows the message the worker sends when something is wrong', async () => {
    fetchMock.mockReturnValue(reply(429, { error: 'The daily recipe limit has been reached. Try again tomorrow.' }));
    await expect(searchOnline('pasta')).rejects.toThrow('The daily recipe limit has been reached. Try again tomorrow.');
  });

  it('falls back to a general message when the reply is unreadable', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('x')) }));
    await expect(searchOnline('pasta')).rejects.toThrow('unavailable');
  });

  it('explains when the phone is offline', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const error = await searchOnline('pasta').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toContain('Check your connection');
  });
});

describe('randomOnline', () => {
  it('asks for random recipes', async () => {
    fetchMock.mockReturnValue(reply(200, { recipes: [] }));
    expect(await randomOnline(3)).toEqual([]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/recipes/random');
    expect(url.searchParams.get('number')).toBe('3');
  });
});

describe('chatOnline', () => {
  const context = { pantry: ['rice'], recipes: ['Soup'], slots: ['Dinner'], household: 2 };

  it('posts the conversation and context and returns the reply', async () => {
    fetchMock.mockReturnValue(reply(200, { reply: 'Try a stir fry.' }));
    const messages = [{ role: 'user' as const, content: 'what can I cook?' }];
    expect(await chatOnline(messages, context)).toBe('Try a stir fry.');

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe('/chat');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ messages, context });
  });

  it('shows the daily limit message from the worker', async () => {
    fetchMock.mockReturnValue(reply(429, { error: 'The assistant has reached its daily limit. Try again tomorrow.' }));
    await expect(chatOnline([{ role: 'user', content: 'hi' }], context)).rejects.toThrow('daily limit');
  });

  it('rejects an empty or malformed reply', async () => {
    fetchMock.mockReturnValue(reply(200, { reply: '  ' }));
    await expect(chatOnline([{ role: 'user', content: 'hi' }], context)).rejects.toThrow('nothing to say');
    fetchMock.mockReturnValue(reply(200, {}));
    await expect(chatOnline([{ role: 'user', content: 'hi' }], context)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('transcribeOnline', () => {
  it('posts the audio and returns the trimmed text', async () => {
    fetchMock.mockReturnValue(reply(200, { text: '  add 500 grams of rice  ' }));
    expect(await transcribeOnline('QUJD')).toBe('add 500 grams of rice');
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe('/transcribe');
    expect(JSON.parse(init.body)).toEqual({ audio: 'QUJD' });
  });

  it('shows the worker message when it could not hear anything', async () => {
    fetchMock.mockReturnValue(reply(422, { error: 'I could not hear anything. Try again a bit closer to the microphone.' }));
    await expect(transcribeOnline('QUJD')).rejects.toThrow('closer to the microphone');
  });
});

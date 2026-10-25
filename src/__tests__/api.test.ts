import { ApiError, randomOnline, searchOnline } from '../api';

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

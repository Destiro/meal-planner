import { bytesToBase64, formatDuration } from '../audio';

const bytes = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));

describe('bytesToBase64', () => {
  it('matches the standard test vectors, including padding', () => {
    expect(bytesToBase64(bytes(''))).toBe('');
    expect(bytesToBase64(bytes('f'))).toBe('Zg==');
    expect(bytesToBase64(bytes('fo'))).toBe('Zm8=');
    expect(bytesToBase64(bytes('foo'))).toBe('Zm9v');
    expect(bytesToBase64(bytes('foob'))).toBe('Zm9vYg==');
    expect(bytesToBase64(bytes('fooba'))).toBe('Zm9vYmE=');
    expect(bytesToBase64(bytes('foobar'))).toBe('Zm9vYmFy');
  });

  it('handles every byte value, agreeing with the built-in encoder', () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(bytesToBase64(all)).toBe(btoa(String.fromCharCode(...all)));
  });
});

describe('formatDuration', () => {
  it('shows minutes and zero-padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7400)).toBe('0:07');
    expect(formatDuration(60000)).toBe('1:00');
    expect(formatDuration(-5)).toBe('0:00');
  });
});

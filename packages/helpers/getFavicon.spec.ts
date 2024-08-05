import { describe, expect, test } from 'vitest';

import getFavicon from './getFavicon';

describe('getFavicon', () => {
  test('should return the correct favicon URL for a given URL', () => {
    const url = 'https://hey.xyz';
    const expectedFaviconUrl =
      'https://external-content.duckduckgo.com/ip3/hey.xyz.ico';
    const result = getFavicon(url);

    expect(result).toBe(expectedFaviconUrl);
  });

  test('should handle URLs with "http://" prefix correctly', () => {
    const url = 'http://hey.xyz';
    const expectedFaviconUrl =
      'https://external-content.duckduckgo.com/ip3/hey.xyz.ico';
    const result = getFavicon(url);

    expect(result).toBe(expectedFaviconUrl);
  });

  test('should handle URLs with "https://" prefix correctly', () => {
    const url = 'https://hey.xyz';
    const expectedFaviconUrl =
      'https://external-content.duckduckgo.com/ip3/hey.xyz.ico';
    const result = getFavicon(url);

    expect(result).toBe(expectedFaviconUrl);
  });

  test('should handle URLs with path correctly', () => {
    const url = 'https://hey.xyz/u/yoginth';
    const expectedFaviconUrl =
      'https://external-content.duckduckgo.com/ip3/hey.xyz.ico';
    const result = getFavicon(url);

    expect(result).toBe(expectedFaviconUrl);
  });
});

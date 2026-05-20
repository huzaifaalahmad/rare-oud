const { sanitizeSlug, fallbackProductSlug } = require('../utils/slug');

describe('product slug utilities', () => {
  test('normalizes Latin text into a URL-safe product slug', () => {
    expect(sanitizeSlug('  Aleppo Premium Oud!!  ')).toBe('aleppo-premium-oud');
  });

  test('transliterates Arabic names instead of returning an empty slug', () => {
    expect(sanitizeSlug('عود حلبي فاخر')).toBe('awd-hlby-fakhr');
  });

  test('creates a fallback slug from available product names', () => {
    expect(fallbackProductSlug('', 'عود دمشقي')).toBe('awd-dmshqy');
  });
});

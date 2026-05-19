const {
  cleanText,
  normalizeCountryCode,
  normalizePhone,
  isValidPhone,
  isSupportedCountryCode,
  namePattern
} = require('../utils/inputValidation');

describe('input validation utilities', () => {
  test('normalizes unsafe text while preserving allowed new lines', () => {
    expect(cleanText('  Oud\u0000   Syria  ', { max: 20 })).toBe('Oud Syria');
    expect(cleanText('Line 1\nLine 2\u0007', { allowNewLines: true })).toBe('Line 1\nLine 2');
    expect(cleanText('abcdef', { max: 3 })).toBe('abc');
  });

  test('normalizes supported country codes with safe fallback', () => {
    expect(normalizeCountryCode(' ae ')).toBe('AE');
    expect(normalizeCountryCode('xx', 'SY')).toBe('SY');
    expect(isSupportedCountryCode('QA')).toBe(true);
    expect(isSupportedCountryCode('ZZ')).toBe(false);
  });

  test('normalizes regional phone numbers and rejects invalid lengths', () => {
    expect(normalizePhone('00963 981 653 408', 'SY')).toBe('+963981653408');
    expect(normalizePhone('+971 50 123 4567', 'AE')).toBe('+971501234567');
    expect(isValidPhone('12', 'QA')).toBe(false);
    expect(() => normalizePhone('12', 'QA')).toThrow('Invalid phone number');
  });

  test('accepts Arabic and Latin names while rejecting control-only input', () => {
    expect(namePattern.test('Obay Hassan')).toBe(true);
    expect(namePattern.test('غسان حسن')).toBe(true);
    expect(namePattern.test('x')).toBe(false);
  });
});

const PHONE_COUNTRIES = [
  { code: 'SY', dialCode: '+963', min: 8, max: 9 },
  { code: 'AE', dialCode: '+971', min: 8, max: 9 },
  { code: 'SA', dialCode: '+966', min: 8, max: 9 },
  { code: 'QA', dialCode: '+974', min: 8, max: 8 },
  { code: 'KW', dialCode: '+965', min: 8, max: 8 },
  { code: 'BH', dialCode: '+973', min: 8, max: 8 },
  { code: 'OM', dialCode: '+968', min: 8, max: 8 },
  { code: 'JO', dialCode: '+962', min: 8, max: 9 },
  { code: 'LB', dialCode: '+961', min: 7, max: 8 },
  { code: 'TR', dialCode: '+90', min: 10, max: 10 },
  { code: 'IQ', dialCode: '+964', min: 10, max: 10 },
  { code: 'EG', dialCode: '+20', min: 10, max: 10 },
  { code: 'US', dialCode: '+1', min: 10, max: 10 },
  { code: 'GB', dialCode: '+44', min: 10, max: 10 },
  { code: 'DE', dialCode: '+49', min: 6, max: 13 },
  { code: 'FR', dialCode: '+33', min: 9, max: 9 }
];

const COUNTRY_CODES = new Set(PHONE_COUNTRIES.map(c => c.code));

function cleanText(value, { max = 500, allowNewLines = false } = {}) {
  if (value === undefined || value === null) return '';
  const source = String(value).normalize('NFKC');
  const withoutControls = allowNewLines
    ? source.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : source.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return withoutControls.replace(/[ \t]{2,}/g, ' ').trim().slice(0, max);
}

function normalizeCountryCode(value, fallback = 'SY') {
  const code = cleanText(value || fallback, { max: 2 }).toUpperCase();
  return COUNTRY_CODES.has(code) ? code : fallback;
}

function normalizePhone(phone, countryCode = 'SY') {
  const country = PHONE_COUNTRIES.find(c => c.code === normalizeCountryCode(countryCode));
  const raw = cleanText(phone, { max: 40 });
  if (!raw) return '';
  let digits = raw.replace(/[^0-9+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  if (digits.startsWith(country.dialCode)) digits = digits.slice(country.dialCode.length);
  digits = digits.replace(/\D/g, '').replace(/^0+/, '');
  const min = Math.min(country.min, 6);
  const max = Math.max(country.max, 15);
  if (digits.length < min || digits.length > max) {
    throw new Error(`Invalid phone number for ${country.code}`);
  }
  return `${country.dialCode}${digits}`;
}

function isValidPhone(phone, countryCode = 'SY') {
  try { return Boolean(normalizePhone(phone, countryCode)); } catch { return false; }
}

const namePattern = /^[\p{L}\p{M} .'-]{2,140}$/u;

function isSupportedCountryCode(value) {
  return COUNTRY_CODES.has(cleanText(value, { max: 2 }).toUpperCase());
}

module.exports = {
  PHONE_COUNTRIES,
  cleanText,
  normalizeCountryCode,
  normalizePhone,
  isValidPhone,
  isSupportedCountryCode,
  namePattern
};

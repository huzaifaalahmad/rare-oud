export const PHONE_COUNTRIES = [
  { code: 'SY', dialCode: '+963', ar: 'سوريا', en: 'Syria', min: 8, max: 9 },
  { code: 'AE', dialCode: '+971', ar: 'الإمارات', en: 'UAE', min: 8, max: 9 },
  { code: 'SA', dialCode: '+966', ar: 'السعودية', en: 'Saudi Arabia', min: 8, max: 9 },
  { code: 'QA', dialCode: '+974', ar: 'قطر', en: 'Qatar', min: 8, max: 8 },
  { code: 'KW', dialCode: '+965', ar: 'الكويت', en: 'Kuwait', min: 8, max: 8 },
  { code: 'BH', dialCode: '+973', ar: 'البحرين', en: 'Bahrain', min: 8, max: 8 },
  { code: 'OM', dialCode: '+968', ar: 'عُمان', en: 'Oman', min: 8, max: 8 },
  { code: 'JO', dialCode: '+962', ar: 'الأردن', en: 'Jordan', min: 8, max: 9 },
  { code: 'LB', dialCode: '+961', ar: 'لبنان', en: 'Lebanon', min: 7, max: 8 },
  { code: 'TR', dialCode: '+90', ar: 'تركيا', en: 'Turkey', min: 10, max: 10 },
  { code: 'IQ', dialCode: '+964', ar: 'العراق', en: 'Iraq', min: 10, max: 10 },
  { code: 'EG', dialCode: '+20', ar: 'مصر', en: 'Egypt', min: 10, max: 10 },
  { code: 'US', dialCode: '+1', ar: 'الولايات المتحدة', en: 'United States', min: 10, max: 10 },
  { code: 'GB', dialCode: '+44', ar: 'المملكة المتحدة', en: 'United Kingdom', min: 10, max: 10 },
  { code: 'DE', dialCode: '+49', ar: 'ألمانيا', en: 'Germany', min: 6, max: 13 },
  { code: 'FR', dialCode: '+33', ar: 'فرنسا', en: 'France', min: 9, max: 9 }
];

export function getPhoneCountry(code = 'SY') {
  return PHONE_COUNTRIES.find(c => c.code === code) || PHONE_COUNTRIES[0];
}

export function normalizePhone(phone, countryCode = 'SY') {
  const country = getPhoneCountry(countryCode);
  let digits = String(phone || '').trim().replace(/[^0-9+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  if (digits.startsWith(country.dialCode)) digits = digits.slice(country.dialCode.length);
  digits = digits.replace(/\D/g, '').replace(/^0+/, '');
  const min = Math.min(country.min, 6);
  const max = Math.max(country.max, 15);
  if (digits.length < min || digits.length > max) return '';
  return `${country.dialCode}${digits}`;
}

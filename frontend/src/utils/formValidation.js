import { normalizePhone } from './phoneCountries.js';

export function cleanText(value, max = 500) {
  return String(value || '').normalize('NFKC').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

export function validatePassword(value) {
  const password = String(value || '');
  return password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function validateRequired(value, min = 1, max = 500) {
  const text = cleanText(value, max);
  return text.length >= min && text.length <= max;
}

export function validatePhone(value, countryCode) {
  return Boolean(normalizePhone(value, countryCode));
}

export function message(lang, ar, en) {
  return lang === 'ar' ? ar : en;
}

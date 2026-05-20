const ARABIC_TO_LATIN = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'th', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z',
  ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
  ي: 'y', ى: 'a', ة: 'h', ء: '', ئ: 'y', ؤ: 'w', ﻻ: 'la', لا: 'la'
};

function transliterateArabic(value) {
  return String(value || '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .split('')
    .map(char => ARABIC_TO_LATIN[char] ?? char)
    .join('');
}

function sanitizeSlug(value = '', maxLength = 150) {
  return transliterateArabic(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .replace(/^-|-$/g, '');
}

function fallbackProductSlug(...sources) {
  return sources.map(source => sanitizeSlug(source)).find(Boolean) || `product-${Date.now().toString(36)}`;
}

module.exports = { sanitizeSlug, fallbackProductSlug };

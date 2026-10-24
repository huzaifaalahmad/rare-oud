export function normalizeCatalog(payload) {
  const products = Array.isArray(payload) ? payload : payload?.products;
  if (!Array.isArray(products)) throw new Error('Invalid catalogue response');
  return { products, total: Math.max(products.length, Number(payload?.total) || 0) };
}
export function summarizeText(value, limit = 150) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(' ') > limit / 2 ? cut.lastIndexOf(' ') : limit).trim()}…`;
}
export function categoryTitle(slug, lang) {
  const labels = { educational: ['تعليمي', 'Educational'], intermediate: ['متوسط', 'Intermediate'], medium: ['متوسط', 'Intermediate'], rare: ['نادر', 'Rare'], vip: ['VIP', 'VIP'], accessories: ['أكسسوارات', 'Accessories'] };
  return labels[slug]?.[lang === 'ar' ? 0 : 1] || (lang === 'ar' ? 'الأعواد' : 'Ouds');
}
export const isLocalReview = import.meta.env.VITE_LOCAL_REVIEW === 'true';

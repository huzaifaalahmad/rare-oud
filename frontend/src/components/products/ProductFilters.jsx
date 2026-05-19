import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';

const baseAccessoryOptions = [
  { value: 'picks', ar: 'ريش', en: 'Picks' },
  { value: 'cases', ar: 'حقائب', en: 'Cases' },
  { value: 'keys', ar: 'مفاتيح', en: 'Keys' },
  { value: 'strings', ar: 'أوتار', en: 'Strings' },
  { value: 'care', ar: 'عناية', en: 'Care' }
];

function normalizeText(value = '') {
  return String(value).trim().replace(/\s+/g, ' ');
}

function knownAccessoryType(product) {
  const haystack = [
    product.name_ar,
    product.name_en,
    product.description_ar,
    product.description_en,
    product.included_accessories_ar,
    product.included_accessories_en,
    product.historical_geographic_classification_ar,
    product.historical_geographic_classification_en
  ].filter(Boolean).join(' ').toLowerCase();

  if (/ريش|ريشة|risha|pick|picks|plectrum/.test(haystack)) return 'picks';
  if (/حقيبة|حقائب|case|cases|bag|bags/.test(haystack)) return 'cases';
  if (/مفتاح|مفاتيح|key|keys/.test(haystack)) return 'keys';
  if (/وتر|أوتار|string|strings/.test(haystack)) return 'strings';
  if (/عناية|تلميع|تنظيف|care|polish|clean/.test(haystack)) return 'care';
  return '';
}

function buildAccessoryOptions(products, lang) {
  const options = [...baseAccessoryOptions];
  const seen = new Set(options.map(option => option.value));

  for (const product of products || []) {
    const known = knownAccessoryType(product);
    if (known) continue;

    const label = normalizeText(
      product[`historical_geographic_classification_${lang}`] ||
      product[`included_accessories_${lang}`] ||
      product[`name_${lang}`]
    ).slice(0, 48);

    if (!label || label.length < 2) continue;
    const value = label.toLowerCase();
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value: label, ar: label, en: label });
  }

  return options;
}

export default function ProductFilters({ filters, setFilters, categorySlug, products = [] }) {
  const { tr, lang } = useLanguage();
  const [draft, setDraft] = useState(filters || {});
  const debouncedDraft = useDebouncedValue(draft, 500);
  const isAccessories = categorySlug === 'accessories';
  const accessoryOptions = buildAccessoryOptions(products, lang);

  useEffect(() => setFilters(debouncedDraft), [debouncedDraft, setFilters]);
  useEffect(() => setDraft(filters || {}), []); // initial hydration only to avoid fighting local typing

  function set(k, v) { setDraft(current => ({ ...current, [k]: v })); }
  function reset() { setDraft({}); setFilters({}); }

  return <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
    <div className="filter-grid">
      <input aria-label="search" placeholder={isAccessories ? tr('accessorySearchPlaceholder') : tr('searchPlaceholder')} value={draft.search || ''} onChange={e => set('search', e.target.value)} />
      <select value={draft.condition || ''} onChange={e => set('condition', e.target.value)}><option value="">{tr('condition')}</option><option value="new">{tr('new')}</option><option value="used">{tr('used')}</option></select>
      <select value={draft.availability || ''} onChange={e => set('availability', e.target.value)}><option value="">{tr('availability')}</option><option value="in_stock">{tr('inStock')}</option><option value="out_of_stock">{tr('outOfStock')}</option></select>
      {isAccessories ? (
        <select value={draft.accessory || ''} onChange={e => set('accessory', e.target.value)}>
          <option value="">{tr('accessoryType')}</option>
          {accessoryOptions.map(option => (
            <option value={option.value} key={option.value}>{option[lang] || option.en}</option>
          ))}
        </select>
      ) : (
        <input placeholder={tr('wood')} value={draft.wood || ''} onChange={e => set('wood', e.target.value)} />
      )}
      <input placeholder={tr('country')} value={draft.country || ''} onChange={e => set('country', e.target.value)} />
      <button className="btn ghost" type="button" onClick={reset}>{tr('reset')}</button>
    </div>
  </div>;
}

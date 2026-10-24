import { describe, expect, it } from 'vitest';
import { normalizeCatalog, summarizeText, categoryTitle } from './catalog.js';

describe('catalogue loading', () => {
  it('keeps total separate from the current page count', () => {
    expect(normalizeCatalog({ products: [{id:1}], total:55 })).toEqual({products:[{id:1}],total:55});
  });
  it('distinguishes an invalid or failed response from a real empty collection', () => {
    expect(()=>normalizeCatalog('<html>offline</html>')).toThrow();
    expect(()=>normalizeCatalog({message:'Unavailable'})).toThrow();
    expect(normalizeCatalog({products:[],total:0})).toEqual({products:[],total:0});
  });
  it('supports legacy arrays and translated intermediate categories', () => {
    expect(normalizeCatalog([{id:1}]).total).toBe(1);
    expect(categoryTitle('intermediate','ar')).toBe('متوسط');
    expect(categoryTitle('medium','en')).toBe('Intermediate');
  });
});
describe('policy excerpts', () => {
  it('keeps the source text intact and clips only the displayed excerpt at a word', () => {
    const policy='سياسة الإرجاع '.repeat(60);
    const excerpt=summarizeText(policy);
    expect(excerpt.length).toBeLessThanOrEqual(151);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(policy.length).toBeGreaterThan(500);
    expect(summarizeText('Short policy')).toBe('Short policy');
  });
});

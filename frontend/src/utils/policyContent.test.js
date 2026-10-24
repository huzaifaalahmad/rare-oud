import { describe,it,expect } from 'vitest';
import { policyContent } from './policyContent.js';
describe('complete owner policy content',()=>{
 const full='1. Original condition.\n2. Original warranty.';
 const payload={blocks:[{block_key:'return-policy.body',content_ar:'Short placeholder'}],homeBlocks:[{block_key:'home.policy.returns.body',content_ar:full,content_en:'Summary'}]};
 it('uses the complete existing policy rather than the short page placeholder',()=>{
  expect(policyContent('return-policy',payload,'ar').body).toBe(full);
 });
 it('keeps the original full terms available alongside the English summary',()=>{
  expect(policyContent('return-policy',payload,'en')).toEqual({body:'Summary',originalArabic:full});
 });
 it('does not substitute a different policy or include hero JSON',()=>{
  expect(policyContent('shipping',{...payload,blocks:[{block_type:'hero',content_ar:'{}'},{content_ar:'Shipping text'}]},'ar').body).toBe('Shipping text');
 });
});

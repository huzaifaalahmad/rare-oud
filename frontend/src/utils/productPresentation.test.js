import {describe,it,expect} from 'vitest';
import {displayDimensions} from './productPresentation.js';
describe('missing product dimensions',()=>{
 it('does not display empty measurements as zero-sized instruments',()=>{
  expect(displayDimensions('Length 0 cm / Width 0 cm / Height 0 cm / Weight 0 kg','en')).toBe('Not specified');
  expect(displayDimensions(null,'ar')).toBe('غير مذكورة');
 });
 it('preserves actual measurements and free text',()=>{
  expect(displayDimensions('Length 85 cm / Width 0 cm','en')).toBe('Length 85 cm / Width 0 cm');
  expect(displayDimensions('Full size','en')).toBe('Full size');
 });
});
